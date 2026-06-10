'use client'

import { useState } from 'react'
import type { Envelope } from '@/lib/types'
import { brl } from '@/lib/format'
import { toggleAtivo } from '../actions'
import { EnvelopeSheet } from './EnvelopeSheet'

const TIPO_CONFIG: Record<Envelope['tipo'], { label: string; cls: string }> = {
  fixas:   { label: 'Fixas',   cls: 'bg-indigo-100 text-indigo-700' },
  dividas: { label: 'Dívidas', cls: 'bg-red-100    text-red-700'    },
  reserva: { label: 'Reserva', cls: 'bg-green-100  text-green-700'  },
  livre:   { label: 'Livre',   cls: 'bg-blue-100   text-blue-700'   },
  negocio: { label: 'Negócio', cls: 'bg-amber-100  text-amber-700'  },
  custom:  { label: 'Custom',  cls: 'bg-zinc-100   text-zinc-600'   },
}

export function CaixinhasSection({ envelopes }: { envelopes: Envelope[] }) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Envelope | null>(null)

  const active   = envelopes.filter((e) => e.ativo)
  const inactive = envelopes.filter((e) => !e.ativo)

  return (
    <section>
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Caixinhas</h2>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="size-3.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova
        </button>
      </div>

      {/* Active envelopes */}
      {active.length > 0 && (
        <ul className="flex flex-col gap-3">
          {active.map((env) => (
            <EnvelopeCard
              key={env.id}
              envelope={env}
              onEdit={() => setEditTarget(env)}
            />
          ))}
        </ul>
      )}

      {/* Inactive envelopes */}
      {inactive.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-zinc-400 hover:text-zinc-600">
            Inativas ({inactive.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {inactive.map((env) => (
              <EnvelopeCard
                key={env.id}
                envelope={env}
                onEdit={() => setEditTarget(env)}
              />
            ))}
          </ul>
        </details>
      )}

      {envelopes.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-400">
          Nenhuma caixinha ainda. Crie a primeira!
        </p>
      )}

      {/* Sheets */}
      <EnvelopeSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <EnvelopeSheet
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        envelope={editTarget ?? undefined}
      />
    </section>
  )
}

function EnvelopeCard({
  envelope: env,
  onEdit,
}: {
  envelope: Envelope
  onEdit: () => void
}) {
  const cfg = TIPO_CONFIG[env.tipo]
  const inactive = !env.ativo

  return (
    <li
      className={`flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 transition ${inactive ? 'opacity-50' : ''}`}
    >
      {/* Color dot */}
      <span
        className="mt-0.5 size-3 shrink-0 rounded-full"
        style={{ backgroundColor: env.cor ?? '#a1a1aa' }}
        aria-hidden="true"
      />

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-zinc-900">{env.nome}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
            {cfg.label}
          </span>
          {inactive && (
            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
              Inativa
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-zinc-900">{brl(env.saldo)}</span>
          {env.meta != null && (
            <span className="text-xs text-zinc-400">
              meta {brl(env.meta)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Edit */}
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${env.nome}`}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

        {/* Toggle ativo */}
        <form action={toggleAtivo}>
          <input type="hidden" name="id"    value={env.id} />
          <input type="hidden" name="ativo" value={String(env.ativo)} />
          <button
            type="submit"
            aria-label={env.ativo ? `Desativar ${env.nome}` : `Ativar ${env.nome}`}
            title={env.ativo ? 'Desativar' : 'Ativar'}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            {env.ativo ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <rect x="1" y="5" width="22" height="14" rx="7" />
                <circle cx="16" cy="12" r="3" fill="currentColor" stroke="none" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <rect x="1" y="5" width="22" height="14" rx="7" />
                <circle cx="8" cy="12" r="3" fill="currentColor" stroke="none" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </li>
  )
}
