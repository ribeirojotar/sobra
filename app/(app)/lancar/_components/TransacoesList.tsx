'use client'

import { useState, useTransition, useEffect } from 'react'
import type { CardPurchaseRow, Category, Envelope, TransactionRow } from '@/lib/types'
import { brl } from '@/lib/format'
import { deletarTransacao, editarTransacao, cancelarCompraCartao } from '../actions'

const FORMAS_PGTO = ['Pix', 'Dinheiro', 'Débito', 'Crédito']

type ListProps = {
  transactions: TransactionRow[]
  cardPurchases: CardPurchaseRow[]
  envelopes: Envelope[]
  categories: Category[]
}

type ListEntry =
  | { kind: 'tx'; item: TransactionRow; sortKey: string }
  | { kind: 'cp'; item: CardPurchaseRow; sortKey: string }

export function TransacoesList({ transactions, cardPurchases, envelopes, categories }: ListProps) {
  const [editTarget, setEditTarget] = useState<TransactionRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleDelete(id: string) {
    if (!confirm('Excluir este lançamento e reverter o saldo?')) return
    setDeletingId(id)
    setDeleteError(null)
    startTransition(async () => {
      const result = await deletarTransacao(id)
      setDeletingId(null)
      if (!result.ok) setDeleteError(result.error)
    })
  }

  function handleCancelPurchase(id: string) {
    if (!confirm('Cancelar esta compra no crédito? As parcelas em aberto serão removidas.')) return
    setDeletingId(id)
    setDeleteError(null)
    startTransition(async () => {
      const result = await cancelarCompraCartao(id)
      setDeletingId(null)
      if (!result.ok) setDeleteError(result.error)
    })
  }

  const combined: ListEntry[] = [
    ...transactions.map((tx) => ({ kind: 'tx' as const, item: tx, sortKey: tx.created_at })),
    ...cardPurchases.map((cp) => ({ kind: 'cp' as const, item: cp, sortKey: cp.created_at })),
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey))

  const now = new Date()
  const mes = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <section className="pb-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {mes}
      </h2>

      {deleteError && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {deleteError}
        </p>
      )}

      {combined.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-400">
          Nenhum lançamento este mês. Registre o primeiro acima!
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {combined.map((entry) =>
            entry.kind === 'tx' ? (
              <TransactionItem
                key={`tx-${entry.item.id}`}
                tx={entry.item}
                isDeleting={deletingId === entry.item.id && pending}
                onEdit={() => setEditTarget(entry.item)}
                onDelete={() => handleDelete(entry.item.id)}
              />
            ) : (
              <CardPurchaseItem
                key={`cp-${entry.item.id}`}
                purchase={entry.item}
                isDeleting={deletingId === entry.item.id && pending}
                onDelete={() => handleCancelPurchase(entry.item.id)}
              />
            ),
          )}
        </ul>
      )}

      {editTarget && (
        <TransactionEditSheet
          tx={editTarget}
          envelopes={envelopes}
          categories={categories}
          onClose={() => setEditTarget(null)}
        />
      )}
    </section>
  )
}

