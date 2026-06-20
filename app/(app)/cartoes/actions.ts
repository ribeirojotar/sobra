'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SaveResult = { ok: true } | { ok: false; error: string }

export async function saveCard(
  _prev: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  const id = (formData.get('id') as string | null) || null
  const nome = (formData.get('nome') as string | null)?.trim()
  const limiteRaw = (formData.get('limite') as string | null)?.replace(',', '.') ?? '0'
  const limite = Number(limiteRaw) || 0
  const diaVencRaw = (formData.get('dia_vencimento') as string | null)?.trim()
  const dia_vencimento = diaVencRaw ? Number(diaVencRaw) : null
  const jurosRaw = (formData.get('juros_rotativo') as string | null)?.replace(',', '.') ?? '0'
  const juros_rotativo = Number(jurosRaw) || 0
  const cor = (formData.get('cor') as string | null)?.trim() || null

  if (!nome) return { ok: false, error: 'Nome é obrigatório.' }
  if (isNaN(limite) || limite < 0) return { ok: false, error: 'Limite inválido.' }
  if (dia_vencimento !== null && (dia_vencimento < 1 || dia_vencimento > 31))
    return { ok: false, error: 'Dia de vencimento deve ser entre 1 e 31.' }
  if (isNaN(juros_rotativo) || juros_rotativo < 0)
    return { ok: false, error: 'Juros rotativos inválidos.' }

  const supabase = await createClient()

  if (id) {
    const { error } = await supabase
      .from('cards')
      .update({ nome, limite, dia_vencimento, juros_rotativo, cor })
      .eq('id', id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('cards')
      .insert({ nome, limite, dia_vencimento, juros_rotativo, cor })
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/cartoes')
  revalidatePath('/painel')
  return { ok: true }
}

export async function inativarCard(id: string): Promise<SaveResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('cards').update({ ativo: false }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/cartoes')
  revalidatePath('/painel')
  return { ok: true }
}
