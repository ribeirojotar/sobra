'use client'

import { useState, useTransition, useEffect } from 'react'
import type { CardPurchaseRow, Category, Envelope, TransactionRow } from '@/lib/types'
import { brl } from '@/lib/format'
import { deletarTransacao, editarTransacao, cancelarCompraCartao, quitarPendencia } from '../actions'

const FORMAS_PGTO = ['Pix', 'Dinheiro', 'Débito', 'Crédito']

const MESES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

type ListProps = {
  transactions: TransactionRow[]
  cardPurchases: CardPurchaseRow[]
  envelopes: Envelope[]
  categories: Category[]
  mes: string
}

type ListEntry =
  | { kind: 'tx'; item: TransactionRow; sortKey: string }
  | { kind: 'cp'; item: CardPurchaseRow; sortKey: string }

export function TransacoesList({ transactions, cardPurchases, envelopes, categories, mes }: ListProps) {
  const [editTarget, setEditTarget] = useState<TransactionRow | null>(null)
  const [quitarTarget, setQuitarTarget] = useState<TransactionRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleDelete(tx: TransactionRow) {
    const msg =
      tx.status === 'pendente'
        ? 'Excluir este lançamento pendente? (sem reversão de saldo)'
        : 'Excluir este lançamento e reverter o saldo?'
    if (!confirm(msg)) return
    setDeletingId(tx.id)
    setDeleteError(null)
    startTransition(async () => {
      const result = await deletarTransacao(tx.id)
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

  // Pendentes primeiro (por data_vencimento asc), depois efetivados por data desc
  const pendentes = transactions
    .filter((tx) => tx.status === 'pendente')
    .sort((a, b) => (a.data_vencimento ?? a.data).localeCompare(b.data_vencimento ?? b.data))

  const efetivadas = transactions.filter((tx) => tx.status === 'efetivada')

  const efetivadosEntries: ListEntry[] = [
    ...efetivadas.map((tx) => ({ kind: 'tx' as const, item: tx, sortKey: tx.created_at })),
    ...cardPurchases.map((cp) => ({ kind: 'cp' as const, item: cp, sortKey: cp.created_at })),
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey))

  const [y, mo] = mes.split('-').map(Number)
  const mesLabel = `${MESES_PT[mo - 1]} de ${y}`

  return (
    <section className="pb-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {mesLabel}
      </h2>

      {deleteError && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {deleteError}
        </p>
      )}

      {pendentes.length === 0 && efetivadosEntries.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-400">
          Nenhum lançamento este mês. Registre o primeiro acima!
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {/* Pendentes primeiro */}
          {pendentes.map((tx) => (
            <PendingTransactionItem
              key={`tx-${tx.id}`}
              tx={tx}
              isDeleting={deletingId === tx.id && pending}
              onQuitar={() => setQuitarTarget(tx)}
              onDelete={() => handleDelete(tx)}
            />
          ))}

          {/* Efetivados e compras no crédito */}
          {efetivadosEntries.map((entry) =>
            entry.kind === 'tx' ? (
              <TransactionItem
                key={`tx-${entry.item.id}`}
                tx={entry.item}
                isDeleting={deletingId === entry.item.id && pending}
                onEdit={() => setEditTarget(entry.item)}
                onDelete={() => handleDelete(entry.item)}
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

      {quitarTarget && (
        <QuitarSheet
          tx={quitarTarget}
          envelopes={envelopes}
          onClose={() => setQuitarTarget(null)}
        />
      )}
    </section>
  )
}

function PendingTransactionItem({
  tx,
  isDeleting,
  onQuitar,
  onDelete,
}: {
  tx: TransactionRow
  isDeleting: boolean
  onQuitar: () => void
  onDelete: () => void
}) {
  const isReceita = tx.tipo === 'receita'
  const vencStr = tx.data_vencimento
    ? new Date(tx.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      })
    : null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const vencDate = tx.data_vencimento ? new Date(tx.data_vencimento + 'T12:00:00') : null
  const isVencida = vencDate && vencDate < today

  const label = tx.descricao || tx.categories?.nome || (isReceita ? 'Receita' : 'Despesa')

  return (
    <li
      className={`rounded-xl bg-white shadow-sm ring-1 ring-amber-200 transition ${
        isDeleting ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-lg">
          {tx.categories?.emoji ?? (isReceita ? '💰' : '💸')}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-zinc-900">{label}</p>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                isVencida
                  ? 'bg-red-100 text-red-600'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isVencida ? 'Vencida' : 'Pendente'}
            </span>
          </div>
          <p className="truncate text-xs text-zinc-400">
            {[tx.envelopes?.nome, vencStr ? `Vence ${vencStr}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        <span
          className={`shrink-0 text-sm font-bold ${
            isReceita ? 'text-green-600' : 'text-red-600'
          } opacity-60`}
        >
          {isReceita ? '+' : '-'}
          {brl(tx.valor)}
        </span>
      </div>

      {/* Ações pendente */}
      <div className="flex border-t border-amber-100 divide-x divide-amber-100">
        <button
          type="button"
          onClick={onQuitar}
          disabled={isDeleting}
          className="flex-1 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition disabled:opacity-40 rounded-bl-xl"
        >
          Quitar agora
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex-1 py-2 text-xs font-medium text-zinc-500 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40 rounded-br-xl"
        >
          Excluir
        </button>
      </div>
    </li>
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </li>
  )
}

function QuitarSheet({
  tx,
  envelopes,
  onClose,
}: {
  tx: TransactionRow
  envelopes: Envelope[]
  onClose: () => void
}) {
  const defaultEnvId = tx.envelope_id ?? envelopes[0]?.id ?? ''
  const [envelopeId, setEnvelopeId] = useState(defaultEnvId)
  const [dataEfetiva, setDataEfetiva] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function handleSubmit() {
    setError(null)
    if (!envelopeId) { setError('Selecione uma caixinha.'); return }
    if (!dataEfetiva) { setError('Informe a data.'); return }

    startTransition(async () => {
      const result = await quitarPendencia(tx.id, envelopeId, dataEfetiva)
      if (!result.ok) { setError(result.error); return }
      onClose()
    })
  }

  const isReceita = tx.tipo === 'receita'
  const label = tx.descricao || tx.categories?.nome || (isReceita ? 'Receita' : 'Despesa')

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="quitar-sheet-title" className="sheet-panel">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="quitar-sheet-title" className="text-base font-semibold text-zinc-900">
            Quitar pendência
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

        {/* Resumo do lançamento */}
        <div className="mb-4 rounded-xl bg-amber-50 px-3 py-3">
          <p className="text-sm font-medium text-zinc-800">{label}</p>
          <p className={`text-base font-bold ${isReceita ? 'text-green-600' : 'text-red-600'}`}>
            {isReceita ? '+' : '-'}{brl(tx.valor)}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Caixinha</label>
            <select
              value={envelopeId}
              onChange={(e) => setEnvelopeId(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Selecione…</option>
              {envelopes.map((env) => (
                <option key={env.id} value={env.id}>{env.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Data de quitação</label>
            <input
              type="date"
              value={dataEfetiva}
              onChange={(e) => setDataEfetiva(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
            className="rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
          >
            {pending ? 'Quitando…' : 'Confirmar quitação'}
          </button>
        </div>
      </div>
    </>
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
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="edit-sheet-title" className="sheet-panel">
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
