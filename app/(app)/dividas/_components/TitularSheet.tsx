'use client'

import { useActionState, useEffect, useRef } from 'react'
import { saveTitular, type SaveResult } from '../actions'

type Props = {
  open: boolean
  onClose: () => void
}

export function TitularSheet({ open, onClose }: Props) {
  const [state, action, pending] = useActionState<SaveResult | null, FormData>(
    saveTitular,
    null,
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) {
      onClose()
      formRef.current?.reset()
    }
  }, [state, onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titular-sheet-title"
        className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-white px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-5 shadow-[0_-4px_32px_rgb(0,0,0,0.12)] max-h-[90dvh] overflow-y-auto"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="titular-sheet-title" className="text-base font-semibold text-zinc-900">
            Novo titular
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tit-nome" className="text-sm font-medium text-zinc-700">
              Nome
            </label>
            <input
              id="tit-nome"
              name="nome"
              type="text"
              required
              autoFocus
              placeholder="Ex.: Cartão A, Familiar 1…"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="tit-desc" className="text-sm font-medium text-zinc-700">
              Descrição <span className="font-normal text-zinc-400">(opcional)</span>
            </label>
            <input
              id="tit-desc"
              name="descricao"
              type="text"
              placeholder="Ex.: cônjuge, filho…"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {state && !state.ok && (
            <p role="alert" className="text-sm text-red-600">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? 'Salvando…' : 'Criar titular'}
          </button>
        </form>
      </div>
    </>
  )
}
