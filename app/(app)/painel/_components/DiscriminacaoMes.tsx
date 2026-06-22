import { brl } from '@/lib/format'

type Props = {
  mes: string
  efetivadas: number
  proximoVencimento: number
  vencidas: number
  distantes: number
}

export function DiscriminacaoMes({ mes, efetivadas, proximoVencimento, vencidas, distantes }: Props) {
  const total = efetivadas + proximoVencimento + vencidas + distantes
  if (total === 0) return null

  const baldes = [
    { cor: 'bg-green-500', label: 'Efetivadas', valor: efetivadas },
    { cor: 'bg-amber-400', label: 'Próximo do vencimento', valor: proximoVencimento },
    { cor: 'bg-red-500', label: 'Vencidas', valor: vencidas },
    { cor: 'bg-zinc-400', label: 'Distantes', valor: distantes },
  ]

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
      <h2 className="mb-4 text-sm font-bold text-zinc-900">Discriminação do mês</h2>
      <div className="space-y-3">
        {baldes.map(({ cor, label, valor }) => (
          <a
            key={label}
            href={`/lancar?mes=${mes}`}
            className="flex items-center gap-3 active:opacity-70"
          >
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${cor}`} />
            <span className="flex-1 text-sm text-zinc-700">{label}</span>
            <span className="text-sm font-semibold text-zinc-800">{brl(valor)}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
