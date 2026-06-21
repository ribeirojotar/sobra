import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Card, CardPurchaseRow, Category, DistributionRule, Envelope, TransactionRow } from '@/lib/types'
import { LancarForm } from './_components/LancarForm'
import { TransacoesList } from './_components/TransacoesList'

export const metadata: Metadata = { title: 'Lançar — Sobra' }

export default async function LancarPage() {
  const supabase = await createClient()

  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

  const [
    { data: envelopes },
    { data: categories },
    { data: rules },
    { data: transactions },
    { data: cards },
    { data: cardPurchases },
  ] = await Promise.all([
    supabase
      .from('envelopes')
      .select('id, nome, tipo, saldo, meta, cor, ordem, ativo, created_at')
      .eq('ativo', true)
      .order('ordem'),
    supabase
      .from('categories')
      .select('id, nome, emoji, tipo, envelope_padrao_id, created_at')
      .order('nome'),
    supabase
      .from('distribution_rules')
      .select('id, nome, alocacoes, created_at'),
    supabase
      .from('transactions')
      .select('id, data, tipo, valor, category_id, envelope_id, debt_id, descricao, forma_pgto, created_at, categories(nome, emoji), envelopes(nome)')
      .gte('data', firstDay)
      .lte('data', lastDay)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('cards')
      .select('id, nome, limite, dia_fechamento, dia_vencimento, juros_rotativo, cor, ordem, ativo, created_at')
      .eq('ativo', true)
      .order('ordem'),
    supabase
      .from('card_purchases')
      .select('id, card_id, descricao, category_id, valor_total, parcelas, data_compra, created_at, cards(nome, cor), categories(nome, emoji), card_installments(numero, competencia)')
      .gte('data_compra', firstDay)
      .lte('data_compra', lastDay)
      .order('created_at', { ascending: false }),
  ])

  return (
    <main className="px-4 pt-6 pb-4">
      <h1 className="mb-5 text-xl font-bold text-zinc-900">Lançar</h1>
      <LancarForm
        envelopes={(envelopes ?? []) as Envelope[]}
        categories={(categories ?? []) as Category[]}
        rules={(rules ?? []) as DistributionRule[]}
        cards={(cards ?? []) as Card[]}
      />
      <TransacoesList
        transactions={(transactions ?? []) as unknown as TransactionRow[]}
        cardPurchases={(cardPurchases ?? []) as unknown as CardPurchaseRow[]}
        envelopes={(envelopes ?? []) as Envelope[]}
        categories={(categories ?? []) as Category[]}
      />
    </main>
  )
}
