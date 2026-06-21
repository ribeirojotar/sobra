'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import type { Category } from '@/lib/types'
import { editarCategoria, deletarCategoria } from '../actions'

export function CategoriasSection({ categories }: { categories: Category[] }) {
  const despesas = categories.filter((c) => c.tipo === 'despesa')
  const receitas = categories.filter((c) => c.tipo === 'receita')

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold text-zinc-900">Categorias</h2>

      {categories.length === 0 && (
        <p className="py-6 text-center text-sm text-zinc-400">
          Nenhuma categoria. Crie uma ao lançar.
        </p>
      )}

      {despesas.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Despesa</p>
          <ul className="flex flex-col gap-2">
            {despesas.map((cat) => (
              <CategoryRow key={cat.id} cat={cat} />
            ))}
          </ul>
        </div>
      )}

      {receitas.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Receita</p>
          <ul className="flex flex-col gap-2">
            {receitas.map((cat) => (
              <CategoryRow key={cat.id} cat={cat} />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function CategoryRow({ cat }: { cat: Category }) {
  const [editing, setEditing] = useState(false)
  const [nome, setNome] = useState(cat.nome)
  const [emoji, setEmoji] = useState(cat.emoji ?? '')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [editPending, startEditTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function handleSave() {
    setEditError(null)
    const fd = new FormData()
    fd.set('id', cat.id)
    fd.set('nome', nome)
    fd.set('emoji', emoji)
    startEditTransition(async () => {
      const result = await editarCategoria(null, fd)
      if (!result || !result.ok) {
        setEditError(result?.error ?? 'Erro ao salvar.')
        return
      }
      setEditing(false)
    })
  }

  function handleDelete() {
    if (!confirm(`Remover a categoria "${cat.nome}"?`)) return
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deletarCategoria(cat.id)
      if (!result || !result.ok) setDeleteError(result?.error ?? 'Erro ao remover.')
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setEditing(false); setNome(cat.nome); setEmoji(cat.emoji ?? '') }
  }

  if (editing) {
    return (
      <li className="rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-blue-200">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="😊"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={2}
            className="w-11 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-base outline-none focus:border-blue-400"
          />
          <input
            ref={inputRef}
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={editPending || !nome.trim()}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
          >
            {editPending ? '…' : 'OK'}
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setNome(cat.nome); setEmoji(cat.emoji ?? '') }}
            className="rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-600"
          >
            ✕
          </button>
        </div>
        {editError && (
          <p className="mt-1.5 text-xs text-red-600">{editError}</p>
        )}
      </li>
    )
  }

  return (
    <li className={`flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-zinc-100 ${deletePending ? 'opacity-40' : ''}`}>
      <span className="size-7 flex shrink-0 items-center justify-center rounded-full bg-zinc-100 text-base">
        {cat.emoji ?? '🏷️'}
      </span>
      <span className="flex-1 text-sm font-medium text-zinc-800">{cat.nome}</span>
      {deleteError && (
        <span className="text-xs text-red-500 max-w-[120px] text-right leading-tight">{deleteError}</span>
      )}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Editar ${cat.nome}`}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deletePending}
          aria-label={`Remover ${cat.nome}`}
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
