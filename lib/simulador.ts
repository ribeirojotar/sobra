import type { Debt } from './types'

type Metodo = 'avalanche' | 'bola_de_neve'

export type SimResult =
  | { ok: true; meses: number; dataPrevista: Date }
  | { ok: false; motivo: 'insuficiente' | 'nao_quita' }

type DebtInput = Pick<Debt, 'valor_atual' | 'juros_mensal' | 'parcela_min'>

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

export function simular(
  dividas: DebtInput[],
  aporteMensal: number,
  metodo: Metodo,
  rendaExtra = 0,
): SimResult {
  const ativas = dividas.filter((d) => d.valor_atual > 0)
  if (ativas.length === 0) return { ok: true, meses: 0, dataPrevista: new Date() }

  const aporteTotal = aporteMensal + rendaExtra
  const somaMinimos = ativas.reduce((s, d) => s + d.parcela_min, 0)
  if (aporteTotal < somaMinimos && aporteTotal > 0) {
    return { ok: false, motivo: 'insuficiente' }
  }

  let mes = 0
  const saldos = ativas.map((d) => ({ ...d }))

  while (saldos.some((d) => d.valor_atual > 0) && mes < 600) {
    mes++
    // 1. juros do mês incidem sobre cada saldo
    saldos.forEach((d) => {
      d.valor_atual = d.valor_atual * (1 + d.juros_mensal / 100)
    })
    // 2. paga parcelas mínimas de todas
    let caixa = aporteTotal
    saldos.forEach((d) => {
      if (d.valor_atual <= 0) return
      const pg = Math.min(d.parcela_min, d.valor_atual)
      d.valor_atual -= pg
      caixa -= pg
    })
    // 3. sobra vai para a "dívida da vez"
    const fila = saldos
      .filter((d) => d.valor_atual > 0)
      .sort((a, b) =>
        metodo === 'avalanche'
          ? b.juros_mensal - a.juros_mensal
          : a.valor_atual - b.valor_atual,
      )
    for (const d of fila) {
      if (caixa <= 0) break
      const pg = Math.min(caixa, d.valor_atual)
      d.valor_atual -= pg
      caixa -= pg
    }
  }

  if (saldos.some((d) => d.valor_atual > 0)) {
    return { ok: false, motivo: 'nao_quita' }
  }
  return { ok: true, meses: mes, dataPrevista: addMonths(new Date(), mes) }
}

export function formatarDataPrevista(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
