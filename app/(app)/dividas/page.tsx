import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DividasList } from './_components/DividasList'

export const metadata: Metadata = { title: 'Dívidas — Sobra' }

export default async function DividasPage() {
  const supabase = await createClient()

  const [{ data: debts }, { data: titulares }, { data: envelopes }] = await Promise.all([
    supabase
      .from('debts')
      .select('*, titulares(nome)')
      .order('ordem')
      .order('created_at'),
    supabase.from('titulares').select('*').order('nome'),
    supabase.from('envelopes').select('*').eq('ativo', true).order('ordem'),
  ])

  const dividasEnvelope = envelopes?.find((e) => e.tipo === 'dividas') ?? null

  return (
    <main className="px-4 pt-6 pb-28">
      <DividasList
        debts={debts ?? []}
        titulares={titulares ?? []}
        envelopes={envelopes ?? []}
        dividasEnvelope={dividasEnvelope}
      />
    </main>
  )
}
