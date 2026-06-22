'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { ok: true } | { ok: false; error: string }

export type CompraResult =
  | { ok: true; cardNome: string; parcelas: number; valorParcela: number }
  | { ok: false; error: string }

export async function registrarCompraCartao(formData: FormData): Promise<CompraResult> {
  const card_id = (formData.get('card_id') as string | null) || null
  const descricao = (formData.get('descricao') as string | null)?.trim() || null
  const category_id = (formData.get('category_id') as string | null) || null
  const valorRaw = (formData.get('valor') as string | null)?.replace(',', '.') ?? ''
  const valor_total = Number(valorRaw)
  const parcelas = Number(formData.get('parcelas') ?? 1)
  const data_compra = (formData.get('data') as string | null) || new Date().toISOString().slice(0, 10)
  const competencia_inicial = (formData.get('competencia_inicial') as string | null) || null

  if (!card_id) return { ok: false, error: 'Selecione um cartão.' }
  if (isNaN(valor_total) || valor_total <= 0) return { ok: false, error: 'Valor inválido.' }
  if (!competencia_inicial) return { ok: false, error: 'Selecione o mês da 1ª parcela.' }
  if (!Number.isInteger(parcelas) || parcelas < 1) return { ok: false, error: 'Número de parcelas inválido.' }

  const supabase = await createClient()
  const { data: card } = await supabase.from('cards').select('nome').eq('id', card_id).single()

  const { error } = await supabase.rpc('registrar_compra_cartao', {
    p_card_id: card_id,
    p_descricao: descricao,
    p_category_id: category_id,
    p_valor_total: valor_total,
    p_parcelas: parcelas,
    p_data_compra: data_compra,
    p_competencia_inicial: competencia_inicial,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/lancar')
  revalidatePath('/painel')
  revalidatePath('/cartoes')
  const valorParcela = Math.round((valor_total / parcelas) * 100) / 100
  return { ok: true, cardNome: card?.nome ?? 'cartão', parcelas, valorParcela }
}

export async function cancelarCompraCartao(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('cancelar_compra_cartao', { p_purchase_id: id })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/lancar')
  revalidatePath('/painel')
  revalidatePath('/cartoes')
  return { ok: true }
}

export type CriarCategoriaResult =
  | { ok: true; category: import('@/lib/types').Category }
  | { ok: false; error: string }

export async function criarCategoria(
  nome: string,
  emoji: string | null,
  tipo: 'receita' | 'despesa',
): Promise<CriarCategoriaResult> {
  const nome_trim = nome.trim()
  if (!nome_trim) return { ok: false, error: 'Nome é obrigatório.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .insert({ nome: nome_trim, emoji: emoji || null, tipo })
    .select('id, nome, emoji, tipo, envelope_padrao_id, created_at')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidatePath('/lancar')
  revalidatePath('/plano')
  return { ok: true, category: data as import('@/lib/types').Category }
}

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
  const status = (formData.get('status') as string | null) || 'efetivada'
  const data_vencimento = (formData.get('data_vencimento') as string | null) || null

  if (!tipo || isNaN(valor) || valor <= 0) return { ok: false, error: 'Valor inválido.' }
  if (!envelope_id) return { ok: false, error: 'Selecione uma caixinha.' }
  if (status === 'pendente' && !data_vencimento) return { ok: false, error: 'Informe a data de vencimento.' }

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
    p_status: status,
    p_data_vencimento: status === 'pendente' ? data_vencimento : null,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/lancar')
  revalidatePath('/painel')
  return { ok: true }
}

export async function quitarPendencia(
  transaction_id: string,
  envelope_id: string,
  data_efetiva: string,
): Promise<ActionResult> {
  if (!transaction_id || !envelope_id || !data_efetiva) {
    return { ok: false, error: 'Dados incompletos.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('quitar_pendencia', {
    p_transaction_id: transaction_id,
    p_envelope_id: envelope_id,
    p_data_efetiva: data_efetiva,
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
