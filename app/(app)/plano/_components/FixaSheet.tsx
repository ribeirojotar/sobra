'use client'

import { useActionState, useEffect, useRef } from 'react'
import { saveFixa, type SaveResult } from '../actions'
import type { RecurringExpense } from '@/lib/types'

type Props = {
  open: boolean
  onClose: () => void
  fixa?: RecurringExpense
}

export function FixaSheet({ open, onClose, fixa }: Props) {
  const [state, action, pending] = useActionState<SaveResult, FormData>(saveFixa, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) {
      onClose()
      formRef.current?.reset()
    }
  }, [state, onClose])

  if (!open) return null

  const isEdit = Boolean(fixa)

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="fixa-sheet-title" className="sheet-panel">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="fixa-sheet-title" className="text-base font-semibold text-zinc-900">
            {isEdit ? 'Editar despesa fixa' : 'Nova despesa fixa'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form ref={formRef} action={action} className="flex flex-col gap-4">
          {fixa && <input type="hidden" name="id" value={fixa.id} />}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fixa-nome" className="text-sm font-medium text-zinc-700">Nome</label>
            <input
              id="fixa-nome" name="nome" type="text" required autoFocus
              defaultValue={fixa?.nome}
              placeholder="Ex.: Aluguel, Internet, Energia"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fixa-valor" className="text-sm font-medium text-zinc-700">Valor</label>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
              <span className="text-xs text-zinc-400 shrink-0">R$</span>
              <input
                id="fixa-valor" name="valor" type="number"
                inputMode="decimal" min="0" step="any" required
                defaultValue={fixa?.valor ?? ''}
                placeholder="0,00"
                className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fixa-dia" className="text-sm font-medium text-zinc-700">
              Dia do vencimento <span className="font-normal text-zinc-400">(opcional)</span>
            </label>
            <input
              id="fixa-dia" name="dia_vencimento" type="number"
              min="1" max="31" inputMode="numeric"
              defaultValue={fixa?.dia_vencimento ?? ''}
              placeholder="Ex.: 10"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {state && !state.ok && (
            <p role="alert" className="text-sm text-red-600">{state.error}</p>
          )}

          <button
            type="submit" disabled={pending}
            className="mt-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar despesa fixa'}
          </button>
        </form>
      </div>
    </>
  )
}
