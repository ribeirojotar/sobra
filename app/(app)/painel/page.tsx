import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/login/actions'
import { simular } from '@/lib/simulador'
import type { Debt } from '@/lib/types'
import { HeroDisponivel } from './_components/HeroDisponivel'
import { MissaoQuitacao } from './_components/MissaoQuitacao'
import { MedidorSaude } from './_components/MedidorSaude'
import { AlertasFaixa } from './_components/AlertasFaixa'

export const metadata: Metadata = { title: 'Painel — Sobra' }

// Janela Desenrola Brasil (relançado 04/05/2026, 90 dias)
const DESENROLA_FIM = new Date('2026-08-02')

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

export default async function PainelPage() {
  const supabase = await createClient()

  const now = new Date()
  const mesAtual = isoMonthStr(now)
  const inicio4Meses = startOfMonthIso(subMonths(now, 3))
  const inicio6Meses = startOfMonthIso(subMonths(now, 6))

  const [
    { data: envelopes },
    { data: debts },
    { data: pagamentosDebts },
    { data: gastosVar },
  ] = await Promise.all([
    supabase.from('envelopes').select('*').eq('ativo', true).order('ordem'),
    supabase.from('debts').select('*, titulares(nome)').eq('quitada', false).order('ordem'),
    supabase
      .from('transactions')
      .select('valor, data')
      .eq('tipo', 'despesa')
      .not('debt_id', 'is', null),
    supabase
      .from('transactions')
      .select('valor, data')
      .eq('tipo', 'despesa')
      .is('debt_id', null)
      .gte('data', inicio4Meses),
  ])

  // --- Caixinhas ---
  const envs = envelopes ?? []
  const livre = envs.find((e) => e.tipo === 'livre')
  const envDividas = envs.find((e) => e.tipo === 'dividas')
  const reserva = envs.find((e) => e.tipo === 'reserva')
  const fixas = envs.find((e) => e.tipo === 'fixas')
  const saldoTotal = envs
    .filter((e) => e.tipo !== 'negocio')
    .reduce((s, e) => s + Number(e.saldo), 0)
  const disponivel = Number(livre?.saldo ?? 0)

  // --- Dívidas ---
  const dvds = (debts ?? []) as Debt[]
  const dividaTotal = dvds.reduce((s, d) => s + Number(d.valor_atual), 0)
  const pags = pagamentosDebts ?? []
  const pagoAcumulado = pags.reduce((s, t) => s + Number(t.valor), 0)
  const pctQuitacao =
    pagoAcumulado + dividaTotal > 0 ? pagoAcumulado / (pagoAcumulado + dividaTotal) : 0

  // Aporte estimado: média mensal dos últimos 6 meses; fallback = soma das parcelas_min
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

  // --- Gastos variáveis (últimos 4 meses) ---
  const gvs = gastosVar ?? []
  const gastoMesAtual = gvs
    .filter((t) => t.data.startsWith(mesAtual))
    .reduce((s, t) => s + Number(t.valor), 0)

  const gastosPorMesPrev: Record<string, number> = {}
  for (const t of gvs) {
    const m = t.data.slice(0, 7)
    if (m < mesAtual) {
      gastosPorMesPrev[m] = (gastosPorMesPrev[m] ?? 0) + Number(t.valor)
    }
  }
  const numMesesPrev = Object.keys(gastosPorMesPrev).length
  const mediaGastosPrev =
    numMesesPrev > 0
      ? Object.values(gastosPorMesPrev).reduce((s, v) => s + v, 0) / numMesesPrev
      : 0
  const gastoAcimaMedia = mediaGastosPrev > 0 && gastoMesAtual > mediaGastosPrev * 1.15

  // --- Alertas ---
  const desenrolaAtiva = now < DESENROLA_FIM
  const diasRestantesDesenrola = Math.max(
    0,
    Math.ceil((DESENROLA_FIM.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  )
  const dividasElegiveis = dvds.filter((d) => d.elegivel_desenrola).length
  const dividasAcumulando = dvds.filter((d) => d.status === 'acumulando').length

  // --- Saúde financeira (0–100) ---
  // 60 pts = % quitação | 20 pts = saldo livre >= 0 | 20 pts = sem dívidas acumulando
  let healthScore: number
  if (dvds.length === 0 && pagoAcumulado === 0) {
    healthScore = 50 // sem dados ainda
  } else if (dvds.length === 0) {
    healthScore = 100 // tudo quitado
  } else {
    const pctPts = Math.round(pctQuitacao * 60)
    const livrePts = disponivel >= 0 ? 20 : 0
    const acumPts = dividasAcumulando === 0 ? 20 : Math.max(0, 20 - dividasAcumulando * 7)
    healthScore = Math.min(100, pctPts + livrePts + acumPts)
  }

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

      {/* Alertas */}
      <AlertasFaixa
        desenrolaAtiva={desenrolaAtiva}
        dividasElegiveis={dividasElegiveis}
        diasRestantesDesenrola={diasRestantesDesenrola}
        gastoAcimaMedia={gastoAcimaMedia}
        gastoMesAtual={gastoMesAtual}
        mediaGastosPrev={mediaGastosPrev}
        dividasAcumulando={dividasAcumulando}
      />

      {/* Herói */}
      <HeroDisponivel
        disponivel={disponivel}
        saldoTotal={saldoTotal}
        saldoFixas={Number(fixas?.saldo ?? 0)}
        saldoDividas={Number(envDividas?.saldo ?? 0)}
        saldoReserva={Number(reserva?.saldo ?? 0)}
      />

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

      {/* Placeholder passo 9 */}
      <div className="rounded-2xl bg-zinc-50 px-5 py-4 ring-1 ring-zinc-100 text-center">
        <p className="text-xs text-zinc-400">
          Projeção de receitas e despesas fixas disponível no{' '}
          <a href="/plano" className="underline text-blue-400">
            Passo 9 (Plano)
          </a>
        </p>
      </div>
    </main>
  )
}
