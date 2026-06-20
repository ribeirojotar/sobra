'use client'

import { useActionState, useEffect, useRef, useTransition } from 'react'
import type { Card } from '@/lib/types'
import { saveCard, inativarCard, type SaveResult } from '../actions'

type Props = {
  open: boolean
  card?: Card
  onClose: () => void
}

export function CartaoSheet({ open, card, onClose }: Props) {
  const [state, action, pending] = useActionState<SaveResult | null, FormData>(saveCard, null)
  const formRef = useRef<HTMLFormElement>(null)
  const [inativando, startInativar] = useTransition()
  const isEdit = Boolean(card)

  useEffect(() => {
    if (state?.ok) {
      onClose()
      formRef.current?.reset()
    }
  }, [state, onClose])

  if (!open) return null

  function handleInativar() {
    if (!card) return
    if (!window.confirm(`Inativar cartão "${card.nome}"? Ele sumirá da lista, mas os dados ficam salvos.`))
      return
    startInativar(async () => {
      await inativarCard(card.id)
      onClose()
    })
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cartao-sheet-title"
        className="sheet-panel"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="cartao-sheet-title" className="text-base font-semibold text-zinc-900">
            {isEdit ? 'Editar cartão' : 'Novo cartão'}
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
          {card && <input type="hidden" name="id" value={card.id} />}

          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-nome" className="text-sm font-medium text-zinc-700">
              Nome do cartão
            </label>
            <input
              id="card-nome"
              name="nome"
              type="text"
              required
              autoFocus
              defaultValue={card?.nome}
              placeholder="Ex.: Nubank, Inter Black…"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Limite */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-limite" className="text-sm font-medium text-zinc-700">
              Limite
            </label>
            <input
              id="card-limite"
              name="limite"
              type="text"
              inputMode="decimal"
              defaultValue={card?.limite?.toFixed(2).replace('.', ',') ?? '0,00'}
              placeholder="0,00"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Vencimento + Juros */}
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="card-venc" className="text-sm font-medium text-zinc-700">
                Dia de vencimento <span className="font-normal text-zinc-400">(opcional)</span>
              </label>
              <input
                id="card-venc"
                name="dia_vencimento"
                type="number"
                min={1}
                max={31}
                defaultValue={card?.dia_vencimento ?? ''}
                placeholder="Ex.: 10"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="card-juros" className="text-sm font-medium text-zinc-700">
                Juros rotativo <span className="font-normal text-zinc-400">(%/mês)</span>
              </label>
              <input
                id="card-juros"
                name="juros_rotativo"
                type="text"
                inputMode="decimal"
                defaultValue={card?.juros_rotativo?.toString().replace('.', ',') ?? '0'}
                placeholder="0,00"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Cor */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-cor" className="text-sm font-medium text-zinc-700">
              Cor <span className="font-normal text-zinc-400">(opcional, ex.: #7C3AED)</span>
            </label>
            <input
              id="card-cor"
              name="cor"
              type="text"
              defaultValue={card?.cor ?? ''}
              placeholder="#7C3AED"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {state && !state.ok && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || inativando}
            className="mt-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar cartão'}
          </button>

          {isEdit && (
            <button
              type="button"
              onClick={handleInativar}
              disabled={pending || inativando}
              className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-60"
            >
              {inativando ? 'Inativando…' : 'Inativar cartão'}
            </button>
          )}
        </form>
      </div>
    </>
  )
}
