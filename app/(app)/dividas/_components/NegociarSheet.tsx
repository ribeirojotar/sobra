'use client'

import { useState, useTransition } from 'react'
import type { Debt } from '@/lib/types'
import { brl } from '@/lib/format'
import { negociarDivida } from '../actions'

const CANAIS = ['Portal do banco', 'Serasa Limpa Nome', 'Telefone', 'Agência', 'Outro']

type Props = {
  debt: Debt
  onClose: () => void
}

export function NegociarSheet({ debt, onClose }: Props) {
  const [valorAcordado, setValorAcordado] = useState(
    debt.valor_atual.toFixed(2).replace('.', ','),
  )
  const [canal, setCanal] = useState('')
  const [obs, setObs] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const desconto =
    debt.valor_original > 0
      ? Math.max(
          0,
          ((debt.valor_original - Number(valorAcordado.replace(',', '.'))) /
            debt.valor_original) *
            100,
        )
      : 0

  function handleSubmit() {
    setError(null)
    const valorNum = Number(valorAcordado.replace(',', '.'))
    if (isNaN(valorNum) || valorNum < 0) {
      setError('Informe um valor válido.')
      return
    }

    const fd = new FormData()
    fd.set('debt_id', debt.id)
    fd.set('valor_acordado', valorAcordado.replace(',', '.'))
    if (canal) fd.set('canal', canal)
    if (obs) fd.set('obs', obs)

    startTransition(async () => {
      const result = await negociarDivida(fd)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onClose()
    })
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="negociar-sheet-title"
        className="sheet-panel"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="negociar-sheet-title" className="text-base font-semibold text-zinc-900">
            Registrar negociação
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

        {/* Debt info */}
        <div className="mb-5 rounded-xl bg-zinc-50 px-4 py-3">
          <p className="text-sm font-semibold text-zinc-900">{debt.credor}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Saldo atual: <span className="font-semibold text-zinc-800">{brl(debt.valor_atual)}</span>
            {' '}· Original: <span className="font-semibold text-zinc-800">{brl(debt.valor_original)}</span>
          </p>
          {debt.elegivel_desenrola && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2">
              <span className="text-sm">★</span>
              <p className="text-xs font-medium text-amber-800">
                Elegível Desenrola Brasil — descontos de até 90%
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* Valor acordado */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="neg-valor" className="text-sm font-medium text-zinc-700">
              Valor acordado
            </label>
            <input
              id="neg-valor"
              type="text"
              inputMode="decimal"
              value={valorAcordado}
              onChange={(e) => setValorAcordado(e.target.value)}
              placeholder="R$ 0,00"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            {desconto > 0.1 && (
              <p className="text-xs font-medium text-green-700">
                Desconto de {desconto.toFixed(1)}% sobre o valor original
              </p>
            )}
          </div>

          {/* Canal */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="neg-canal" className="text-sm font-medium text-zinc-700">
              Canal <span className="font-normal text-zinc-400">(onde negociou)</span>
            </label>
            <select
              id="neg-canal"
              value={canal}
              onChange={(e) => setCanal(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Selecione…</option>
              {CANAIS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Observações */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="neg-obs" className="text-sm font-medium text-zinc-700">
              Observações <span className="font-normal text-zinc-400">(opcional)</span>
            </label>
            <textarea
              id="neg-obs"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={3}
              placeholder="Condições, prazo, parcelamento…"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="mt-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? 'Salvando…' : 'Registrar negociação'}
          </button>
        </div>
      </div>
    </>
  )
}
