import { brl } from '@/lib/format'
import { formatarDataPrevista } from '@/lib/simulador'
import type { SimResult } from '@/lib/simulador'

type Props = {
  dividaTotal: number
  pagoAcumulado: number
  pctQuitacao: number
  simResultado: SimResult | null
  aporteEstimado: number
}

const RADIUS = 36
const CIRC = 2 * Math.PI * RADIUS

export function MissaoQuitacao({
  dividaTotal,
  pagoAcumulado,
  pctQuitacao,
  simResultado,
  aporteEstimado,
}: Props) {
  if (dividaTotal === 0 && pagoAcumulado === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
        <h2 className="text-sm font-bold text-zinc-900">Missão: sair das dívidas</h2>
        <p className="mt-2 text-xs text-zinc-400">
          Nenhuma dívida cadastrada.{' '}
          <a href="/dividas" className="text-blue-500 underline">
            Cadastre a primeira
          </a>{' '}
          para ver o plano de quitação.
        </p>
      </div>
    )
  }

  const pctDisplay = Math.min(100, Math.round(pctQuitacao * 100))
  const offset = CIRC * (1 - Math.min(1, pctQuitacao))

  const ringColor =
    pctQuitacao >= 0.75 ? '#22c55e' : pctQuitacao >= 0.4 ? '#f59e0b' : '#3b82f6'

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
      <h2 className="mb-4 text-sm font-bold text-zinc-900">Missão: sair das dívidas</h2>

      <div className="flex items-center gap-5">
        {/* Anel de progresso */}
        <div className="relative shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
            <circle
              cx="48"
              cy="48"
              r={RADIUS}
              fill="none"
              stroke="#e4e4e7"
              strokeWidth="8"
            />
            <circle
              cx="48"
              cy="48"
              r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              transform="rotate(-90 48 48)"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-zinc-900">
            {pctDisplay}%
          </span>
        </div>

        {/* Dados */}
        <div className="flex-1 min-w-0 space-y-2">
          {pagoAcumulado > 0 && (
            <div>
              <p className="text-xs text-zinc-400">Já pago</p>
              <p className="text-sm font-semibold text-green-600">{brl(pagoAcumulado)}</p>
            </div>
          )}
          {dividaTotal > 0 && (
            <div>
              <p className="text-xs text-zinc-400">Ainda deve</p>
              <p className="text-sm font-semibold text-zinc-900">{brl(dividaTotal)}</p>
            </div>
          )}

          {simResultado ? (
            <div>
              {simResultado.ok && simResultado.meses === 0 ? (
                <p className="text-sm font-semibold text-green-600">Todas quitadas!</p>
              ) : simResultado.ok ? (
                <>
                  <p className="text-xs text-zinc-400">Data prevista*</p>
                  <p className="text-sm font-semibold text-zinc-700">
                    {formatarDataPrevista(simResultado.dataPrevista)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-amber-600">
                  {simResultado.motivo === 'insuficiente'
                    ? 'Aporte abaixo das parcelas mínimas'
                    : 'Não quita neste ritmo — aumente o aporte ou negocie a dívida'}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">
              Use o{' '}
              <a href="/dividas" className="text-blue-500 underline">
                Simulador
              </a>{' '}
              para ver a data prevista.
            </p>
          )}
        </div>
      </div>

      {aporteEstimado > 0 && simResultado?.ok && simResultado.meses > 0 && (
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
          * Projeção usando aporte estimado de {brl(aporteEstimado)}/mês (método Avalanche) —{' '}
          <a href="/dividas" className="underline">
            refine no Simulador
          </a>
        </p>
      )}
    </div>
  )
}
