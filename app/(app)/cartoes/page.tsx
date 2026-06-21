import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { CardInstallmentDetail, Envelope } from '@/lib/types'
import { CartoesList } from './_components/CartoesList'

export const metadata: Metadata = { title: 'Cartões — Sobra' }

export default async function CartoesPage() {
  const supabase = await createClient()

  const today = new Date()
  const mesAtual = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10)

  const [{ data: cards }, { data: rawInstallments }, { data: envelopes }] = await Promise.all([
    supabase.from('cards').select('*').eq('ativo', true).order('ordem').order('nome'),
    supabase
      .from('card_installments')
      .select('id, card_id, purchase_id, numero, valor, competencia, status, card_purchases(descricao, parcelas)')
      .eq('status', 'em_aberto'),
    supabase.from('envelopes').select('*').eq('ativo', true).order('ordem'),
  ])

  const installments = (rawInstallments ?? []) as unknown as CardInstallmentDetail[]

  const statsMap: Record<string, { fatura_aberta: number; limite_usado: number }> = {}
  for (const inst of installments) {
    if (!statsMap[inst.card_id]) statsMap[inst.card_id] = { fatura_aberta: 0, limite_usado: 0 }
    statsMap[inst.card_id].limite_usado += Number(inst.valor)
    if (inst.competencia <= mesAtual) {
      statsMap[inst.card_id].fatura_aberta += Number(inst.valor)
    }
  }

  const cardsWithStats = (cards ?? []).map((c) => ({
    ...c,
    fatura_aberta: statsMap[c.id]?.fatura_aberta ?? 0,
    limite_usado: statsMap[c.id]?.limite_usado ?? 0,
  }))

  return (
    <main className="px-4 pt-6 pb-28">
      <CartoesList
        cards={cardsWithStats}
        installments={installments}
        envelopes={(envelopes ?? []) as Envelope[]}
        mesAtual={mesAtual}
      />
    </main>
  )
}
