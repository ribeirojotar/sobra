import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/login/actions'
import { simular } from '@/lib/simulador'
import type { Debt } from '@/lib/types'
import { HeroTrio } from './_components/HeroTrio'
import { HeroDisponivel } from './_components/HeroDisponivel'
import { DiscriminacaoMes } from './_components/DiscriminacaoMes'
import { AlertasPendentes } from './_components/AlertasPendentes'
import { MissaoQuitacao } from './_components/MissaoQuitacao'
import { MedidorSaude } from './_components/MedidorSaude'
import { AlertasFaixa } from './_components/AlertasFaixa'
import type { AlertaCartao } from './_components/AlertasFaixa'
import { ResumoMes } from './_components/ResumoMes'
import { FaturasCard } from './_components/FaturasCard'
import type { ProximoVencimento } from './_components/FaturasCard'
import { ParaOndeCard } from './_components/ParaOndeCard'
import type { CatRow } from './_components/ParaOndeCard'
import { MonthPicker } from '../_components/MonthPicker'

export const metadata: Metadata = { title: 'Painel — Sobra' }

// Janela Desenrola Brasil (relançado 04/05/2026, 90 dias)
const DESENROLA_FIM = new Date('2026-08-02')

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function isoMonthStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function startOfMonthIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function subMonths(d: Date, n: number): Date {
  const r = new Date(d)
  r.setMonth(r.getMonth() - n)
  return r
}

function calcProximoVencimento(diaVenc: number, hoje: Date): { data: Date; dias: number } {
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  let data = new Date(ano, mes, diaVenc)
  if (data <= hoje) {
    data = new Date(ano, mes + 1, diaVenc)
  }
  const dias = Math.max(0, Math.ceil((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)))
  return { data, dias }
}

type TxRow = {
  valor: number
  tipo: string
  data: string
  status: string
  data_vencimento: string | null
  category_id: string | null
  debt_id: string | null
  forma_pgto: string | null
  categories: { nome: string; emoji: string | null } | null
}

type PendenteTxRow = {
  valor: number
  tipo: string
  data_vencimento: string | null
  forma_pgto: string | null
}

type CardPurchaseRow = {
  category_id: string | null
  valor_total: number
  categories: { nome: string; emoji: string | null } | null
}

type InstallRow = {
  card_id: string
  valor: number
  competencia: string
}

type CardRow = {
  id: string
  nome: string
  dia_vencimento: number | null
  cor: string | null
}

