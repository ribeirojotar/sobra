'use client'

import { useState, useEffect, useTransition } from 'react'
import type { Category, DistributionRule, Envelope } from '@/lib/types'
import { lancarTransacao, distribuirReceita } from '../actions'
import { brl } from '@/lib/format'

type Props = {
  envelopes: Envelope[]
  categories: Category[]
  rules: DistributionRule[]
}

const FORMAS_PGTO = ['Pix', 'Dinheiro', 'Débito', 'Crédito']

function normalize(s: string) {
  // remove combining diacritics (accents), then non-alphanumeric
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, '')
}

function suggestCategory(description: string, cats: Category[]): Category | null {
  if (!description.trim()) return null
  const desc = normalize(description)
  const descWords = desc.split(/\s+/).filter((w) => w.length > 2)
  if (!descWords.length) return null

  for (const cat of cats) {
    const catWords = normalize(cat.nome)
      .split(/[\s/]+/)
      .filter((w) => w.length > 2)
    if (catWords.some((w) => descWords.some((dw) => dw.includes(w) || w.includes(dw)))) {
      return cat
    }
  }
  return null
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function LancarForm({ envelopes, categories, rules }: Props) {
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(todayStr)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [envelopeId, setEnvelopeId] = useState<string | null>(null)
  const [userPickedCat, setUserPickedCat] = useState(false)
  const [distribuir, setDistribuir] = useState(false)
  const [ruleId, setRuleId] = useState<string | null>(rules[0]?.id ?? null)
  const [formaPgto, setFormaPgto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  const filteredCats = categories.filter((c) => c.tipo === tipo)

  // Sugestão de categoria por palavra-chave
  useEffect(() => {
    if (userPickedCat) return
    const suggested = suggestCategory(descricao, filteredCats)
    setCategoryId(suggested?.id ?? null)
  }, [descricao, tipo, userPickedCat, filteredCats])

  // Caixinha padrão da categoria selecionada
  useEffect(() => {
    if (!categoryId) return
    const cat = categories.find((c) => c.id === categoryId)
    if (cat?.envelope_padrao_id) setEnvelopeId(cat.envelope_padrao_id)
  }, [categoryId, categories])

  function resetForm() {
    setValor('')
    setDescricao('')
    setData(todayStr())
    setCategoryId(null)
    setEnvelopeId(null)
    setUserPickedCat(false)
    setDistribuir(false)
    setFormaPgto('')
    setError(null)
  }

  function handleTipoChange(t: 'receita' | 'despesa') {
    setTipo(t)
    setCategoryId(null)
    setEnvelopeId(null)
    setUserPickedCat(false)
    setDistribuir(false)
  }

  function selectCategory(id: string) {
    setCategoryId(id === categoryId ? null : id)
    setUserPickedCat(true)
    if (id !== categoryId) {
      const cat = categories.find((c) => c.id === id)
      if (cat?.envelope_padrao_id) setEnvelopeId(cat.envelope_padrao_id)
    }
  }

  function handleSubmit() {
    setError(null)
    const valorNum = Number(valor.replace(',', '.'))
    if (!valorNum || valorNum <= 0) {
      setError('Informe um valor válido.')
      return
    }
    if (!distribuir && !envelopeId) {
      setError('Selecione uma caixinha.')
      return
    }
    if (distribuir && !ruleId) {
      setError('Selecione uma regra de distribuição.')
      return
    }

    const fd = new FormData()
    fd.set('tipo', tipo)
    fd.set('valor', valor.replace(',', '.'))
    fd.set('descricao', descricao)
    fd.set('data', data)
    if (categoryId) fd.set('category_id', categoryId)
    if (formaPgto) fd.set('forma_pgto', formaPgto)

    startTransition(async () => {
      let result
      if (distribuir) {
        fd.set('rule_id', ruleId!)
        result = await distribuirReceita(fd)
      } else {
        fd.set('envelope_id', envelopeId!)
        result = await lancarTransacao(fd)
      }

      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess(true)
      resetForm()
      setTimeout(() => setSuccess(false), 2500)
    })
  }

  const selectedRule = rules.find((r) => r.id === ruleId)
  const valorNum = Number(valor.replace(',', '.')) || 0

  return (
    <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
      {/* Toggle tipo */}
      <div className="mb-4 flex rounded-xl bg-zinc-100 p-1">
        {(['despesa', 'receita'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTipoChange(t)}
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
      <div className="mb-3">
        <input
          type="text"
          inputMode="decimal"
          placeholder="R$ 0,00"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-2xl font-bold text-zinc-900 outline-none placeholder:text-zinc-300 transition focus:border-blue-500"
        />
      </div>

      {/* Descrição */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Descrição (ex.: mercado, ifood…)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none placeholder:text-zinc-400 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Chips de categoria */}
      {filteredCats.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-medium text-zinc-400">Categoria</p>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {filteredCats.map((cat) => {
              const active = categoryId === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selectCategory(cat.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? tipo === 'despesa'
                        ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
                        : 'bg-green-100 text-green-700 ring-1 ring-green-300'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {cat.emoji ? `${cat.emoji} ` : ''}
                  {cat.nome}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Caixinha (somente quando não está distribuindo) */}
      {!distribuir && (
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Caixinha</label>
          <select
            value={envelopeId ?? ''}
            onChange={(e) => setEnvelopeId(e.target.value || null)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Selecione…</option>
            {envelopes.map((env) => (
              <option key={env.id} value={env.id}>
                {env.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Distribuir nas caixinhas (só para receita com regras cadastradas) */}
      {tipo === 'receita' && rules.length > 0 && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setDistribuir((v) => !v)}
            className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
              distribuir
                ? 'border-green-300 bg-green-50 text-green-700'
                : 'border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-zinc-300'
            }`}
          >
            <span className="text-base leading-none">{distribuir ? '✓' : '↗'}</span>
            Distribuir nas caixinhas
          </button>
        </div>
      )}

      {/* Prévia da distribuição */}
      {distribuir && selectedRule && (
        <div className="mb-3 rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="mb-2 text-xs font-semibold text-green-800">{selectedRule.nome}</p>
          <div className="flex flex-col gap-0.5">
            {selectedRule.alocacoes.map((a) => {
              const env = envelopes.find((e) => e.id === a.envelope_id)
              return (
                <div key={a.envelope_id} className="flex items-center justify-between">
                  <span className="text-xs text-green-800">
                    {env?.nome ?? a.envelope_id} ({a.pct}%)
                  </span>
                  <span className="text-xs font-semibold text-green-800">
                    {valorNum > 0 ? brl((valorNum * a.pct) / 100) : '—'}
                  </span>
                </div>
              )
            })}
          </div>
          {rules.length > 1 && (
            <select
              value={ruleId ?? ''}
              onChange={(e) => setRuleId(e.target.value || null)}
              className="mt-2 w-full rounded-lg border border-green-300 bg-white px-2 py-1.5 text-xs outline-none"
            >
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Data + Forma de pagamento */}
      <div className="mb-4 flex gap-2">
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        <select
          value={formaPgto}
          onChange={(e) => setFormaPgto(e.target.value)}
          className="flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Forma…</option>
          {FORMAS_PGTO.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {/* Feedback */}
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          Lançamento registrado!
        </p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending}
        className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${
          tipo === 'despesa' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {pending
          ? 'Registrando…'
          : tipo === 'despesa'
            ? 'Registrar despesa'
            : distribuir
              ? 'Distribuir receita'
              : 'Registrar receita'}
      </button>
    </div>
  )
}
