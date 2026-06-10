const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const brl = (v: number | null | undefined) =>
  v == null ? '—' : fmt.format(v)
