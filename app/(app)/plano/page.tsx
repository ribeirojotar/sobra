import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Category, Envelope, IncomeSource, RecurringExpense } from '@/lib/types'
import { CaixinhasSection } from './_components/CaixinhasSection'
import { RendasSection } from './_components/RendasSection'
import { FixasSection } from './_components/FixasSection'
import { ProjecaoSection } from './_components/ProjecaoSection'
import { ExportarSection } from './_components/ExportarSection'
import { CategoriasSection } from './_components/CategoriasSection'

export const metadata: Metadata = { title: 'Plano — Sobra' }

export default async function PlanoPage() {
  const supabase = await createClient()

  const now = new Date()
  const firstOfMonth = (y: number, m: number) => {
    const d = new Date(y, m, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  }
  const projecaoM1 = firstOfMonth(now.getFullYear(), now.getMonth() + 1)
  const projecaoM3 = firstOfMonth(now.getFullYear(), now.getMonth() + 3)

  const [
    { data: envelopesData },
    { data: rendasData },
    { data: fixasData },
    { data: debtsData },
    { data: categoriesData },
    { data: installsProjecaoData },
  ] = await Promise.all([
    supabase.from('envelopes').select('*').order('ordem'),
    supabase.from('income_sources').select('*').order('created_at'),
    supabase.from('recurring_expenses').select('*').order('created_at'),
    supabase.from('debts').select('id, parcela_min, quitada').eq('quitada', false),
    supabase
      .from('categories')
      .select('id, nome, emoji, tipo, envelope_padrao_id, created_at')
      .order('tipo')
      .order('nome'),
    supabase
      .from('card_installments')
      .select('competencia, valor')
      .eq('status', 'em_aberto')
      .gte('competencia', projecaoM1)
      .lte('competencia', projecaoM3),
  ])

  const envelopes = (envelopesData ?? []) as Envelope[]
  const rendas = (rendasData ?? []) as IncomeSource[]
  const fixas = (fixasData ?? []) as RecurringExpense[]
  const debts = (debtsData ?? []) as { id: string; parcela_min: number; quitada: boolean }[]
  const categories = (categoriesData ?? []) as Category[]

  const parcelasPorMes: Record<string, number> = {}
  for (const inst of installsProjecaoData ?? []) {
    const k = (inst.competencia as string).slice(0, 7)
    parcelasPorMes[k] = (parcelasPorMes[k] ?? 0) + Number(inst.valor)
  }

  return (
    <main className="px-4 pt-6 pb-8 flex flex-col gap-8">
      <h1 className="text-xl font-bold text-zinc-900">Plano</h1>

      <CaixinhasSection envelopes={envelopes} />

      <hr className="border-zinc-100" />

      <RendasSection rendas={rendas} />

      <hr className="border-zinc-100" />

      <FixasSection fixas={fixas} />

      <hr className="border-zinc-100" />

      <CategoriasSection categories={categories} />

      <hr className="border-zinc-100" />

      <ProjecaoSection
        rendas={rendas}
        fixas={fixas}
        debts={debts}
        parcelasPorMes={parcelasPorMes}
      />

      <hr className="border-zinc-100" />

      <ExportarSection />
    </main>
  )
}