function TransactionItem({
  tx,
  isDeleting,
  onEdit,
  onDelete,
}: {
  tx: TransactionRow
  isDeleting: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const isReceita = tx.tipo === 'receita'
  const dateStr = new Date(tx.data + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })

  const label = tx.descricao || tx.categories?.nome || (isReceita ? 'Receita' : 'Despesa')

  return (
    <li
      className={`flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-zinc-100 transition ${
        isDeleting ? 'opacity-40' : ''
      }`}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg">
        {tx.categories?.emoji ?? (isReceita ? '💰' : '💸')}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">{label}</p>
        <p className="truncate text-xs text-zinc-400">
          {[tx.envelopes?.nome, dateStr].filter(Boolean).join(' · ')}
        </p>
      </div>

      <span
        className={`shrink-0 text-sm font-bold ${
          isReceita ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {isReceita ? '+' : '-'}
        {brl(tx.valor)}
      </span>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onEdit}
          disabled={isDeleting}
          aria-label="Editar lançamento"
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40"
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
          onClick={onDelete}
          disabled={isDeleting}
          aria-label="Excluir lançamento"
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
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
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </li>
  )
}

function CardPurchaseItem({
  purchase,
  isDeleting,
  onDelete,
}: {
  purchase: CardPurchaseRow
  isDeleting: boolean
  onDelete: () => void
}) {
  const dateStr = new Date(purchase.data_compra + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })

  const firstInstallment = purchase.card_installments?.find((i) => i.numero === 1)
  const faturaStr = firstInstallment
    ? new Date(firstInstallment.competencia + 'T12:00:00').toLocaleDateString('pt-BR', {
        month: 'short',
      }).replace('.', '')
    : null

  const installmentInfo = purchase.parcelas > 1 ? `1/${purchase.parcelas}` : 'à vista'
  const subParts = [
    'Crédito',
    purchase.cards?.nome,
    installmentInfo,
    faturaStr ? `fatura de ${faturaStr}` : null,
    dateStr,
  ]
    .filter(Boolean)
    .join(' · ')

  const label = purchase.descricao || purchase.categories?.nome || 'Compra no crédito'

  return (
    <li
      className={`flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-purple-100 transition ${
        isDeleting ? 'opacity-40' : ''
      }`}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-lg">
        {purchase.categories?.emoji ?? '💳'}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">{label}</p>
        <p className="truncate text-xs text-purple-500">{subParts}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-zinc-500">-{brl(purchase.valor_total)}</p>
      </div>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          aria-label="Cancelar compra no crédito"
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
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
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </li>
  )
}

function TransactionEditSheet({
  tx,
  envelopes,
  categories,
  onClose,
}: {
  tx: TransactionRow
  envelopes: Envelope[]
  categories: Category[]
  onClose: () => void
}) {
  const [tipo, setTipo] = useState<'receita' | 'despesa'>(tx.tipo)
  const [valor, setValor] = useState(String(tx.valor))
  const [descricao, setDescricao] = useState(tx.descricao ?? '')
  const [data, setData] = useState(tx.data)
  const [categoryId, setCategoryId] = useState<string | null>(tx.category_id)
  const [envelopeId, setEnvelopeId] = useState<string | null>(tx.envelope_id)
  const [formaPgto, setFormaPgto] = useState(tx.forma_pgto ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const filteredCats = categories.filter((c) => c.tipo === tipo)

  function handleSubmit() {
    setError(null)
    const valorNum = Number(valor.replace(',', '.'))
    if (!valorNum || valorNum <= 0) { setError('Valor inválido.'); return }
    if (!envelopeId) { setError('Selecione uma caixinha.'); return }

    const fd = new FormData()
    fd.set('id', tx.id)
    fd.set('tipo', tipo)
    fd.set('valor', valor.replace(',', '.'))
    fd.set('descricao', descricao)
    fd.set('data', data)
    fd.set('envelope_id', envelopeId)
    if (categoryId) fd.set('category_id', categoryId)
    if (formaPgto) fd.set('forma_pgto', formaPgto)

    startTransition(async () => {
      const result = await editarTransacao(fd)
      if (!result.ok) { setError(result.error); return }
      onClose()
    })
  }

  return (
    <>
      <div
        className="sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-sheet-title"
        className="sheet-panel"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="edit-sheet-title" className="text-base font-semibold text-zinc-900">
            Editar lançamento
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

        <div className="flex flex-col gap-4">
          {/* Tipo */}
          <div className="flex rounded-xl bg-zinc-100 p-1">
            {(['despesa', 'receita'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTipo(t); setCategoryId(null) }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  tipo === t
                    ? t === 'despesa'
                      ? 'bg-white shadow text-red-600'
                      : 'bg-white shadow text-green-600'
                    : 'text-zinc-500'
                }`}
              >
                {t === 'despesa' ? 'Despesa' : 'Receita'}
              </button>
            ))}
          </div>

          {/* Valor */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Valor</label>
            <input
              type="text"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Descrição</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Categoria */}
          {filteredCats.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-zinc-700">Categoria</p>
              <div className="flex flex-wrap gap-2">
                {filteredCats.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      categoryId === cat.id
                        ? tipo === 'despesa'
                          ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
                          : 'bg-green-100 text-green-700 ring-1 ring-green-300'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {cat.emoji ? `${cat.emoji} ` : ''}{cat.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Caixinha */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Caixinha</label>
            <select
              value={envelopeId ?? ''}
              onChange={(e) => setEnvelopeId(e.target.value || null)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Selecione…</option>
              {envelopes.map((env) => (
                <option key={env.id} value={env.id}>{env.nome}</option>
              ))}
            </select>
          </div>

          {/* Data + Forma */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-zinc-700">Data</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-zinc-700">Forma</label>
              <select
                value={formaPgto}
                onChange={(e) => setFormaPgto(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">—</option>
                {FORMAS_PGTO.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
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
            className="rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </>
  )
}
