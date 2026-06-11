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
