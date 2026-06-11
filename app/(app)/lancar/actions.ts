'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function lancarTransacao(formData: FormData): Promise<ActionResult> {
  const tipo = formData.get('tipo') as 'receita' | 'despesa'
  const valorRaw = (formData.get('valor') as string | null)?.replace(',', '.') ?? ''
  const valor = Number(valorRaw)
  const envelope_id = (formData.get('envelope_id') as string | null) || null
  const category_id = (formData.get('category_id') as string | null) || null
  const data = (formData.get('data') as string | null) || new Date().toISOString().slice(0, 10)
  const descricao = (formData.get('descricao') as string | null)?.trim() || null
  const forma_pgto = (formData.get('forma_pgto') as string | null) || null
  const debt_id = (formData.get('debt_id') as string | null) || null

  if (!tipo || isNaN(valor) || valor <= 0) return { ok: false, error: 'Valor inválido.' }
  if (!envelope_id) return { ok: false, error: 'Selecione uma caixinha.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('registrar_lancamento', {
    p_tipo: tipo,
    p_valor: valor,
    p_envelope_id: envelope_id,
    p_category_id: category_id,
    p_data: data,
    p_descricao: descricao,
    p_forma_pgto: forma_pgto,
    p_debt_id: debt_id,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/lancar')
  revalidatePath('/painel')
  return { ok: true }
}

export async function distribuirReceita(formData: FormData): Promise<ActionResult> {
  const valorRaw = (formData.get('valor') as string | null)?.replace(',', '.') ?? ''
  const valor = Number(valorRaw)
  const rule_id = (formData.get('rule_id') as string | null) || null
  const income_source_id = (formData.get('income_source_id') as string | null) || null
  const data = (formData.get('data') as string | null) || new Date().toISOString().slice(0, 10)
  const descricao = (formData.get('descricao') as string | null)?.trim() || null

  if (isNaN(valor) || valor <= 0) return { ok: false, error: 'Valor inválido.' }
  if (!rule_id) return { ok: false, error: 'Selecione uma regra de distribuição.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('distribuir_receita', {
    p_valor: valor,
    p_rule_id: rule_id,
    p_income_source_id: income_source_id,
    p_data: data,
    p_descricao: descricao,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/lancar')
  revalidatePath('/painel')
  return { ok: true }
}

export async function deletarTransacao(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('cancelar_lancamento', {
    p_transaction_id: id,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/lancar')
  revalidatePath('/painel')
  return { ok: true }
}

export async function editarTransacao(formData: FormData): Promise<ActionResult> {
  const id = formData.get('id') as string
  const tipo = formData.get('tipo') as 'receita' | 'despesa'
  const valorRaw = (formData.get('valor') as string | null)?.replace(',', '.') ?? ''
  const valor = Number(valorRaw)
  const envelope_id = (formData.get('envelope_id') as string | null) || null
  const category_id = (formData.get('category_id') as string | null) || null
  const data = (formData.get('data') as string | null) || new Date().toISOString().slice(0, 10)
  const descricao = (formData.get('descricao') as string | null)?.trim() || null
  const forma_pgto = (formData.get('forma_pgto') as string | null) || null

  if (!id) return { ok: false, error: 'ID inválido.' }
  if (isNaN(valor) || valor <= 0) return { ok: false, error: 'Valor inválido.' }
  if (!envelope_id) return { ok: false, error: 'Selecione uma caixinha.' }

  const supabase = await createClient()

  // Cancela o lançamento original (reverte o saldo) e recria com os novos valores
  const { error: cancelError } = await supabase.rpc('cancelar_lancamento', {
    p_transaction_id: id,
  })
  if (cancelError) return { ok: false, error: cancelError.message }

  const { error } = await supabase.rpc('registrar_lancamento', {
    p_tipo: tipo,
    p_valor: valor,
    p_envelope_id: envelope_id,
    p_category_id: category_id,
    p_data: data,
    p_descricao: descricao,
    p_forma_pgto: forma_pgto,
    p_debt_id: null,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/lancar')
  revalidatePath('/painel')
  return { ok: true }
}
