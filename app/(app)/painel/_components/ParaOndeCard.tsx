import { brl } from '@/lib/format'

export type CatRow = {
  nome: string
  emoji: string | null
  total: number
}

type Props = {
  categorias: CatRow[]
  nomeMes: string
}

export function ParaOndeCard({ categorias, nomeMes }: Props) {
  if (categorias.length === 0) return null

  const max = categorias[0].total

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
      <h2 className="mb-4 text-sm font-bold text-zinc-900 capitalize">
        Pra onde foi o dinheiro em {nomeMes}
      </h2>

      <div className="space-y-3.5">
        {categorias.map((cat, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-zinc-700 truncate pr-2">
                {cat.emoji ? `${cat.emoji} ` : ''}
                {cat.nome}
              </span>
              <span className="text-xs font-semibold text-zinc-700 shrink-0">{brl(cat.total)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-rose-400 transition-all"
                style={{ width: `${Math.max(4, Math.round((cat.total / max) * 100))}%` }}
                role="meter"
                aria-valuenow={cat.total}
                aria-valuemax={max}
                aria-label={`${cat.nome}: ${brl(cat.total)}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
