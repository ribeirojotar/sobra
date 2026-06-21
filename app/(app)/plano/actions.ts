'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SaveResult = { ok: true } | { ok: false; error: string } | null

// ─── Envelopes ───────────────────────────────────────────────────────────────

export async function saveEnvelope(
  _prev: SaveResult,
  formData: FormData,
): Promise<SaveResult> {
  const id = (formData.get('id') as string | null) || null
  const nome = (formData.get('nome') as string | null)?.trim()
  const cor = (formData.get('cor') as string | null) || null
  const metaRaw = (formData.get('meta') as string | null)?.replace(',', '.').trim()
  const meta = metaRaw ? Number(metaRaw) : null

  if (!nome) return { ok: false, error: 'Nome é obrigatório.' }
  if (meta !== null && isNaN(meta)) return { ok: false, error: 'Meta inválida.' }

  const supabase = await createClient()

  if (id) {
    const { error } = await supabase
      .from('envelopes')
      .update({ nome, cor, meta })
      .eq('id', id)
    if (error) return { ok: false, error: error.message }
  } else {
    const tipo = (formData.get('tipo') as string | null) || 'custom'
    const { error } = await supabase.from('envelopes').insert({ nome, tipo, cor, meta })
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/plano')
  return { ok: true }
}

export async function toggleAtivo(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const ativo = formData.get('ativo') === 'true'
  const supabase = await createClient()
  await supabase.from('envelopes').update({ ativo: !ativo }).eq('id', id)
  revalidatePath('/plano')
}

// ─── Rendas (income_sources) ──────────────────────────────────────────────────

export async function saveRenda(
  _prev: SaveResult,
  formData: FormData,
): Promise<SaveResult> {
  const id = (formData.get('id') as string | null) || null
  const nome = (formData.get('nome') as string | null)?.trim()
  const tipo = (formData.get('tipo') as string | null) || 'variavel'
  const valorRaw = (formData.get('valor_estimado') as string | null)?.replace(',', '.').trim()
  const valor_estimado = valorRaw ? Number(valorRaw) : 0
  const diaRaw = (formData.get('dia_recebimento') as string | null)?.trim()
  const dia_recebimento = diaRaw ? Number(diaRaw) : null

  if (!nome) return { ok: false, error: 'Nome é obrigatório.' }
  if (isNaN(valor_estimado) || valor_estimado < 0)
    return { ok: false, error: 'Valor inválido.' }
  if (dia_recebimento !== null && (isNaN(dia_recebimento) || dia_recebimento < 1 || dia_recebimento > 31))
    return { ok: false, error: 'Dia inválido (1–31).' }

  const supabase = await createClient()

  if (id) {
    const { error } = await supabase
      .from('income_sources')
      .update({ nome, tipo, valor_estimado, dia_recebimento })
      .eq('id', id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('income_sources')
      .insert({ nome, tipo, valor_estimado, dia_recebimento })
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/plano')
  return { ok: true }
}

export async function toggleAtivoRenda(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const ativo = formData.get('ativo') === 'true'
  const supabase = await createClient()
  await supabase.from('income_sources').update({ ativo: !ativo }).eq('id', id)
  revalidatePath('/plano')
}

// ─── Despesas Fixas (recurring_expenses) ─────────────────────────────────────

export async function saveFixa(
  _prev: SaveResult,
  formData: FormData,
): Promise<SaveResult> {
  const id = (formData.get('id') as string | null) || null
  const nome = (formData.get('nome') as string | null)?.trim()
  const valorRaw = (formData.get('valor') as string | null)?.replace(',', '.').trim()
  const valor = valorRaw ? Number(valorRaw) : null
  const diaRaw = (formData.get('dia_vencimento') as string | null)?.trim()
  const dia_vencimento = diaRaw ? Number(diaRaw) : null

  if (!nome) return { ok: false, error: 'Nome é obrigatório.' }
  if (!valor || isNaN(valor) || valor <= 0) return { ok: false, error: 'Valor inválido.' }
  if (dia_vencimento !== null && (isNaN(dia_vencimento) || dia_vencimento < 1 || dia_vencimento > 31))
    return { ok: false, error: 'Dia inválido (1–31).' }

  const supabase = await createClient()

  if (id) {
    const { error } = await supabase
      .from('recurring_expenses')
      .update({ nome, valor, dia_vencimento })
      .eq('id', id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('recurring_expenses')
      .insert({ nome, valor, dia_vencimento })
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/plano')
  return { ok: true }
}

export async function toggleAtivoFixa(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const ativo = formData.get('ativo') === 'true'
  const supabase = await createClient()
  await supabase.from('recurring_expenses').update({ ativo: !ativo }).eq('id', id)
  revalidatePath('/plano')
}

// ─── Categorias ──────────────────────────────────────────────────────────────

export async function editarCategoria(
  _prev: SaveResult,
  formData: FormData,
): Promise<SaveResult> {
  const id = (formData.get('id') as string | null) || null
  const nome = (formData.get('nome') as string | null)?.trim()
  const emoji = (formData.get('emoji') as string | null)?.trim() || null

  if (!id) return { ok: false, error: 'ID inválido.' }
  if (!nome) return { ok: false, error: 'Nome é obrigatório.' }

  const supabase = await createClient()
  const { error } = await supabase.from('categories').update({ nome, emoji }).eq('id', id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/plano')
  revalidatePath('/lancar')
  return { ok: true }
}

export async function deletarCategoria(id: string): Promise<SaveResult> {
  if (!id) return { ok: false, error: 'ID inválido.' }

  const supabase = await createClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) {
    if (error.code === '23503')
      return { ok: false, error: 'Esta categoria tem lançamentos — remova-os primeiro.' }
    return { ok: false, error: error.message }
  }
  revalidatePath('/plano')
  revalidatePath('/lancar')
  return { ok: true }
}

// ─── Exportar JSON ────────────────────────────────────────────────────────────

export async function exportarDados(): Promise<
  { ok: true; data: object } | { ok: false; error: string }
> {
  const supabase = await createClient()

  const [
    { data: envelopes, error: e1 },
    { data: debts, error: e2 },
    { data: transactions, error: e3 },
    { data: income_sources, error: e4 },
    { data: recurring_expenses, error: e5 },
    { data: titulares, error: e6 },
    { data: categories, error: e7 },
    { data: distribution_rules, error: e8 },
    { data: debt_negotiations, error: e9 },
    { data: cards, error: e10 },
    { data: card_purchases, error: e11 },
    { data: card_installments, error: e12 },
  ] = await Promise.all([
    supabase.from('envelopes').select('*').order('ordem'),
    supabase.from('debts').select('*').order('ordem'),
    supabase.from('transactions').select('*').order('data', { ascending: false }),
    supabase.from('income_sources').select('*').order('created_at'),
    supabase.from('recurring_expenses').select('*').order('created_at'),
    supabase.from('titulares').select('*').order('nome'),
    supabase.from('categories').select('*').order('nome'),
    supabase.from('distribution_rules').select('*'),
    supabase.from('debt_negotiations').select('*').order('created_at'),
    supabase.from('cards').select('*').order('ordem'),
    supabase.from('card_purchases').select('*').order('created_at', { ascending: false }),
    supabase.from('card_installments').select('*').order('competencia').order('created_at'),
  ])

  const err = e1 ?? e2 ?? e3 ?? e4 ?? e5 ?? e6 ?? e7 ?? e8 ?? e9 ?? e10 ?? e11 ?? e12
  if (err) return { ok: false, error: err.message }

  return {
    ok: true,
    data: {
      exportedAt: new Date().toISOString(),
      envelopes,
      titulares,
      categories,
      distribution_rules,
      debts,
      debt_negotiations,
      income_sources,
      recurring_expenses,
      transactions,
      cards,
      card_purchases,
      card_installments,
    },
  }
}
