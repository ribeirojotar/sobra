import { brl } from '@/lib/format'

type Props = {
  vencidas: number
  proximosSete: number
  saldoAtual: number
}

export function AlertasPendentes({ vencidas, proximosSete, saldoAtual }: Props) {
  const coberturaCritica = proximosSete > 0 && proximosSete > saldoAtual

  if (vencidas === 0 && !coberturaCritica) return null

  return (
    <div className="flex flex-col gap-2">
      {vencidas > 0 && (
        <div className="flex gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-900">
          <span className="mt-0.5 shrink-0" aria-hidden="true">🚨</span>
          <span>
            Você tem <strong>{brl(vencidas)}</strong> em contas vencidas — quite ou negocie.
          </span>
        </div>
      )}
      {coberturaCritica && (
        <div className="flex gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-900">
          <span className="mt-0.5 shrink-0" aria-hidden="true">🚨</span>
          <span>
            Próximos 7 dias: <strong>{brl(proximosSete)}</strong> a pagar. Caixa atual:{' '}
            <strong>{brl(saldoAtual)}</strong>.
          </span>
        </div>
      )}
    </div>
  )
}
