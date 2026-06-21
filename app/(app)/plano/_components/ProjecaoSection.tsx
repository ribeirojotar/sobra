import { brl } from '@/lib/format'
import type { IncomeSource, RecurringExpense } from '@/lib/types'

type DebtMin = { id: string; parcela_min: number; quitada: boolean }

type Props = {
  rendas: IncomeSource[]
  fixas: RecurringExpense[]
  debts: DebtMin[]
  parcelasPorMes: Record<string, number>
}

function nomeMes(d: Date): string {
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d)
  r.setMonth(r.getMonth() + n)
  return r
}

export function ProjecaoSection({ rendas, fixas, debts, parcelasPorMes }: Props) {
  const rendasAtivas = rendas.filter((r) => r.ativo)
  const fixasAtivas = fixas.filter((f) => f.ativo)
  const semDados = rendasAtivas.length === 0 && fixasAtivas.length === 0

  const entradas = rendasAtivas.reduce((s, r) => s + Number(r.valor_estimado), 0)
  const saidasFixas = fixasAtivas.reduce((s, f) => s + Number(f.valor), 0)
  const parcelasMin = debts
    .filter((d) => !d.quitada && Number(d.parcela_min) > 0)
    .reduce((s, d) => s + Number(d.parcela_min), 0)
  const totalSaidas = saidasFixas + parcelasMin
  const netMensal = entradas - totalSaidas

  const now = new Date()
  const meses = [addMonths(now, 1), addMonths(now, 2), addMonths(now, 3)]

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zinc-900">Projeção — próximos 3 meses</h2>
        <p className="text-xs text-zinc-400">
          Baseada nas rendas e fixas ativas + parcelas mínimas das dívidas
        </p>
      </div>

      {semDados ? (
        <div className="rounded-xl bg-zinc-50 px-5 py-6 text-center ring-1 ring-zinc-100">
          <p className="text-sm text-zinc-400">
            Cadastre rendas e despesas fixas acima para ver a projeção.
          </p>
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            <ResumoCell label="Entradas" valor={entradas} cor="text-green-700" />
            <ResumoCell label="Fixas" valor={saidasFixas} cor="text-zinc-600" sinal="-" />
            <ResumoCell label="Parcelas" valor={parcelasMin} cor="text-zinc-600" sinal="-" />
          </div>

          {/* Cards por mês */}
          <div className="flex flex-col gap-3">
            {meses.map((mes, i) => {
              const mesKey = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}`
              const parcelasCartao = parcelasPorMes[mesKey] ?? 0
              const netMes = netMensal - parcelasCartao
              const positivo = netMes >= 0
              return (
                <div
                  key={i}
                  className={`rounded-xl p-4 ring-1 ${positivo ? 'bg-green-50 ring-green-200' : 'bg-red-50 ring-red-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold capitalize text-zinc-600">
                      {nomeMes(mes)}
                    </span>
                    <span className={`text-base font-bold ${positivo ? 'text-green-700' : 'text-red-600'}`}>
                      {positivo ? '+' : ''}{brl(netMes)}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-zinc-500">
                    <span>Entradas: {brl(entradas)}</span>
                    <span>Saídas: {brl(totalSaidas + parcelasCartao)}</span>
                  </div>
                  {parcelasCartao > 0 && (
                    <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
                      <span>· Fixas + dívidas: {brl(totalSaidas)}</span>
                      <span>· Cartão: {brl(parcelasCartao)}</span>
                    </div>
                  )}
                  {!positivo && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      ⚠️ Mês negativo — revise as rendas ou reduza gastos fixos.
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <p className="mt-3 text-[11px] text-zinc-400 leading-relaxed">
            Projeção simplificada: rendas fixas + estimativa de variáveis, sem considerar gastos do dia a dia.
            {parcelasMin > 0 && ` Inclui ${brl(parcelasMin)}/mês de parcelas mínimas das dívidas.`}
            {' Parcelas de cartão são descontadas pelo mês de competência de cada parcela.'}
          </p>
        </>
      )}
    </section>
  )
}

function ResumoCell({
  label,
  valor,
  cor,
  sinal,
}: {
  label: string
  valor: number
  cor: string
  sinal?: string
}) {
  return (
    <div className="rounded-xl bg-white p-3 text-center ring-1 ring-zinc-100">
      <p className="text-[10px] text-zinc-400">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${cor}`}>
        {sinal}{brl(valor)}
      </p>
    </div>
  )
}
