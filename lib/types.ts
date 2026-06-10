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
