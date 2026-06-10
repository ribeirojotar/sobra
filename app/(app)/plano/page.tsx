import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Envelope } from '@/lib/types'
import { CaixinhasSection } from './_components/CaixinhasSection'

export const metadata: Metadata = { title: 'Plano — Sobra' }

export default async function PlanoPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('envelopes')
    .select('id, nome, tipo, saldo, meta, cor, ordem, ativo, created_at')
    .order('ordem', { ascending: true })

  const envelopes: Envelope[] = data ?? []
  if (error) console.error('envelopes fetch error', error)

  return (
    <main className="px-4 pt-6">
      <h1 className="mb-6 text-xl font-bold text-zinc-900">Plano</h1>
      <CaixinhasSection envelopes={envelopes} />
    </main>
  )
}
