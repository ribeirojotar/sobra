'use client'

import { useState } from 'react'
import type { IncomeSource } from '@/lib/types'
import { brl } from '@/lib/format'
import { toggleAtivoRenda } from '../actions'
import { RendaSheet } from './RendaSheet'

export function RendasSection({ rendas }: { rendas: IncomeSource[] }) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<IncomeSource | null>(null)

  const ativas = rendas.filter((r) => r.ativo)
  const inativas = rendas.filter((r) => !r.ativo)

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Rendas</h2>
          <p className="text-xs text-zinc-400">Usadas na projeção mensal</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="size-3.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova
        </button>
      </div>

      {ativas.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {ativas.map((r) => (
            <RendaCard key={r.id} renda={r} onEdit={() => setEditTarget(r)} />
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-zinc-400">
          Nenhuma renda cadastrada. Adicione para ativar a projeção.
        </p>
      )}

      {inativas.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-zinc-400 hover:text-zinc-600">
            Inativas ({inativas.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {inativas.map((r) => (
              <RendaCard key={r.id} renda={r} onEdit={() => setEditTarget(r)} />
            ))}
          </ul>
        </details>
      )}

      <RendaSheet open={createOpen} onClose={() => setCreateOpen(false)} />
      <RendaSheet open={Boolean(editTarget)} onClose={() => setEditTarget(null)} renda={editTarget ?? undefined} />
    </section>
  )
}

function RendaCard({ renda: r, onEdit }: { renda: IncomeSource; onEdit: () => void }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 ${!r.ativo ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-zinc-900">{r.nome}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.tipo === 'fixa' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
            {r.tipo === 'fixa' ? 'Fixa' : 'Variável'}
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-base font-bold text-zinc-900">{brl(r.valor_estimado)}<span className="text-xs font-normal text-zinc-400">/mês</span></span>
          {r.dia_recebimento && (
            <span className="text-xs text-zinc-400">todo dia {r.dia_recebimento}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onEdit} aria-label={`Editar ${r.nome}`} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <form action={toggleAtivoRenda}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="ativo" value={String(r.ativo)} />
          <button type="submit" aria-label={r.ativo ? `Desativar ${r.nome}` : `Ativar ${r.nome}`} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
            {r.ativo ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <rect x="1" y="5" width="22" height="14" rx="7" /><circle cx="16" cy="12" r="3" fill="currentColor" stroke="none" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <rect x="1" y="5" width="22" height="14" rx="7" /><circle cx="8" cy="12" r="3" fill="currentColor" stroke="none" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </li>
  )
}
