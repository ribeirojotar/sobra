'use client'

import { useState, useTransition } from 'react'
import type { Debt, Envelope } from '@/lib/types'
import { brl } from '@/lib/format'
import { pagarDivida } from '../actions'

const FORMAS_PGTO = ['Pix', 'Dinheiro', 'Débito', 'Crédito']

type Props = {
  debt: Debt
  dividasEnvelope: Envelope | null
  envelopes: Envelope[]
  onClose: () => void
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function PagarSheet({ debt, dividasEnvelope, envelopes, onClose }: Props) {
  const defaultEnvId = dividasEnvelope?.id ?? envelopes[0]?.id ?? ''
  const defaultValor = debt.parcela_min > 0
    ? Math.min(debt.parcela_min, debt.valor_atual).toFixed(2).replace('.', ',')
    : debt.valor_atual.toFixed(2).replace('.', ',')

  const [valor, setValor] = useState(defaultValor)
  const [envelopeId, setEnvelopeId] = useState(defaultEnvId)
  const [data, setData] = useState(todayStr)
  const [formaPgto, setFormaPgto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    const valorNum = Number(valor.replace(',', '.'))
    if (!valorNum || valorNum <= 0) {
      setError('Informe um valor válido.')
      return
    }
    if (valorNum > debt.valor_atual + 0.01) {
      setError(`Valor maior que o saldo da dívida (${brl(debt.valor_atual)}).`)
      return
    }
    if (!envelopeId) {
      setError('Selecione uma caixinha.')
      return
    }

    const fd = new FormData()
    fd.set('debt_id', debt.id)
    fd.set('valor', valor.replace(',', '.'))
    fd.set('envelope_id', envelopeId)
    fd.set('data', data)
    if (descricao) fd.set('descricao', descricao)
    if (formaPgto) fd.set('forma_pgto', formaPgto)

    startTransition(async () => {
      const result = await pagarDivida(fd)
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
        aria-labelledby="pagar-sheet-title"
        className="sheet-panel"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="pagar-sheet-title" className="text-base font-semibold text-zinc-900">
            Registrar pagamento
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
          {debt.titulares && (
            <p className="text-xs text-zinc-500">{debt.titulares.nome}</p>
          )}
          <p className="mt-1 text-xs text-zinc-500">
            Saldo atual: <span className="font-semibold text-zinc-800">{brl(debt.valor_atual)}</span>
            {debt.parcela_min > 0 && (
              <> · Mínimo: <span className="font-semibold text-zinc-800">{brl(debt.parcela_min)}</span></>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Valor */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pagar-valor" className="text-sm font-medium text-zinc-700">
              Valor pago
            </label>
            <input
              id="pagar-valor"
              type="text"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="R$ 0,00"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Caixinha */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pagar-env" className="text-sm font-medium text-zinc-700">
              Caixinha
            </label>
            <select
              id="pagar-env"
              value={envelopeId}
              onChange={(e) => setEnvelopeId(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {envelopes.map((env) => (
                <option key={env.id} value={env.id}>{env.nome}</option>
              ))}
            </select>
          </div>

          {/* Data + Forma */}
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="pagar-data" className="text-sm font-medium text-zinc-700">
                Data
              </label>
              <input
                id="pagar-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="pagar-forma" className="text-sm font-medium text-zinc-700">
                Forma
              </label>
              <select
                id="pagar-forma"
                value={formaPgto}
                onChange={(e) => setFormaPgto(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Selecione…</option>
                {FORMAS_PGTO.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pagar-desc" className="text-sm font-medium text-zinc-700">
              Observação <span className="font-normal text-zinc-400">(opcional)</span>
            </label>
            <input
              id="pagar-desc"
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: parcela de junho…"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
            className="mt-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
          >
            {pending ? 'Registrando…' : 'Registrar pagamento'}
          </button>
        </div>
      </div>
    </>
  )
}
