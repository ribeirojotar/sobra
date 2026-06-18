'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SaveResult = { ok: true } | { ok: false; error: string }

export async function saveTitular(
  _prev: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  const id = (formData.get('id') as string | null) || null
  const nome = (formData.get('nome') as string | null)?.trim()
  const descricao = (formData.get('descricao') as string | null)?.trim() || null

  if (!nome) return { ok: false, error: 'Nome é obrigatório.' }

  const supabase = await createClient()
  if (id) {
    const { error } = await supabase.from('titulares').update({ nome, descricao }).eq('id', id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from('titulares').insert({ nome, descricao })
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/dividas')
  return { ok: true }
}

export async function saveDebt(
  _prev: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  const id = (formData.get('id') as string | null) || null
  const credor = (formData.get('credor') as string | null)?.trim()
  const descricao = (formData.get('descricao') as string | null)?.trim() || null
  const titular_id = (formData.get('titular_id') as string | null) || null

  const valor_original = Number(
    (formData.get('valor_original') as string | null)?.replace(',', '.') ?? '',
  )
  const juros_mensal = Number(
    (formData.get('juros_mensal') as string | null)?.replace(',', '.') ?? '0',
  ) || 0
  const parcela_min = Number(
    (formData.get('parcela_min') as string | null)?.replace(',', '.') ?? '0',
  ) || 0
  const status = (formData.get('status') as string | null) || 'a_negociar'
  const desconta_em_folha = formData.get('desconta_em_folha') === 'on'
  const elegivel_desenrola = formData.get('elegivel_desenrola') === 'on'
  const contratada_em = (formData.get('contratada_em') as string | null) || null
  const atraso_diasRaw = (formData.get('atraso_dias') as string | null)?.trim()
  const atraso_dias = atraso_diasRaw ? Number(atraso_diasRaw) : null

  if (!credor) return { ok: false, error: 'Credor é obrigatório.' }
  if (isNaN(valor_original) || valor_original < 0)
    return { ok: false, error: 'Valor original inválido.' }

  const supabase = await createClient()

  if (id) {
    // Edit: valor_atual is managed exclusively by RPCs; never update it directly
    const { error } = await supabase
      .from('debts')
      .update({
        credor,
        descricao,
        titular_id,
        valor_original,
        juros_mensal,
        parcela_min,
        status,
        desconta_em_folha,
        elegivel_desenrola,
        contratada_em,
        atraso_dias,
      })
      .eq('id', id)
    if (error) return { ok: false, error: error.message }
  } else {
    // Create: valor_atual starts equal to valor_original (user may override)
    const valor_atualRaw = (formData.get('valor_atual') as string | null)?.replace(',', '.')
    const valor_atual =
      valor_atualRaw && !isNaN(Number(valor_atualRaw))
        ? Number(valor_atualRaw)
        : valor_original

    const { error } = await supabase.from('debts').insert({
      credor,
      descricao,
      titular_id,
      valor_original,
      valor_atual,
      juros_mensal,
      parcela_min,
      status,
      desconta_em_folha,
      elegivel_desenrola,
      contratada_em,
      atraso_dias,
    })
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/dividas')
  revalidatePath('/painel')
  return { ok: true }
}

export async function deletarDivida(id: string): Promise<SaveResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('debts').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dividas')
  revalidatePath('/painel')
  return { ok: true }
}

export async function pagarDivida(formData: FormData): Promise<SaveResult> {
  const debt_id = (formData.get('debt_id') as string | null)?.trim()
  const envelope_id = (formData.get('envelope_id') as string | null)?.trim()
  const valorRaw = (formData.get('valor') as string | null)?.replace(',', '.') ?? ''
  const valor = Number(valorRaw)
  const data =
    (formData.get('data') as string | null) || new Date().toISOString().slice(0, 10)
  const descricao = (formData.get('descricao') as string | null)?.trim() || null
  const forma_pgto = (formData.get('forma_pgto') as string | null) || null

  if (!debt_id) return { ok: false, error: 'Dívida inválida.' }
  if (!envelope_id) return { ok: false, error: 'Selecione uma caixinha.' }
  if (isNaN(valor) || valor <= 0) return { ok: false, error: 'Valor inválido.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('registrar_lancamento', {
    p_tipo: 'despesa',
    p_valor: valor,
    p_envelope_id: envelope_id,
    p_category_id: null,
    p_data: data,
    p_descricao: descricao ?? `Pagamento de dívida`,
    p_forma_pgto: forma_pgto,
    p_debt_id: debt_id,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dividas')
  revalidatePath('/painel')
  revalidatePath('/lancar')
  return { ok: true }
}

export async function negociarDivida(formData: FormData): Promise<SaveResult> {
  const debt_id = (formData.get('debt_id') as string | null)?.trim()
  const valorRaw =
    (formData.get('valor_acordado') as string | null)?.replace(',', '.') ?? ''
  const valor_acordado = Number(valorRaw)
  const canal = (formData.get('canal') as string | null)?.trim() || null
  const obs = (formData.get('obs') as string | null)?.trim() || null

  if (!debt_id) return { ok: false, error: 'Dívida inválida.' }
  if (isNaN(valor_acordado) || valor_acordado < 0)
    return { ok: false, error: 'Valor acordado inválido.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('registrar_negociacao', {
    p_debt_id: debt_id,
    p_valor_acordado: valor_acordado,
    p_canal: canal,
    p_obs: obs,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dividas')
  revalidatePath('/painel')
  return { ok: true }
}