function parseMes(raw: string | string[] | undefined): string {
  const val = Array.isArray(raw) ? raw[0] : raw
  if (val && /^\d{4}-\d{2}$/.test(val)) return val
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string | string[] }>
}) {
  const supabase = await createClient()

  const now = new Date()
  const { mes: mesParam } = await searchParams
  const mes = parseMes(mesParam)
  const [sy, sm] = mes.split('-').map(Number)
  const selectedDate = new Date(sy, sm - 1, 1)

  const mesAtual = isoMonthStr(selectedDate)
  const mesAnterior = isoMonthStr(subMonths(selectedDate, 1))
  const mesAtualFirstStr = startOfMonthIso(selectedDate)
  const nextMonthFirstStr = startOfMonthIso(new Date(sy, sm, 1))
  const inicio4Meses = startOfMonthIso(subMonths(selectedDate, 3))
  const inicio6Meses = startOfMonthIso(subMonths(selectedDate, 6))

  const todayIso = now.toISOString().slice(0, 10)
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const sevenDaysIso = sevenDaysLater.toISOString().slice(0, 10)

  const [
    { data: envelopes },
    { data: debts },
    { data: pagamentosDebts },
    { data: rawTransacoes },
    { data: rawPendentes },
    { data: rawInstallments },
    { data: rawCards },
    { data: rawCardPurchases },
  ] = await Promise.all([
    supabase.from('envelopes').select('*').eq('ativo', true).order('ordem'),
    supabase.from('debts').select('*, titulares(nome)').eq('quitada', false).order('ordem'),
    supabase
      .from('transactions')
      .select('valor, data')
      .eq('tipo', 'despesa')
      .eq('status', 'efetivada')
      .not('debt_id', 'is', null),
    supabase
      .from('transactions')
      .select('valor, tipo, data, status, data_vencimento, category_id, debt_id, forma_pgto, categories(nome, emoji)')
      .eq('status', 'efetivada')
      .gte('data', inicio4Meses),
    supabase
      .from('transactions')
      .select('valor, tipo, data_vencimento, forma_pgto')
      .eq('status', 'pendente')
      .gte('data_vencimento', mesAtualFirstStr)
      .lt('data_vencimento', nextMonthFirstStr),
    supabase
      .from('card_installments')
      .select('card_id, valor, competencia')
      .eq('status', 'em_aberto'),
    supabase.from('cards').select('id, nome, dia_vencimento, cor').eq('ativo', true),
    supabase
      .from('card_purchases')
      .select('category_id, valor_total, categories(nome, emoji)')
      .gte('data_compra', mesAtualFirstStr)
      .lt('data_compra', nextMonthFirstStr),
  ])

  // --- Caixinhas ---
  const envs = envelopes ?? []
  const livre = envs.find((e) => e.tipo === 'livre')
  const saldoLivre = Number(livre?.saldo ?? 0)

  // Saldo atual: todas as caixinhas ativas exceto negócio
  const saldoAtual = envs
    .filter((e) => e.tipo !== 'negocio')
    .reduce((s, e) => s + Number(e.saldo), 0)

  // --- Dívidas ---
  const dvds = (debts ?? []) as Debt[]
  const dividaTotal = dvds.reduce((s, d) => s + Number(d.valor_atual), 0)
  const pags = pagamentosDebts ?? []
  const pagoAcumulado = pags.reduce((s, t) => s + Number(t.valor), 0)
  const pctQuitacao =
    pagoAcumulado + dividaTotal > 0 ? pagoAcumulado / (pagoAcumulado + dividaTotal) : 0

  // Aporte estimado: média dos últimos 6 meses; fallback = soma das parcelas_min
  const pagsRecentes = pags.filter((t) => t.data >= inicio6Meses)
  let aporteEstimado = 0
  if (pagsRecentes.length > 0) {
    const byMonth: Record<string, number> = {}
    for (const t of pagsRecentes) {
      const m = t.data.slice(0, 7)
      byMonth[m] = (byMonth[m] ?? 0) + Number(t.valor)
    }
    const totals = Object.values(byMonth)
    aporteEstimado = totals.reduce((s, v) => s + v, 0) / totals.length
  } else {
    aporteEstimado = dvds.reduce((s, d) => s + Number(d.parcela_min), 0)
  }

  const simResultado =
    aporteEstimado > 0 && dividaTotal > 0
      ? simular(dvds, aporteEstimado, 'avalanche')
      : null

  // --- Transações efetivadas do período ---
  const txAll = (rawTransacoes ?? []) as unknown as TxRow[]

  // --- Herói trio: Inicial / Atual / Previsto ---
  const receitasEfetivadas = txAll
    .filter((t) => t.tipo === 'receita' && t.data.startsWith(mesAtual))
    .reduce((s, t) => s + Number(t.valor), 0)
  const despesasEfetivadas = txAll
    .filter((t) => t.tipo === 'despesa' && t.data.startsWith(mesAtual))
    .reduce((s, t) => s + Number(t.valor), 0)
  const saldoInicial = saldoAtual - (receitasEfetivadas - despesasEfetivadas)

  const pendentes = (rawPendentes ?? []) as PendenteTxRow[]
  const receitasPendentes = pendentes
    .filter((t) => t.tipo === 'receita' && t.forma_pgto !== 'Fatura')
    .reduce((s, t) => s + Number(t.valor), 0)
  const despesasPendentes = pendentes
    .filter((t) => t.tipo === 'despesa' && t.forma_pgto !== 'Fatura')
    .reduce((s, t) => s + Number(t.valor), 0)
  const saldoPrevisto = saldoAtual + receitasPendentes - despesasPendentes

  // --- 4 baldes de discriminação (despesas, sem fatura de cartão) ---
  const despPendentes = pendentes.filter(
    (t) => t.tipo === 'despesa' && t.forma_pgto !== 'Fatura' && t.data_vencimento,
  )
  const baldeEfetivadas = txAll
    .filter(
      (t) =>
        t.tipo === 'despesa' &&
        t.data.startsWith(mesAtual) &&
        t.forma_pgto !== 'Fatura',
    )
    .reduce((s, t) => s + Number(t.valor), 0)
  const baldeProximo = despPendentes
    .filter((t) => t.data_vencimento! >= todayIso && t.data_vencimento! <= sevenDaysIso)
    .reduce((s, t) => s + Number(t.valor), 0)
  const baldeVencidas = despPendentes
    .filter((t) => t.data_vencimento! < todayIso)
    .reduce((s, t) => s + Number(t.valor), 0)
  const baldeDistantes = despPendentes
    .filter((t) => t.data_vencimento! > sevenDaysIso)
    .reduce((s, t) => s + Number(t.valor), 0)

  // Sanity check — imprime no terminal do Next.js
  console.log(
    `[painel sanity] mes=${mesAtual} | inicial=${saldoInicial.toFixed(2)} atual=${saldoAtual.toFixed(2)} previsto=${saldoPrevisto.toFixed(2)} | baldes: efetivadas=${baldeEfetivadas.toFixed(2)} proximo=${baldeProximo.toFixed(2)} vencidas=${baldeVencidas.toFixed(2)} distantes=${baldeDistantes.toFixed(2)}`,
  )

  // --- Gastos variáveis (para alerta gastoAcimaMedia, só efetivadas sem debt_id) ---
  const gastosVar = txAll.filter((t) => t.tipo === 'despesa' && t.debt_id == null)
  const gastoMesAtual = gastosVar
    .filter((t) => t.data.startsWith(mesAtual))
    .reduce((s, t) => s + Number(t.valor), 0)

  const gastosPorMesPrev: Record<string, number> = {}
  for (const t of gastosVar) {
    const m = t.data.slice(0, 7)
    if (m < mesAtual) gastosPorMesPrev[m] = (gastosPorMesPrev[m] ?? 0) + Number(t.valor)
  }
  const numMesesPrev = Object.keys(gastosPorMesPrev).length
  const mediaGastosPrev =
    numMesesPrev > 0
      ? Object.values(gastosPorMesPrev).reduce((s, v) => s + v, 0) / numMesesPrev
      : 0
  const gastoAcimaMedia = mediaGastosPrev > 0 && gastoMesAtual > mediaGastosPrev * 1.15

  // --- Resumo do mês (só efetivadas, já filtrado via rawTransacoes) ---
  const receitasMesAtual = txAll
    .filter((t) => t.tipo === 'receita' && t.data.startsWith(mesAtual))
    .reduce((s, t) => s + Number(t.valor), 0)
  const despesasMesAtual = txAll
    .filter((t) => t.tipo === 'despesa' && t.data.startsWith(mesAtual))
    .reduce((s, t) => s + Number(t.valor), 0)
  const receitasMesAnterior = txAll
    .filter((t) => t.tipo === 'receita' && t.data.startsWith(mesAnterior))
    .reduce((s, t) => s + Number(t.valor), 0)
  const despesasMesAnterior = txAll
    .filter((t) => t.tipo === 'despesa' && t.data.startsWith(mesAnterior))
    .reduce((s, t) => s + Number(t.valor), 0)

  // --- Top 5 categorias do mês ---
  const catMap: Record<string, CatRow & { key: string }> = {}
  for (const t of txAll.filter(
    (t) => t.tipo === 'despesa' && t.data.startsWith(mesAtual) && t.forma_pgto !== 'Fatura',
  )) {
    const key = t.category_id ?? '__sem_categoria'
    if (!catMap[key]) {
      catMap[key] = { key, nome: t.categories?.nome ?? 'Sem categoria', emoji: t.categories?.emoji ?? null, total: 0 }
    }
    catMap[key].total += Number(t.valor)
  }
  const cardPurchases = (rawCardPurchases ?? []) as unknown as CardPurchaseRow[]
  for (const p of cardPurchases) {
    const key = p.category_id ?? '__sem_categoria'
    if (!catMap[key]) {
      catMap[key] = { key, nome: p.categories?.nome ?? 'Sem categoria', emoji: p.categories?.emoji ?? null, total: 0 }
    }
    catMap[key].total += Number(p.valor_total)
  }
  const topCategorias: CatRow[] = Object.values(catMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map(({ nome, emoji, total }) => ({ nome, emoji, total }))

  // --- Faturas de cartão ---
  const installs = (rawInstallments ?? []) as unknown as InstallRow[]
  const cards = (rawCards ?? []) as unknown as CardRow[]

  const faturasComprometidas = installs
    .filter((i) => i.competencia <= nextMonthFirstStr)
    .reduce((s, i) => s + Number(i.valor), 0)

  const faturaAbertaPorCartao: Record<string, number> = {}
  for (const inst of installs) {
    if (inst.competencia <= mesAtualFirstStr) {
      faturaAbertaPorCartao[inst.card_id] =
        (faturaAbertaPorCartao[inst.card_id] ?? 0) + Number(inst.valor)
    }
  }
  const totalFaturaAberta = Object.values(faturaAbertaPorCartao).reduce((s, v) => s + v, 0)

  const disponivel = saldoLivre - faturasComprometidas
  const faturaSemCaixa = faturasComprometidas > saldoLivre

  // Próximo vencimento e alertas de cartão
  const alertasCartao: AlertaCartao[] = []
  let proximoVencimento: ProximoVencimento | null = null

  for (const card of cards) {
    const faturaAberta = faturaAbertaPorCartao[card.id] ?? 0
    if (faturaAberta <= 0 || card.dia_vencimento == null) continue

    const venc = calcProximoVencimento(card.dia_vencimento, now)

    if (venc.dias <= 7) {
      alertasCartao.push({ nomeCartao: card.nome, diasParaVencer: venc.dias })
    }

    if (!proximoVencimento || venc.dias < proximoVencimento.diasParaVencer) {
      proximoVencimento = {
        nomeCartao: card.nome,
        dataStr: venc.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        cor: card.cor,
        diasParaVencer: venc.dias,
      }
    }
  }
  alertasCartao.sort((a, b) => a.diasParaVencer - b.diasParaVencer)

  // --- Alertas ---
  const desenrolaAtiva = now < DESENROLA_FIM
  const diasRestantesDesenrola = Math.max(
    0,
    Math.ceil((DESENROLA_FIM.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  )
  const dividasElegiveis = dvds.filter((d) => d.elegivel_desenrola).length
  const dividasAcumulando = dvds.filter((d) => d.status === 'acumulando').length

  // --- Saúde financeira (0–100) ---
  let healthScore: number
  if (dvds.length === 0 && pagoAcumulado === 0) {
    healthScore = 50
  } else if (dvds.length === 0) {
    healthScore = 100
  } else {
    const pctPts = Math.round(pctQuitacao * 60)
    const livrePts = disponivel >= 0 ? 20 : 0
    const acumPts = dividasAcumulando === 0 ? 20 : Math.max(0, 20 - dividasAcumulando * 7)
    healthScore = Math.min(100, pctPts + livrePts + acumPts)
  }

  const nomeMesAtual = MESES[selectedDate.getMonth()]
  const nomeMesAnterior = MESES[subMonths(selectedDate, 1).getMonth()]

  return (
    <main className="flex flex-col gap-5 px-4 pb-6 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Painel</h1>
        <form
          action={async () => {
            'use server'
            await signOut()
            redirect('/login')
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100"
          >
            Sair
          </button>
        </form>
      </div>

      {/* Seletor de mês */}
      <MonthPicker mes={mes} />

      {/* Herói trio: Inicial / Atual / Previsto */}
      <HeroTrio
        inicial={saldoInicial}
        atual={saldoAtual}
        previsto={saldoPrevisto}
        receitasPendentes={receitasPendentes}
        despesasPendentes={despesasPendentes}
      />

      {/* Disponível pra gastar */}
      <HeroDisponivel saldoLivre={saldoLivre} faturasComprometidas={faturasComprometidas} />

      {/* Discriminação do mês */}
      <DiscriminacaoMes
        mes={mes}
        efetivadas={baldeEfetivadas}
        proximoVencimento={baldeProximo}
        vencidas={baldeVencidas}
        distantes={baldeDistantes}
      />

      {/* Alertas de pendências */}
      <AlertasPendentes
        vencidas={baldeVencidas}
        proximosSete={baldeProximo}
        saldoAtual={saldoAtual}
      />

      {/* Alertas gerais */}
      <AlertasFaixa
        desenrolaAtiva={desenrolaAtiva}
        dividasElegiveis={dividasElegiveis}
        diasRestantesDesenrola={diasRestantesDesenrola}
        gastoAcimaMedia={gastoAcimaMedia}
        gastoMesAtual={gastoMesAtual}
        mediaGastosPrev={mediaGastosPrev}
        dividasAcumulando={dividasAcumulando}
        alertasCartao={alertasCartao}
        faturaSemCaixa={faturaSemCaixa}
        faturasComprometidas={faturasComprometidas}
        saldoLivre={saldoLivre}
      />

      {/* Resumo do mês */}
      <ResumoMes
        nomeMes={nomeMesAtual}
        receitas={receitasMesAtual}
        despesas={despesasMesAtual}
        receitasAnterior={receitasMesAnterior}
        despesasAnterior={despesasMesAnterior}
        nomeMesAnterior={nomeMesAnterior}
      />

      {/* Faturas */}
      <FaturasCard
        totalEmAberto={totalFaturaAberta}
        proximoVencimento={proximoVencimento}
      />

      {/* Pra onde foi o dinheiro */}
      <ParaOndeCard categorias={topCategorias} nomeMes={nomeMesAtual} />

      {/* Missão */}
      <MissaoQuitacao
        dividaTotal={dividaTotal}
        pagoAcumulado={pagoAcumulado}
        pctQuitacao={pctQuitacao}
        simResultado={simResultado}
        aporteEstimado={aporteEstimado}
      />

      {/* Saúde financeira */}
      <MedidorSaude
        score={healthScore}
        temDividas={dvds.length > 0}
        dividasAcumulando={dividasAcumulando}
      />
    </main>
  )
}
