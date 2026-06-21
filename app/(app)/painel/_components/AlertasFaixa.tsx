import type { ReactNode } from 'react'
import { brl } from '@/lib/format'

export type AlertaCartao = {
  nomeCartao: string
  diasParaVencer: number
}

type Props = {
  desenrolaAtiva: boolean
  dividasElegiveis: number
  diasRestantesDesenrola: number
  gastoAcimaMedia: boolean
  gastoMesAtual: number
  mediaGastosPrev: number
  dividasAcumulando: number
  alertasCartao: AlertaCartao[]
  faturaSemCaixa: boolean
  faturasComprometidas: number
  saldoLivre: number
}

type TipoAlerta = 'urgente' | 'aviso' | 'info'

const estilos: Record<TipoAlerta, string> = {
  urgente: 'bg-red-50 border-red-300 text-red-900',
  aviso: 'bg-amber-50 border-amber-200 text-amber-900',
  info: 'bg-blue-50 border-blue-200 text-blue-900',
}

const icones: Record<TipoAlerta, string> = {
  urgente: '🚨',
  aviso: '⚠️',
  info: 'ℹ️',
}

export function AlertasFaixa({
  desenrolaAtiva,
  dividasElegiveis,
  diasRestantesDesenrola,
  gastoAcimaMedia,
  gastoMesAtual,
  mediaGastosPrev,
  dividasAcumulando,
  alertasCartao,
  faturaSemCaixa,
  faturasComprometidas,
  saldoLivre,
}: Props) {
  const alertas: { tipo: TipoAlerta; conteudo: ReactNode }[] = []

  // Fatura sem caixa pra cobrir (vermelho — prioridade máxima)
  if (faturaSemCaixa) {
    alertas.push({
      tipo: 'urgente',
      conteudo: (
        <>
          <strong>Fatura sem caixa pra cobrir</strong> — faturas comprometidas (
          {brl(faturasComprometidas)}) excedem o saldo da Livre ({brl(saldoLivre)}).{' '}
          <a href="/cartoes" className="underline font-semibold">
            Ver cartões →
          </a>
        </>
      ),
    })
  }

  // Vencimentos próximos de cartão (≤ 7 dias)
  for (const a of alertasCartao) {
    const diasTexto =
      a.diasParaVencer === 0
        ? 'hoje'
        : a.diasParaVencer === 1
          ? 'amanhã'
          : `em ${a.diasParaVencer} dias`
    alertas.push({
      tipo: 'aviso',
      conteudo: (
        <>
          Fatura do <strong>{a.nomeCartao}</strong> vence {diasTexto}.{' '}
          <a href="/cartoes" className="underline font-semibold">
            Pagar agora →
          </a>
        </>
      ),
    })
  }

  // Alerta Desenrola
  if (desenrolaAtiva) {
    if (dividasElegiveis > 0) {
      alertas.push({
        tipo: 'aviso',
        conteudo: (
          <>
            <strong>Desenrola ativo</strong> —{' '}
            {dividasElegiveis === 1
              ? '1 dívida elegível para negociação com desconto'
              : `${dividasElegiveis} dívidas elegíveis`}
            . Janela fecha em ~{diasRestantesDesenrola} dias.{' '}
            <a href="/dividas" className="underline font-semibold">
              Ver dívidas →
            </a>
          </>
        ),
      })
    } else {
      alertas.push({
        tipo: 'info',
        conteudo: (
          <>
            <strong>Janela Desenrola aberta</strong> (~{diasRestantesDesenrola} dias restantes).
            Nenhuma dívida marcada como elegível. Verifique em{' '}
            <a href="/dividas" className="underline">
              Dívidas
            </a>
            .
          </>
        ),
      })
    }
  }

  // Alerta gasto variável acima da média
  if (gastoAcimaMedia && mediaGastosPrev > 0) {
    const pctAcima = Math.round(((gastoMesAtual - mediaGastosPrev) / mediaGastosPrev) * 100)
    alertas.push({
      tipo: 'aviso',
      conteudo: (
        <>
          Gasto variável este mês ({brl(gastoMesAtual)}) está{' '}
          <strong>{pctAcima}% acima</strong> da média ({brl(mediaGastosPrev)}).
        </>
      ),
    })
  }

  // Alerta dívidas acumulando
  if (dividasAcumulando > 0) {
    alertas.push({
      tipo: 'aviso',
      conteudo: (
        <>
          {dividasAcumulando === 1
            ? '1 dívida acumulando juros'
            : `${dividasAcumulando} dívidas acumulando juros`}{' '}
          sem pagamento.{' '}
          <a href="/dividas" className="underline font-semibold">
            Registrar pagamento →
          </a>
        </>
      ),
    })
  }

  if (alertas.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {alertas.map((alerta, i) => (
        <div
          key={i}
          className={`flex gap-2 rounded-xl border px-4 py-3 text-xs leading-relaxed ${estilos[alerta.tipo]}`}
        >
          <span className="mt-0.5 shrink-0" aria-hidden="true">
            {icones[alerta.tipo]}
          </span>
          <span>{alerta.conteudo}</span>
        </div>
      ))}
    </div>
  )
}
