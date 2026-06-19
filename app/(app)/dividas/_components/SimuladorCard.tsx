'use client'

import { useState, useMemo } from 'react'
import type { Debt } from '@/lib/types'
import { brl } from '@/lib/format'
import { simular, formatarDataPrevista } from '@/lib/simulador'

type Metodo = 'avalanche' | 'bola_de_neve'

type Props = {
  debts: Debt[]
  sortMode: Metodo
}

export function SimuladorCard({ debts, sortMode }: Props) {
  const [aporte, setAporte] = useState('')
  const [rendaExtra, setRendaExtra] = useState('')

  const ativas = useMemo(() => debts.filter((d) => !d.quitada && d.valor_atual > 0), [debts])

  const aporteMensal = parseFloat(aporte.replace(',', '.')) || 0
  const extraMensal = parseFloat(rendaExtra.replace(',', '.')) || 0

  const resultado = useMemo(
    () => (aporteMensal > 0 ? simular(ativas, aporteMensal, sortMode) : null),
    [ativas, aporteMensal, sortMode],
  )

  const resultadoComExtra = useMemo(
    () =>
      aporteMensal > 0 && extraMensal > 0
        ? simular(ativas, aporteMensal, sortMode, extraMensal)
        : null,
    [ativas, aporteMensal, extraMensal, sortMode],
  )

  if (ativas.length === 0) return null

  const metodoLabel = sortMode === 'avalanche' ? 'Avalanche' : 'Bola de neve'

  return (
    <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
      <h2 className="mb-3 text-sm font-bold text-zinc-900">Simulador de quitação</h2>

      {/* Inputs */}
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">Aporte mensal para dívidas</span>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 focus-within:border-blue-400 focus-within:bg-white transition">
            <span className="text-xs text-zinc-400 shrink-0">R$</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="0"
              value={aporte}
              onChange={(e) => setAporte(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-zinc-900 outline-none placeholder:font-normal placeholder:text-zinc-300"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">
            Cenário: e se a renda subir +R$/mês?
          </span>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 focus-within:border-blue-400 focus-within:bg-white transition">
            <span className="text-xs text-zinc-400 shrink-0">+R$</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="0"
              value={rendaExtra}
              onChange={(e) => setRendaExtra(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-zinc-900 outline-none placeholder:font-normal placeholder:text-zinc-300"
            />
            <span className="text-xs text-zinc-400 shrink-0">/mês</span>
          </div>
        </label>
      </div>

      {/* Results */}
      {aporteMensal > 0 && (
        <div className="mt-4 border-t border-zinc-100 pt-4 flex flex-col gap-3">
          {/* Método ativo */}
          <ResultRow
            label={metodoLabel}
            resultado={resultado}
            highlight
          />

          {/* Cenário com renda extra */}
          {resultadoComExtra && resultado && (
            <ResultRow
              label={`+${brl(extraMensal)}/mês`}
              resultado={resultadoComExtra}
              comparar={resultado}
            />
          )}
        </div>
      )}

      {/* Empty hint */}
      {aporteMensal === 0 && (
        <p className="mt-3 text-center text-xs text-zinc-400">
          Informe o valor que você consegue separar por mês para ver a projeção.
        </p>
      )}
    </div>
  )
}

function ResultRow({
  label,
  resultado,
  highlight = false,
  comparar,
}: {
  label: string
  resultado: ReturnType<typeof simular> | null
  highlight?: boolean
  comparar?: ReturnType<typeof simular> | null
}) {
  if (!resultado) return null

  if (!resultado.ok) {
    const msg =
      resultado.motivo === 'insuficiente'
        ? 'Aporte menor que as parcelas mínimas'
        : 'Não quita neste cenário (>50 anos)'
    return (
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-xs font-semibold text-zinc-500 shrink-0 w-24">{label}</span>
        <span className="text-xs text-amber-600">{msg}</span>
      </div>
    )
  }

  if (resultado.meses === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-zinc-500 shrink-0 w-24">{label}</span>
        <span className="text-xs text-green-600 font-semibold">Já quitado!</span>
      </div>
    )
  }

  const economia =
    comparar && comparar.ok && comparar.meses !== null && comparar.meses > 0
      ? comparar.meses - resultado.meses
      : null

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs font-semibold text-zinc-500 shrink-0 w-24">{label}</span>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={`font-bold ${highlight ? 'text-lg text-zinc-900' : 'text-sm text-zinc-700'}`}>
          {resultado.meses} {resultado.meses === 1 ? 'mês' : 'meses'}
        </span>
        <span className="text-xs text-zinc-400">
          — {formatarDataPrevista(resultado.dataPrevista)}
        </span>
        {economia !== null && economia > 0 && (
          <span className="text-xs font-semibold text-green-600">
            ({economia} {economia === 1 ? 'mês' : 'meses'} a menos)
          </span>
        )}
        {economia !== null && economia <= 0 && (
          <span className="text-xs text-zinc-400">(sem diferença)</span>
        )}
      </div>
    </div>
  )
}
