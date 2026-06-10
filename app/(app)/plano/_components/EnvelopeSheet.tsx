'use client'

import { useActionState, useEffect, useRef } from 'react'
import { saveEnvelope, type SaveResult } from '../actions'
import type { Envelope } from '@/lib/types'

const PRESET_COLORS = [
  '#6366f1', '#ef4444', '#22c55e', '#3b82f6',
  '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#06b6d4', '#84cc16', '#a1a1aa',
]

const TIPOS = [
  { value: 'fixas',   label: 'Fixas' },
  { value: 'dividas', label: 'Dívidas' },
  { value: 'reserva', label: 'Reserva' },
  { value: 'livre',   label: 'Livre' },
  { value: 'negocio', label: 'Negócio' },
  { value: 'custom',  label: 'Personalizado' },
]

type Props = {
  open: boolean
  onClose: () => void
  envelope?: Envelope  // undefined = create mode
}

export function EnvelopeSheet({ open, onClose, envelope }: Props) {
  const [state, action, pending] = useActionState<SaveResult, FormData>(saveEnvelope, null)
  const formRef = useRef<HTMLFormElement>(null)

  // Close dialog when save succeeds
  useEffect(() => {
    if (state?.ok) {
      onClose()
      formRef.current?.reset()
    }
  }, [state, onClose])

  if (!open) return null

  const isEdit = Boolean(envelope)
  const defaultCor = envelope?.cor ?? '#3b82f6'

  return (
    <>
      {/* Backdrop */}
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="sheet-panel"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 id="sheet-title" className="text-base font-semibold text-zinc-900">
            {isEdit ? 'Editar caixinha' : 'Nova caixinha'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form ref={formRef} action={action} className="flex flex-col gap-4">
          {/* Hidden id for edit mode */}
          {envelope && <input type="hidden" name="id" value={envelope.id} />}

          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="env-nome" className="text-sm font-medium text-zinc-700">
              Nome
            </label>
            <input
              id="env-nome"
              name="nome"
              type="text"
              required
              autoFocus
              defaultValue={envelope?.nome}
              placeholder="Ex.: Lazer"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Tipo (only on create) */}
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="env-tipo" className="text-sm font-medium text-zinc-700">
                Tipo
              </label>
              <select
                id="env-tipo"
                name="tipo"
                defaultValue="custom"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Cor */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700">Cor</span>
            <ColorPicker name="cor" defaultValue={defaultCor} />
          </div>

          {/* Meta */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="env-meta" className="text-sm font-medium text-zinc-700">
              Meta <span className="font-normal text-zinc-400">(opcional)</span>
            </label>
            <input
              id="env-meta"
              name="meta"
              type="text"
              inputMode="decimal"
              defaultValue={envelope?.meta ?? ''}
              placeholder="R$ 0,00"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Error */}
          {state && !state.ok && (
            <p role="alert" className="text-sm text-red-600">{state.error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={pending}
            className="mt-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60"
          >
            {pending ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar caixinha'}
          </button>
        </form>
      </div>
    </>
  )
}

function ColorPicker({ name, defaultValue }: { name: string; defaultValue: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((color) => (
        <label key={color} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={color}
            defaultChecked={color === defaultValue}
            className="peer sr-only"
          />
          <span
            className="block size-7 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-white transition peer-checked:ring-zinc-700"
            style={{ backgroundColor: color }}
          />
        </label>
      ))}
    </div>
  )
}
