'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SaveResult = { ok: true } | { ok: false; error: string } | null

/** Create (no id) or rename/recolor/re-meta (with id hidden field). */
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
    // Edit: only nome, cor, meta are mutable (saldo never updated here)
    const { error } = await supabase
      .from('envelopes')
      .update({ nome, cor, meta })
      .eq('id', id)

    if (error) return { ok: false, error: error.message }
  } else {
    // Create
    const tipo = (formData.get('tipo') as string | null) || 'custom'
    const { error } = await supabase
      .from('envelopes')
      .insert({ nome, tipo, cor, meta })

    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/plano')
  return { ok: true }
}

/** Toggle ativo/inativo. Saldo is untouched. */
export async function toggleAtivo(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const ativo = formData.get('ativo') === 'true'

  const supabase = await createClient()
  await supabase.from('envelopes').update({ ativo: !ativo }).eq('id', id)

  revalidatePath('/plano')
}
