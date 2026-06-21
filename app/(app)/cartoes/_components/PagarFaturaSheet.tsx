'use client'

import { useState, useTransition } from 'react'
import type { CardWithStats, Envelope } from '@/lib/types'
import { brl } from '@/lib/format'
import { pagarFatura, type PagarFaturaResult } from '../actions'

type Props = {
  open: boolean
  card: CardWithStats | null
  faturaAbertaTotal: number
  envelopes: Envelope[]
  mesAtual: string
  onClose: () => void
  onPago: () => void
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function PagarFaturaSheet({
  open,
  card,
  faturaAbertaTotal,
  envelopes,
  mesAtual,
  onClose,
  onPago,
}: Props) {
  const livreEnvelope = envelopes.find((e) => e.tipo === 'livre')

  const [valorStr, setValorStr] = useState('')
  const [envelopeId, setEnvelopeId] = useState(livreEnvelope?.id ?? '')
  const [data, setData] = useState(todayStr)
  const [result, setResult] = useState<PagarFaturaResult | null>(null)
  const [pending, startTransition] = useTransition()

  if (!open || !card) return null

  const valorNum = Number(valorStr.replace(',', '.')) || faturaAbertaTotal
  const restante = faturaAbertaTotal - valorNum
  const temRotativo = valorStr !== '' && valorNum < faturaAbertaTotal && valorNum > 0

  function handleClose() {
    setValorStr('')
    setEnvelopeId(livreEnvelope?.id ?? '')
    setData(todayStr())
    setResult(null)
    onClose()
  }

  function handlePago() {
    setValorStr('')
    setEnvelopeId(livreEnvelope?.id ?? '')
    setData(todayStr())
    setResult(null)
    onPago()
  }

  function handleSubmit() {
    if (!card) return
    const valor = valorStr === '' ? faturaAbertaTotal : Number(valorStr.replace(',', '.'))
    if (!valor || valor <= 0) return
    if (!envelopeId) return

    startTransition(async () => {
      const res = await pagarFatura(card.id, mesAtual, envelopeId, valor, data)
      setResult(res)
    })
  }

  const envSelecionado = envelopes.find((e) => e.id === envelopeId)

  return (
    <>
      <div className="sheet-backdrop" onClick={handleClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pagar-fatura-title"
        className="sheet-panel"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="pagar-fatura-title" className="text-base font-semibold text-zinc-900">
            Pagar fatura · {card.nome}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {result ? (
          /* Tela de resultado */
          result.ok ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-green-50 p-4 text-center">
                <p className="text-2xl mb-1">✓</p>
                <p className="text-sm font-semibold text-green-800">
                  {brl(result.pago)} pagos da caixinha {envSelecionado?.nome ?? ''}
                </p>
                {result.rotativo > 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    {brl(result.rotativo)} virou rotativo — dívida criada em Dívidas.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handlePago}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Fechar
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-sm text-red-700">{result.error}</p>
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Tentar novamente
              </button>
            </div>
          )
        ) : (
          /* Formulário */
          <div className="flex flex-col gap-4">
            {/* Total da fatura */}
            <div className="rounded-xl bg-zinc-50 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Total da fatura aberta
              </p>
              <p className="mt-0.5 text-xl font-bold text-zinc-900">{brl(faturaAbertaTotal)}</p>
            </div>

            {/* Valor a pagar */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pagar-valor" className="text-sm font-medium text-zinc-700">
                Valor a pagar{' '}
                <span className="font-normal text-zinc-400">(deixe em branco para pagar tudo)</span>
              </label>
              <input
                id="pagar-valor"
                type="text"
                inputMode="decimal"
                placeholder={faturaAbertaTotal.toFixed(2).replace('.', ',')}
                value={valorStr}
                onChange={(e) => setValorStr(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Aviso rotativo */}
            {temRotativo && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs text-amber-800">
                  O restante ({brl(restante)}) vira rotativo a{' '}
                  {card.juros_rotativo.toString().replace('.', ',')}%/mês e vai pro seu painel de
                  Dívidas.
                </p>
              </div>
            )}

            {/* Caixinha */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pagar-envelope" className="text-sm font-medium text-zinc-700">
                Caixinha
              </label>
              <select
                id="pagar-envelope"
                value={envelopeId}
                onChange={(e) => setEnvelopeId(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Selecione…</option>
                {envelopes.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.nome} — {brl(env.saldo)}
                  </option>
                ))}
              </select>
            </div>

            {/* Data */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pagar-data" className="text-sm font-medium text-zinc-700">
                Data do pagamento
              </label>
              <input
                id="pagar-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || !envelopeId}
              className="mt-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {pending ? 'Pagando…' : 'Confirmar pagamento'}
            </button>

            <button
              type="button"
              onClick={handleClose}
              disabled={pending}
              className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </>
  )
}
