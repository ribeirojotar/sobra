'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import type { Card, Category, DistributionRule, Envelope } from '@/lib/types'
import { lancarTransacao, distribuirReceita, registrarCompraCartao, criarCategoria } from '../actions'
import { brl } from '@/lib/format'

type Props = {
  envelopes: Envelope[]
  categories: Category[]
  rules: DistributionRule[]
  cards: Card[]
}

const FORMAS_PGTO = ['Pix', 'Dinheiro', 'Débito', 'Crédito']

function normalize(s: string) {
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

function nextMonthStr() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function LancarForm({ envelopes, categories, rules, cards }: Props) {
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
  // Credit-specific
  const [cardId, setCardId] = useState<string | null>(null)
  const [parcelas, setParcelas] = useState(1)
  const [primeiraParcelaEm, setPrimeiraParcelaEm] = useState(nextMonthStr)
  // Category creation
  const [extraCats, setExtraCats] = useState<Category[]>([])
  const [creatingCat, setCreatingCat] = useState(false)
  const [newCatNome, setNewCatNome] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('')
  const [catPending, startCatTransition] = useTransition()
  // Form state
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const isCredito = tipo === 'despesa' && formaPgto === 'Crédito'
  const baseCats = categories.filter((c) => c.tipo === tipo)
  const serverCatIds = new Set(baseCats.map((c) => c.id))
  const filteredCats = [...baseCats, ...extraCats.filter((c) => c.tipo === tipo && !serverCatIds.has(c.id))]

  useEffect(() => {
    if (userPickedCat) return
    const suggested = suggestCategory(descricao, filteredCats)
    setCategoryId(suggested?.id ?? null)
  }, [descricao, tipo, userPickedCat]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!categoryId || isCredito) return
    const cat = [...categories, ...extraCats].find((c) => c.id === categoryId)
    if (cat?.envelope_padrao_id) setEnvelopeId(cat.envelope_padrao_id)
  }, [categoryId, categories, extraCats, isCredito])

  function resetForm() {
    setValor('')
    setDescricao('')
    setData(todayStr())
    setCategoryId(null)
    setEnvelopeId(null)
    setUserPickedCat(false)
    setDistribuir(false)
    setFormaPgto('')
    setCardId(null)
    setParcelas(1)
    setPrimeiraParcelaEm(nextMonthStr())
    setCreatingCat(false)
    setNewCatNome('')
    setNewCatEmoji('')
    setError(null)
  }

  function handleTipoChange(t: 'receita' | 'despesa') {
    setTipo(t)
    setCategoryId(null)
    setEnvelopeId(null)
    setUserPickedCat(false)
    setDistribuir(false)
    if (t === 'receita') setFormaPgto('')
    setCreatingCat(false)
    setNewCatNome('')
    setNewCatEmoji('')
  }

  function selectCategory(id: string) {
    setCategoryId(id === categoryId ? null : id)
    setUserPickedCat(true)
    if (id !== categoryId && !isCredito) {
      const cat = [...categories, ...extraCats].find((c) => c.id === id)
      if (cat?.envelope_padrao_id) setEnvelopeId(cat.envelope_padrao_id)
    }
  }

  function handleSaveCategory() {
    if (!newCatNome.trim()) return
    startCatTransition(async () => {
      const result = await criarCategoria(newCatNome.trim(), newCatEmoji.trim() || null, tipo)
      if (!result.ok) { setError(result.error); return }
      setExtraCats((prev) => [...prev, result.category])
      setCategoryId(result.category.id)
      setUserPickedCat(true)
      setCreatingCat(false)
      setNewCatNome('')
      setNewCatEmoji('')
    })
  }

  function handleSubmit() {
    setError(null)
    const valorNum = Number(valor.replace(',', '.'))
    if (!valorNum || valorNum <= 0) { setError('Informe um valor válido.'); return }

    if (isCredito) {
      if (!cardId) { setError('Selecione um cartão.'); return }
      if (parcelas < 1) { setError('Número de parcelas inválido.'); return }
    } else {
      if (!distribuir && !envelopeId) { setError('Selecione uma caixinha.'); return }
      if (distribuir && !ruleId) { setError('Selecione uma regra de distribuição.'); return }
    }

    const fd = new FormData()
    fd.set('tipo', tipo)
    fd.set('valor', valor.replace(',', '.'))
    fd.set('descricao', descricao)
    fd.set('data', data)
    if (categoryId) fd.set('category_id', categoryId)
    if (formaPgto) fd.set('forma_pgto', formaPgto)

    startTransition(async () => {
      if (isCredito) {
        fd.set('card_id', cardId!)
        fd.set('parcelas', String(parcelas))
        fd.set('competencia_inicial', `${primeiraParcelaEm}-01`)
        const result = await registrarCompraCartao(fd)
        if (!result.ok) { setError(result.error); return }
        const parcelasStr =
          result.parcelas === 1
            ? 'à vista'
            : `${result.parcelas}x de ${brl(result.valorParcela)}`
        setSuccess(`Lançado na fatura do ${result.cardNome} · ${parcelasStr}`)
        resetForm()
        setTimeout(() => setSuccess(null), 3500)
      } else {
        let result
        if (distribuir) {
          fd.set('rule_id', ruleId!)
          result = await distribuirReceita(fd)
        } else {
          fd.set('envelope_id', envelopeId!)
          result = await lancarTransacao(fd)
        }
        if (!result.ok) { setError(result.error); return }
        setSuccess('Lançamento registrado!')
        resetForm()
        setTimeout(() => setSuccess(null), 2500)
      }
    })
  }

  const selectedRule = rules.find((r) => r.id === ruleId)
  const valorNum = Number(valor.replace(',', '.')) || 0

  // Derived button color (used inline to guarantee rendering regardless of Tailwind scan)
  const btnColor = isCredito ? '#9333ea' : tipo === 'despesa' ? '#dc2626' : '#16a34a'
  const btnLabel = pending
    ? 'Registrando…'
    : isCredito
      ? 'Lançar no crédito'
      : tipo === 'despesa'
        ? 'Registrar despesa'
        : distribuir
          ? 'Distribuir receita'
          : 'Registrar receita'

  return (
    <>
      {/* Form card */}
      <div className="mb-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
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

        {/* Chips de categoria + "+ Nova" */}
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
            {!creatingCat && (
              <button
                type="button"
                onClick={() => setCreatingCat(true)}
                className="shrink-0 rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 transition"
              >
                + Nova
              </button>
            )}
          </div>

          {/* Mini-formulário de nova categoria */}
          {creatingCat && (
            <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="mb-2 text-xs font-semibold text-blue-800">
                Nova categoria · {tipo === 'despesa' ? 'Despesa' : 'Receita'}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="😊"
                  value={newCatEmoji}
                  onChange={(e) => setNewCatEmoji(e.target.value)}
                  maxLength={2}
                  className="w-12 rounded-lg border border-blue-200 bg-white px-2 py-2 text-center text-base outline-none focus:border-blue-400"
                />
                <input
                  type="text"
                  placeholder="Nome da categoria"
                  value={newCatNome}
                  onChange={(e) => setNewCatNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCategory() }}
                  autoFocus
                  className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setCreatingCat(false); setNewCatNome(''); setNewCatEmoji('') }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-blue-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCategory}
                  disabled={catPending || !newCatNome.trim()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50"
                >
                  {catPending ? 'Criando…' : 'Criar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Campos de crédito (só despesa + Crédito) */}
        {isCredito && (
          <div className="mb-3 flex flex-col gap-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
            {cards.length === 0 ? (
              <p className="text-sm text-purple-700">
                Nenhum cartão cadastrado.{' '}
                <Link href="/cartoes" className="font-semibold underline">
                  Cadastre um cartão primeiro
                </Link>
                .
              </p>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-purple-700">Cartão</label>
                  <select
                    value={cardId ?? ''}
                    onChange={(e) => setCardId(e.target.value || null)}
                    className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-sm text-zinc-700 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  >
                    <option value="">Selecione…</option>
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-purple-700">Parcelas</label>
                    <input
                      type="number"
                      min={1}
                      value={parcelas}
                      onChange={(e) => setParcelas(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-purple-700">1ª parcela em</label>
                    <input
                      type="month"
                      value={primeiraParcelaEm}
                      onChange={(e) => setPrimeiraParcelaEm(e.target.value)}
                      className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    />
                  </div>
                </div>

                {valorNum > 0 && parcelas > 1 && (
                  <p className="text-xs text-purple-600">
                    {parcelas}x de {brl(Math.round((valorNum / parcelas) * 100) / 100)}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Caixinha (oculta quando crédito) */}
        {!isCredito && !distribuir && (
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

        {/* Distribuir (só para receita com regras) */}
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
        <div className="flex gap-2">
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

        {/* Feedback inline */}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            {success}
          </p>
        )}
      </div>

      {/* Botão sticky — fica colado acima da BottomNav ao rolar */}
      <div className="sticky bottom-16 z-40 -mx-4 border-t border-zinc-100 bg-white px-4 pb-3 pt-3 shadow-[0_-2px_8px_-2px_rgba(0,0,0,0.07)] mb-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || (isCredito && cards.length === 0)}
          style={{ backgroundColor: btnColor }}
          className="w-full rounded-xl py-3.5 text-sm font-semibold text-white shadow-sm transition active:opacity-90 disabled:opacity-50"
        >
          {btnLabel}
        </button>
      </div>
    </>
  )
}
