import { brl } from '@/lib/format'

export type ProximoVencimento = {
  nomeCartao: string
  dataStr: string
  cor: string | null
  diasParaVencer: number
}

type Props = {
  totalEmAberto: number
  proximoVencimento: ProximoVencimento | null
}

export function FaturasCard({ totalEmAberto, proximoVencimento }: Props) {
  if (totalEmAberto === 0 && !proximoVencimento) return null

  return (
    <a href="/cartoes" className="block">
      <div className="rounded-2xl bg-indigo-50 p-5 ring-1 ring-indigo-100 active:opacity-80">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-indigo-900">Faturas</h2>
          <span className="text-xs text-indigo-400 font-medium">Ver cartões →</span>
        </div>

        <p className="mt-2 text-2xl font-bold text-indigo-900">{brl(totalEmAberto)}</p>
        <p className="text-xs text-indigo-500 mt-0.5">total em aberto</p>

        {proximoVencimento && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2.5">
            {proximoVencimento.cor && (
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: proximoVencimento.cor }}
              />
            )}
            <div className="min-w-0">
              <p className="text-xs text-indigo-800">
                <span className="font-semibold">{proximoVencimento.nomeCartao}</span>
                {' · vence '}
                {proximoVencimento.dataStr}
                {proximoVencimento.diasParaVencer <= 7 && (
                  <span className="ml-1 text-amber-700 font-semibold">
                    (
                    {proximoVencimento.diasParaVencer === 0
                      ? 'hoje'
                      : proximoVencimento.diasParaVencer === 1
                        ? 'amanhã'
                        : `em ${proximoVencimento.diasParaVencer} dias`}
                    )
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </a>
  )
}
