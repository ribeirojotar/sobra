import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Card, CardPurchaseRow, Category, DistributionRule, Envelope, TransactionRow } from '@/lib/types'
import { LancarForm } from './_components/LancarForm'
import { TransacoesList } from './_components/TransacoesList'
import { MonthPicker } from '../_components/MonthPicker'

export const metadata: Metadata = { title: 'Lançar — Sobra' }

function parseMes(raw: string | string[] | undefined): string {
  const val = Array.isArray(raw) ? raw[0] : raw
  if (val && /^\d{4}-\d{2}$/.test(val)) return val
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function LancarPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string | string[] }>
}) {
  const supabase = await createClient()

  const { mes: mesParam } = await searchParams
  const mes = parseMes(mesParam)
  const [y, m] = mes.split('-').map(Number)
  const firstDay = `${mes}-01`
  const lastDay = new Date(y, m, 0).toISOString().slice(0, 10)

  const TX_SELECT = 'id, data, tipo, valor, category_id, envelope_id, debt_id, descricao, forma_pgto, status, data_vencimento, created_at, categories(nome, emoji), envelopes(nome)'

  const [
    { data: envelopes },
    { data: categories },
    { data: rules },
    // Efetivadas: filtro por `data` no mês
    { data: txEfetivadas },
    // Pendentes: filtro por `data_vencimento` no mês (data pode ser qualquer mês)
    { data: txPendentes },
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
      .select(TX_SELECT)
      .eq('status', 'efetivada')
      .gte('data', firstDay)
      .lte('data', lastDay)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('transactions')
      .select(TX_SELECT)
      .eq('status', 'pendente')
      .gte('data_vencimento', firstDay)
      .lte('data_vencimento', lastDay)
      .order('data_vencimento', { ascending: true }),
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

  const transactions: TransactionRow[] = [
    ...((txPendentes ?? []) as unknown as TransactionRow[]),
    ...((txEfetivadas ?? []) as unknown as TransactionRow[]),
  ]

  // Sanity check — aparece no terminal do Next.js
  console.log(
    `[lancar] ${firstDay}→${lastDay} | efetivadas: ${txEfetivadas?.length ?? 0} | pendentes: ${txPendentes?.length ?? 0}`,
    txPendentes?.map((t) => ({ id: t.id.slice(0, 8), status: t.status, data_vencimento: t.data_vencimento })),
  )

  return (
    <main className="px-4 pt-6 pb-4">
      <h1 className="mb-3 text-xl font-bold text-zinc-900">Lançar</h1>
      <MonthPicker mes={mes} />
      <div className="mb-5" />
      <LancarForm
        envelopes={(envelopes ?? []) as Envelope[]}
        categories={(categories ?? []) as Category[]}
        rules={(rules ?? []) as DistributionRule[]}
        cards={(cards ?? []) as Card[]}
      />
      <TransacoesList
        transactions={transactions}
        cardPurchases={(cardPurchases ?? []) as unknown as CardPurchaseRow[]}
        envelopes={(envelopes ?? []) as Envelope[]}
        categories={(categories ?? []) as Category[]}
        mes={mes}
      />
    </main>
  )
}
