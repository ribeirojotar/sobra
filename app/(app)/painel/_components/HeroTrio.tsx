'use client'

import { useState } from 'react'
import { brl } from '@/lib/format'

type Props = {
  inicial: number
  atual: number
  previsto: number
  receitasPendentes: number
  despesasPendentes: number
}

export function HeroTrio({ inicial, atual, previsto, receitasPendentes, despesasPendentes }: Props) {
  const [aberto, setAberto] = useState(false)
  const positivo = previsto >= 0

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
      <div className="grid grid-cols-3 divide-x divide-zinc-100">
        <ColValor label="Inicial" valor={inicial} />
        <ColValor label="Atual" valor={atual} />
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg active:bg-zinc-50 transition"
          aria-expanded={aberto}
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Previsto
          </span>
          <span className={`text-sm font-bold ${positivo ? 'text-green-600' : 'text-red-600'}`}>
            {brl(previsto)}
          </span>
          <span className="text-[9px] text-zinc-300">{aberto ? '▲' : '▼'}</span>
        </button>
      </div>

      {aberto && (
        <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-4 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">Atual</span>
            <span className="font-medium text-zinc-700">{brl(atual)}</span>
          </div>
          {receitasPendentes > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-500">+ Receitas pendentes</span>
              <span className="font-medium text-green-600">{brl(receitasPendentes)}</span>
            </div>
          )}
          {despesasPendentes > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-500">− Despesas pendentes</span>
              <span className="font-medium text-zinc-400">{brl(despesasPendentes)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-zinc-100 pt-1.5">
            <span className="font-semibold text-zinc-600">= Previsto</span>
            <span className={`font-semibold ${positivo ? 'text-green-600' : 'text-red-600'}`}>
              {brl(previsto)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function ColValor({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
        {label}
      </span>
      <span className="text-sm font-bold text-zinc-800">{brl(valor)}</span>
    </div>
  )
}
