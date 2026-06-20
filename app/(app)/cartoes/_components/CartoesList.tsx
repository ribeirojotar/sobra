'use client'

import { useState } from 'react'
import type { CardWithStats } from '@/lib/types'
import { brl } from '@/lib/format'
import { CartaoSheet } from './CartaoSheet'

type Props = {
  cards: CardWithStats[]
}

export function CartoesList({ cards }: Props) {
  const [sheet, setSheet] = useState<null | { card?: CardWithStats }>(null)

  return (
    <>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Cartões</h1>
        <button
          type="button"
          onClick={() => setSheet({})}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="size-3.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo
        </button>
      </div>

      {/* Empty state */}
      {cards.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          <p className="text-sm text-zinc-400">Nenhum cartão ainda.</p>
          <button
            type="button"
            onClick={() => setSheet({})}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Adicionar cartão
          </button>
        </div>
      )}

      {/* Card list */}
      {cards.length > 0 && (
        <ul className="flex flex-col gap-3">
          {cards.map((card) => (
            <CartaoCard
              key={card.id}
              card={card}
              onEditar={() => setSheet({ card })}
            />
          ))}
        </ul>
      )}

      {/* Sheet */}
      <CartaoSheet
        open={sheet !== null}
        card={sheet?.card}
        onClose={() => setSheet(null)}
      />
    </>
  )
}

function CartaoCard({
  card,
  onEditar,
}: {
  card: CardWithStats
  onEditar: () => void
}) {
  const limiteDisponivel = card.limite - card.limite_usado
  const pctUsado = card.limite > 0 ? Math.min(100, (card.limite_usado / card.limite) * 100) : 0
  const corBorda = card.cor ?? '#e4e4e7' // zinc-200

  return (
    <li
      className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 overflow-hidden cursor-pointer"
      onClick={onEditar}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onEditar()}
      aria-label={`Editar cartão ${card.nome}`}
    >
      {/* Color stripe */}
      <div className="h-1.5 w-full" style={{ backgroundColor: corBorda }} />

      <div className="p-4">
        {/* Name + vencimento */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="text-sm font-bold text-zinc-900">{card.nome}</span>
          {card.dia_vencimento && (
            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
              Vence dia {card.dia_vencimento}
            </span>
          )}
        </div>

        {/* Fatura aberta */}
        <div className="mb-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Fatura aberta
          </p>
          <p className={`mt-0.5 text-lg font-bold ${card.fatura_aberta > 0 ? 'text-zinc-900' : 'text-zinc-400'}`}>
            {brl(card.fatura_aberta)}
          </p>
        </div>

        {/* Limite */}
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-zinc-500">
            <span>Usado: {brl(card.limite_usado)}</span>
            <span>Disponível: {brl(limiteDisponivel)}</span>
          </div>
          {card.limite > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className={`h-full rounded-full transition-all ${pctUsado > 80 ? 'bg-red-400' : pctUsado > 50 ? 'bg-amber-400' : 'bg-blue-500'}`}
                style={{ width: `${pctUsado}%` }}
                aria-label={`${pctUsado.toFixed(0)}% do limite usado`}
              />
            </div>
          )}
          {card.limite > 0 && (
            <p className="mt-1 text-right text-[11px] text-zinc-400">
              de {brl(card.limite)}
            </p>
          )}
        </div>

        {card.juros_rotativo > 0 && (
          <p className="mt-2 text-[11px] text-zinc-400">
            Rotativo: {card.juros_rotativo.toString().replace('.', ',')}%/mês
          </p>
        )}
      </div>
    </li>
  )
}
