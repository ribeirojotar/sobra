'use client'

import type { CardWithStats, CardInstallmentDetail } from '@/lib/types'
import { brl } from '@/lib/format'

type Props = {
  open: boolean
  card: CardWithStats | null
  installments: CardInstallmentDetail[]
  mesAtual: string
  onClose: () => void
  onEditar: () => void
  onPagar: (faturaAbertaTotal: number) => void
}

function formatMonth(yyyyMM: string) {
  const [year, month] = yyyyMM.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}

export function CartaoDetalheSheet({
  open,
  card,
  installments,
  mesAtual,
  onClose,
  onEditar,
  onPagar,
}: Props) {
  if (!open || !card) return null

  const faturaAberta = installments.filter((i) => i.competencia <= mesAtual)
  const faturaAbertaTotal = faturaAberta.reduce((sum, i) => sum + Number(i.valor), 0)

  const faturasFuturas = installments.filter((i) => i.competencia > mesAtual)
  const futurasByMonth = faturasFuturas.reduce<Record<string, CardInstallmentDetail[]>>(
    (acc, inst) => {
      const key = inst.competencia.slice(0, 7)
      if (!acc[key]) acc[key] = []
      acc[key].push(inst)
      return acc
    },
    {},
  )
  const futuraMonths = Object.keys(futurasByMonth).sort()

  const corBorda = card.cor ?? '#e4e4e7'

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cartao-detalhe-title"
        className="sheet-panel !pt-0"
      >
        {/* Faixa de cor */}
        <div
          className="h-2 -mx-6 rounded-t-2xl mb-5 transition-colors"
          style={{ backgroundColor: corBorda }}
        />

        {/* Cabeçalho */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 id="cartao-detalhe-title" className="text-base font-semibold text-zinc-900">
              {card.nome}
            </h2>
            {card.dia_vencimento && (
              <p className="text-xs text-zinc-400">Vence dia {card.dia_vencimento}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEditar}
              aria-label="Editar cartão"
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
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
        </div>

        {/* Fatura aberta */}
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Fatura aberta
              </p>
              <p
                className={`mt-0.5 text-2xl font-bold ${
                  faturaAbertaTotal > 0 ? 'text-zinc-900' : 'text-zinc-400'
                }`}
              >
                {brl(faturaAbertaTotal)}
              </p>
            </div>
            {faturaAbertaTotal > 0 && (
              <button
                type="button"
                onClick={() => onPagar(faturaAbertaTotal)}
                className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:opacity-80"
              >
                Pagar fatura
              </button>
            )}
          </div>

          {faturaAberta.length === 0 ? (
            <p className="py-3 text-center text-sm text-zinc-400">Fatura zerada.</p>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {faturaAberta.map((inst) => (
                <li key={inst.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-800">
                      {inst.card_purchases?.descricao || 'Sem descrição'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      {inst.numero}/{inst.card_purchases?.parcelas ?? '?'}
                    </p>
                  </div>
                  <span className="ml-4 shrink-0 text-sm font-semibold text-zinc-800">
                    {brl(Number(inst.valor))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Próximas faturas */}
        {futuraMonths.length > 0 && (
          <section>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              Próximas faturas
            </p>
            <div className="flex flex-col gap-4">
              {futuraMonths.map((month) => {
                const items = futurasByMonth[month]
                const total = items.reduce((sum, i) => sum + Number(i.valor), 0)
                return (
                  <div key={month}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold capitalize text-zinc-600">
                        {formatMonth(month)}
                      </span>
                      <span className="text-xs font-semibold text-zinc-700">{brl(total)}</span>
                    </div>
                    <ul className="divide-y divide-zinc-100 rounded-xl bg-zinc-50 px-3">
                      {items.map((inst) => (
                        <li key={inst.id} className="flex items-center justify-between py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-zinc-700">
                              {inst.card_purchases?.descricao || 'Sem descrição'}
                            </p>
                            <p className="mt-0.5 text-[10px] text-zinc-400">
                              {inst.numero}/{inst.card_purchases?.parcelas ?? '?'}
                            </p>
                          </div>
                          <span className="ml-3 shrink-0 text-xs font-semibold text-zinc-600">
                            {brl(Number(inst.valor))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
