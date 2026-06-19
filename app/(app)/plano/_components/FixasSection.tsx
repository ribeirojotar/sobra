'use client'

import { useState } from 'react'
import type { RecurringExpense } from '@/lib/types'
import { brl } from '@/lib/format'
import { toggleAtivoFixa } from '../actions'
import { FixaSheet } from './FixaSheet'

export function FixasSection({ fixas }: { fixas: RecurringExpense[] }) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<RecurringExpense | null>(null)

  const ativas = fixas.filter((f) => f.ativo)
  const inativas = fixas.filter((f) => !f.ativo)

  const totalMensal = ativas.reduce((s, f) => s + Number(f.valor), 0)

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Despesas Fixas</h2>
          {ativas.length > 0 && (
            <p className="text-xs text-zinc-400">
              Total: {brl(totalMensal)}/mês
            </p>
          )}
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
          {ativas.map((f) => (
            <FixaCard key={f.id} fixa={f} onEdit={() => setEditTarget(f)} />
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-zinc-400">
          Nenhuma despesa fixa cadastrada. Adicione aluguel, internet, etc.
        </p>
      )}

      {inativas.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-zinc-400 hover:text-zinc-600">
            Inativas ({inativas.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {inativas.map((f) => (
              <FixaCard key={f.id} fixa={f} onEdit={() => setEditTarget(f)} />
            ))}
          </ul>
        </details>
      )}

      <FixaSheet open={createOpen} onClose={() => setCreateOpen(false)} />
      <FixaSheet open={Boolean(editTarget)} onClose={() => setEditTarget(null)} fixa={editTarget ?? undefined} />
    </section>
  )
}

function FixaCard({ fixa: f, onEdit }: { fixa: RecurringExpense; onEdit: () => void }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 ${!f.ativo ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <span className="truncate text-sm font-semibold text-zinc-900">{f.nome}</span>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-base font-bold text-zinc-900">{brl(Number(f.valor))}<span className="text-xs font-normal text-zinc-400">/mês</span></span>
          {f.dia_vencimento && (
            <span className="text-xs text-zinc-400">vence dia {f.dia_vencimento}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onEdit} aria-label={`Editar ${f.nome}`} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <form action={toggleAtivoFixa}>
          <input type="hidden" name="id" value={f.id} />
          <input type="hidden" name="ativo" value={String(f.ativo)} />
          <button type="submit" aria-label={f.ativo ? `Desativar ${f.nome}` : `Ativar ${f.nome}`} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
            {f.ativo ? (
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
