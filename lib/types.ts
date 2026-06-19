export type Envelope = {
  id: string
  nome: string
  tipo: 'fixas' | 'dividas' | 'reserva' | 'livre' | 'negocio' | 'custom'
  saldo: number
  meta: number | null
  cor: string | null
  ordem: number
  ativo: boolean
  created_at: string
}

export type Category = {
  id: string
  nome: string
  emoji: string | null
  tipo: 'receita' | 'despesa'
  envelope_padrao_id: string | null
  created_at: string
}

export type DistributionRule = {
  id: string
  nome: string
  alocacoes: Array<{ envelope_id: string; pct: number }>
  created_at: string
}

export type Titular = {
  id: string
  nome: string
  descricao: string | null
  created_at: string
}

export type Debt = {
  id: string
  titular_id: string | null
  credor: string
  descricao: string | null
  valor_original: number
  valor_atual: number
  valor_acordado: number | null
  juros_mensal: number
  parcela_min: number
  status: 'a_negociar' | 'negociado' | 'acordo_em_dia' | 'atrasado' | 'acumulando' | 'quitada'
  desconta_em_folha: boolean
  elegivel_desenrola: boolean
  contratada_em: string | null
  atraso_dias: number | null
  quitada: boolean
  ordem: number
  created_at: string
  titulares: { nome: string } | null
}

export type IncomeSource = {
  id: string
  nome: string
  tipo: 'fixa' | 'variavel'
  valor_estimado: number
  dia_recebimento: number | null
  distribution_rule_id: string | null
  ativo: boolean
  created_at: string
}

export type RecurringExpense = {
  id: string
  nome: string
  valor: number
  dia_vencimento: number | null
  category_id: string | null
  envelope_id: string | null
  ativo: boolean
  created_at: string
}

export type TransactionRow = {
  id: string
  data: string
  tipo: 'receita' | 'despesa'
  valor: number
  category_id: string | null
  envelope_id: string | null
  debt_id: string | null
  descricao: string | null
  forma_pgto: string | null
  created_at: string
  categories: { nome: string; emoji: string | null } | null
  envelopes: { nome: string } | null
}
