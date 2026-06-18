'use client'

import { useState } from 'react'
import type { Debt, Titular, Envelope } from '@/lib/types'
import { brl } from '@/lib/format'
import { DividaSheet } from './DividaSheet'
import { PagarSheet } from './PagarSheet'
import { NegociarSheet } from './NegociarSheet'
import { TitularSheet } from './TitularSheet'

type SortMode = 'avalanche' | 'bola_de_neve'

type SheetState =
  | null
  | { type: 'create-debt' }
  | { type: 'edit-debt'; debt: Debt }
  | { type: 'pagar'; debt: Debt }
  | { type: 'negociar'; debt: Debt }

const STATUS_CONFIG: Record<Debt['status'], { label: string; cls: string }> = {
  a_negociar:    { label: 'A negociar',    cls: 'bg-amber-100 text-amber-700' },
  negociado:     { label: 'Negociado',     cls: 'bg-blue-100 text-blue-700' },
  acordo_em_dia: { label: 'Acordo em dia', cls: 'bg-green-100 text-green-700' },
  atrasado:      { label: 'Atrasado',      cls: 'bg-red-100 text-red-700' },
  acumulando:    { label: 'Acumulando',    cls: 'bg-orange-100 text-orange-700' },
  quitada:       { label: 'Quitada',       cls: 'bg-zinc-100 text-zinc-500' },
}

type Props = {
  debts: Debt[]
  titulares: Titular[]
  envelopes: Envelope[]
  dividasEnvelope: Envelope | null
}

export function DividasList({ debts, titulares, envelopes, dividasEnvelope }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('avalanche')
  const [sheet, setSheet] = useState<SheetState>(null)
  const [titularSheetOpen, setTitularSheetOpen] = useState(false)

  const active = debts.filter((d) => !d.quitada)
  const quitadas = debts.filter((d) => d.quitada)

  const sorted = [...active].sort((a, b) =>
    sortMode === 'avalanche'
      ? b.juros_mensal - a.juros_mensal
      : a.valor_atual - b.valor_atual,
  )

  const totalAtual = active.reduce((sum, d) => sum + d.valor_atual, 0)
  const totalOriginal = active.reduce((sum, d) => sum + d.valor_original, 0)
  const pago = Math.max(0, totalOriginal - totalAtual)
  const pctPago = totalOriginal > 0 ? Math.min(100, (pago / totalOriginal) * 100) : 0

  return (
    <>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Dívidas</h1>
        <button
          type="button"
          onClick={() => setSheet({ type: 'create-debt' })}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="size-3.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova
        </button>
      </div>

      {/* Summary card */}
      {active.length > 0 && (
        <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Total em dívidas
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{brl(totalAtual)}</p>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="mb-1.5 flex justify-between text-xs text-zinc-400">
              <span>{pctPago.toFixed(0)}% pago</span>
              <span>de {brl(totalOriginal)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${pctPago}%` }}
                aria-label={`${pctPago.toFixed(0)}% pago`}
              />
            </div>
          </div>

          <div className="mt-3 flex gap-4 text-xs text-zinc-500">
            <span>{active.length} ativa{active.length !== 1 ? 's' : ''}</span>
            {quitadas.length > 0 && (
              <span>{quitadas.length} quitada{quitadas.length !== 1 ? 's' : ''}</span>
            )}
            {pago > 0 && <span>{brl(pago)} pagos</span>}
          </div>
        </div>
      )}

      {/* Empty state */}
      {debts.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-zinc-400 text-sm">
            Cadastre sua primeira dívida pra ver o plano de quitação.
          </p>
          <button
            type="button"
            onClick={() => setSheet({ type: 'create-debt' })}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Cadastrar dívida
          </button>
        </div>
      )}

      {/* Sort toggle */}
      {active.length > 1 && (
        <div className="mb-4 flex rounded-xl bg-zinc-100 p-1">
          {(['avalanche', 'bola_de_neve'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSortMode(mode)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                sortMode === mode
                  ? 'bg-white shadow text-zinc-900'
                  : 'text-zinc-500'
              }`}
            >
              {mode === 'avalanche' ? 'Avalanche' : 'Bola de neve'}
            </button>
          ))}
        </div>
      )}

      {/* Hint */}
      {active.length > 1 && (
        <p className="mb-3 text-[11px] text-zinc-400">
          {sortMode === 'avalanche'
            ? 'Maior juros primeiro — economiza mais no total'
            : 'Menor saldo primeiro — quitações mais rápidas'}
        </p>
      )}

      {/* Debt list */}
      {sorted.length > 0 && (
        <ul className="flex flex-col gap-3">
          {sorted.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onPagar={() => setSheet({ type: 'pagar', debt })}
              onNegociar={() => setSheet({ type: 'negociar', debt })}
              onEditar={() => setSheet({ type: 'edit-debt', debt })}
            />
          ))}
        </ul>
      )}

      {/* Quitadas */}
      {quitadas.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-zinc-400 hover:text-zinc-600">
            Quitadas ({quitadas.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {quitadas.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onPagar={() => setSheet({ type: 'pagar', debt })}
                onNegociar={() => setSheet({ type: 'negociar', debt })}
                onEditar={() => setSheet({ type: 'edit-debt', debt })}
              />
            ))}
          </ul>
        </details>
      )}

      {/* Gerenciar titulares link */}
      {titulares.length > 0 && (
        <p className="mt-6 text-center text-xs text-zinc-400">
          <button
            type="button"
            onClick={() => setTitularSheetOpen(true)}
            className="font-medium text-zinc-500 hover:text-zinc-700 underline underline-offset-2"
          >
            Gerenciar titulares
          </button>
        </p>
      )}

      {/* Sheets */}
      <DividaSheet
        open={sheet?.type === 'create-debt'}
        titulares={titulares}
        onClose={() => setSheet(null)}
        onNewTitular={() => setTitularSheetOpen(true)}
      />
      <DividaSheet
        open={sheet?.type === 'edit-debt'}
        debt={sheet?.type === 'edit-debt' ? sheet.debt : undefined}
        titulares={titulares}
        onClose={() => setSheet(null)}
        onNewTitular={() => setTitularSheetOpen(true)}
      />
      {sheet?.type === 'pagar' && (
        <PagarSheet
          debt={sheet.debt}
          dividasEnvelope={dividasEnvelope}
          envelopes={envelopes}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.type === 'negociar' && (
        <NegociarSheet
          debt={sheet.debt}
          onClose={() => setSheet(null)}
        />
      )}
      <TitularSheet
        open={titularSheetOpen}
        onClose={() => setTitularSheetOpen(false)}
      />
    </>
  )
}

