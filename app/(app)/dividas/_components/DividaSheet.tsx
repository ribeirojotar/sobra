'use client'

import { useActionState, useEffect, useRef, useTransition } from 'react'
import type { Debt, Titular } from '@/lib/types'
import { saveDebt, deletarDivida, type SaveResult } from '../actions'
import { brl } from '@/lib/format'

const STATUS_OPTIONS = [
  { value: 'a_negociar',    label: 'A negociar' },
  { value: 'negociado',     label: 'Negociado' },
  { value: 'acordo_em_dia', label: 'Acordo em dia' },
  { value: 'atrasado',      label: 'Atrasado' },
  { value: 'acumulando',    label: 'Acumulando' },
]

type Props = {
  open: boolean
  debt?: Debt
  titulares: Titular[]
  onClose: () => void
  onNewTitular: () => void
}

export function DividaSheet({ open, debt, titulares, onClose, onNewTitular }: Props) {
  const [state, action, pending] = useActionState<SaveResult | null, FormData>(saveDebt, null)
  const formRef = useRef<HTMLFormElement>(null)
  const [deleting, startDelete] = useTransition()
  const isEdit = Boolean(debt)

  useEffect(() => {
    if (state?.ok) {
      onClose()
      formRef.current?.reset()
    }
  }, [state, onClose])

  if (!open) return null

  function handleDelete() {
    if (!debt) return
    if (!window.confirm(`Excluir dívida "${debt.credor}"? Esta ação não pode ser desfeita.`))
      return
    startDelete(async () => {
      await deletarDivida(debt.id)
      onClose()
    })
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="divida-sheet-title"
        className="sheet-panel"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="divida-sheet-title" className="text-base font-semibold text-zinc-900">
            {isEdit ? 'Editar dívida' : 'Nova dívida'}
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
          {debt && <input type="hidden" name="id" value={debt.id} />}

          {/* Credor */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dv-credor" className="text-sm font-medium text-zinc-700">
              Credor
            </label>
            <input
              id="dv-credor"
              name="credor"
              type="text"
              required
              autoFocus
              defaultValue={debt?.credor}
              placeholder="Ex.: Banco X, Cartão Y…"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dv-desc" className="text-sm font-medium text-zinc-700">
              Descrição <span className="font-normal text-zinc-400">(opcional)</span>
            </label>
            <input
              id="dv-desc"
              name="descricao"
              type="text"
              defaultValue={debt?.descricao ?? ''}
              placeholder="Ex.: empréstimo pessoal, cartão de crédito…"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Titular */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="dv-titular" className="text-sm font-medium text-zinc-700">
                Titular <span className="font-normal text-zinc-400">(opcional)</span>
              </label>
              <button
                type="button"
                onClick={onNewTitular}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                + Novo titular
              </button>
            </div>
            <select
              id="dv-titular"
              name="titular_id"
              defaultValue={debt?.titular_id ?? ''}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Sem titular</option>
              {titulares.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          {/* Valores */}
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="dv-vorig" className="text-sm font-medium text-zinc-700">
                Valor original
              </label>
              <input
                id="dv-vorig"
                name="valor_original"
                type="text"
                inputMode="decimal"
                required
                defaultValue={debt?.valor_original?.toFixed(2).replace('.', ',') ?? ''}
                placeholder="0,00"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            {!isEdit && (
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor="dv-vatual" className="text-sm font-medium text-zinc-700">
                  Saldo atual
                </label>
                <input
                  id="dv-vatual"
                  name="valor_atual"
                  type="text"
                  inputMode="decimal"
                  placeholder="= original"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}
          </div>

          {/* Saldo atual read-only no modo edição */}
          {isEdit && debt && (
            <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              Saldo atual: <span className="font-semibold text-zinc-900">{brl(debt.valor_atual)}</span>
              <span className="ml-2 text-xs text-zinc-400">(alterado via pagamento ou negociação)</span>
            </div>
          )}

          {/* Juros + Parcela mínima */}
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="dv-juros" className="text-sm font-medium text-zinc-700">
                Juros <span className="font-normal text-zinc-400">(%/mês)</span>
              </label>
              <input
                id="dv-juros"
                name="juros_mensal"
                type="text"
                inputMode="decimal"
                defaultValue={debt?.juros_mensal?.toString().replace('.', ',') ?? '0'}
                placeholder="0,00"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="dv-parcela" className="text-sm font-medium text-zinc-700">
                Parcela mín.
              </label>
              <input
                id="dv-parcela"
                name="parcela_min"
                type="text"
                inputMode="decimal"
                defaultValue={debt?.parcela_min?.toFixed(2).replace('.', ',') ?? '0'}
                placeholder="0,00"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dv-status" className="text-sm font-medium text-zinc-700">
              Status
            </label>
            <select
              id="dv-status"
              name="status"
              defaultValue={debt?.status ?? 'a_negociar'}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="desconta_em_folha"
                defaultChecked={debt?.desconta_em_folha ?? false}
                className="size-4 rounded border-zinc-300 accent-blue-600"
              />
              <span className="text-sm text-zinc-700">Desconta em folha</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="elegivel_desenrola"
                defaultChecked={debt?.elegivel_desenrola ?? false}
                className="size-4 rounded border-zinc-300 accent-amber-500"
              />
              <span className="text-sm text-zinc-700">Elegível Desenrola Brasil</span>
            </label>
          </div>

          {/* Campos opcionais */}
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="dv-contratada" className="text-sm font-medium text-zinc-700">
                Contratada em <span className="font-normal text-zinc-400">(opcional)</span>
              </label>
              <input
                id="dv-contratada"
                name="contratada_em"
                type="date"
                defaultValue={debt?.contratada_em ?? ''}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="dv-atraso" className="text-sm font-medium text-zinc-700">
                Atraso <span className="font-normal text-zinc-400">(dias)</span>
              </label>
              <input
                id="dv-atraso"
                name="atraso_dias"
                type="number"
                min={0}
                defaultValue={debt?.atraso_dias ?? ''}
                placeholder="0"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {state && !state.ok && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || deleting}
            className="mt-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar dívida'}
          </button>

          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending || deleting}
              className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              {deleting ? 'Excluindo…' : 'Excluir dívida'}
            </button>
          )}
        </form>
      </div>
    </>
  )
}
