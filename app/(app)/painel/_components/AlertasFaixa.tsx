import type { ReactNode } from 'react'
import { brl } from '@/lib/format'

type Props = {
  desenrolaAtiva: boolean
  dividasElegiveis: number
  diasRestantesDesenrola: number
  gastoAcimaMedia: boolean
  gastoMesAtual: number
  mediaGastosPrev: number
  dividasAcumulando: number
}

type TipoAlerta = 'urgente' | 'aviso' | 'info'

const estilos: Record<TipoAlerta, string> = {
  urgente: 'bg-amber-50 border-amber-300 text-amber-900',
  aviso: 'bg-orange-50 border-orange-200 text-orange-900',
  info: 'bg-blue-50 border-blue-200 text-blue-900',
}

const icones: Record<TipoAlerta, string> = {
  urgente: '⚠️',
  aviso: '📊',
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
}: Props) {
  const alertas: { tipo: TipoAlerta; conteudo: ReactNode }[] = []

  // Alerta Desenrola
  if (desenrolaAtiva) {
    if (dividasElegiveis > 0) {
      alertas.push({
        tipo: 'urgente',
        conteudo: (
          <>
            <strong>Desenrola ativo</strong> —{' '}
            {dividasElegiveis === 1
              ? '1 dívida elegível para negociação com desconto'
              : `${dividasElegiveis} dívidas elegíveis para negociação com desconto`}
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
            Nenhuma dívida marcada como elegível. Verifique os critérios em{' '}
            <a href="/dividas" className="underline">
              Dívidas
            </a>
            .
          </>
        ),
      })
    }
  }

  // Alerta gasto variável
  if (gastoAcimaMedia && mediaGastosPrev > 0) {
    const pctAcima = Math.round(((gastoMesAtual - mediaGastosPrev) / mediaGastosPrev) * 100)
    alertas.push({
      tipo: 'aviso',
      conteudo: (
        <>
          Gasto variável este mês ({brl(gastoMesAtual)}) está{' '}
          <strong>{pctAcima}% acima</strong> da média dos meses anteriores ({brl(mediaGastosPrev)}).
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
            ? '1 dívida com status acumulando'
            : `${dividasAcumulando} dívidas com status acumulando`}{' '}
          — os juros estão crescendo sem pagamento.{' '}
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