function DebtCard({
  debt,
  onPagar,
  onNegociar,
  onEditar,
}: {
  debt: Debt
  onPagar: () => void
  onNegociar: () => void
  onEditar: () => void
}) {
  const cfg = STATUS_CONFIG[debt.status]
  const pago = Math.max(0, debt.valor_original - debt.valor_atual)
  const pctPago =
    debt.valor_original > 0
      ? Math.min(100, (pago / debt.valor_original) * 100)
      : 0

  return (
    <li className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 ${debt.quitada ? 'opacity-60' : ''}`}>
      {/* Top row: credor + badges */}
      <div className="mb-1 flex flex-wrap items-start gap-2">
        <span className="flex-1 text-sm font-bold text-zinc-900">{debt.credor}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
          {cfg.label}
        </span>
        {debt.elegivel_desenrola && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            ★ Desenrola
          </span>
        )}
      </div>

      {/* Titular */}
      {debt.titulares && (
        <p className="mb-2 text-xs text-zinc-500">{debt.titulares.nome}</p>
      )}
      {debt.descricao && !debt.titulares && (
        <p className="mb-2 text-xs text-zinc-500">{debt.descricao}</p>
      )}
      {debt.descricao && debt.titulares && (
        <p className="mb-2 text-xs text-zinc-400">{debt.descricao}</p>
      )}

      {/* Valor atual */}
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-xl font-bold text-zinc-900">{brl(debt.valor_atual)}</span>
        {debt.valor_original !== debt.valor_atual && (
          <span className="text-xs text-zinc-400">de {brl(debt.valor_original)}</span>
        )}
      </div>

      {/* Progress bar */}
      {debt.valor_original > 0 && pctPago > 0 && (
        <div className="mb-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-green-400 transition-all"
              style={{ width: `${pctPago}%` }}
            />
          </div>
        </div>
      )}

      {/* Meta info */}
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-zinc-500">
        {debt.juros_mensal > 0 && (
          <span>{debt.juros_mensal.toString().replace('.', ',')}%/mês</span>
        )}
        {debt.parcela_min > 0 && (
          <span>Mín. {brl(debt.parcela_min)}</span>
        )}
        {debt.desconta_em_folha && (
          <span className="text-zinc-400">Folha</span>
        )}
      </div>

      {/* Actions */}
      {!debt.quitada && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPagar}
            className="flex-1 rounded-lg bg-green-50 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 transition"
          >
            Pagar
          </button>
          <button
            type="button"
            onClick={onNegociar}
            className="flex-1 rounded-lg bg-blue-50 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            Negociar
          </button>
          <button
            type="button"
            onClick={onEditar}
            aria-label="Editar"
            className="rounded-lg bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      )}
      {debt.quitada && (
        <button
          type="button"
          onClick={onEditar}
          className="text-xs text-zinc-400 hover:text-zinc-600"
        >
          Editar
        </button>
      )}
    </li>
  )
}
