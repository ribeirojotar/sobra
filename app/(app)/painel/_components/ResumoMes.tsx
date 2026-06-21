import { brl } from '@/lib/format'

type Props = {
  nomeMes: string
  receitas: number
  despesas: number
  receitasAnterior: number
  despesasAnterior: number
  nomeMesAnterior: string
}

export function ResumoMes({
  nomeMes,
  receitas,
  despesas,
  receitasAnterior,
  despesasAnterior,
  nomeMesAnterior,
}: Props) {
  if (receitas === 0 && despesas === 0) return null

  const sobra = receitas - despesas
  const temAnterior = receitasAnterior > 0 || despesasAnterior > 0

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
      <h2 className="mb-4 text-sm font-bold text-zinc-900 capitalize">Resumo de {nomeMes}</h2>

      <div className="space-y-3">
        <ResumoRow
          label="Entrou"
          valor={receitas}
          anterior={temAnterior ? receitasAnterior : null}
          nomeMesAnterior={nomeMesAnterior}
          maiorMelhor
        />
        <ResumoRow
          label="Saiu"
          valor={despesas}
          anterior={temAnterior ? despesasAnterior : null}
          nomeMesAnterior={nomeMesAnterior}
          maiorMelhor={false}
        />
        <div className="border-t border-zinc-100 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">Sobrou</span>
            <span
              className={`text-sm font-bold ${sobra >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {brl(sobra)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResumoRow({
  label,
  valor,
  anterior,
  nomeMesAnterior,
  maiorMelhor,
}: {
  label: string
  valor: number
  anterior: number | null
  nomeMesAnterior: string
  maiorMelhor: boolean
}) {
  const delta =
    anterior != null && anterior > 0
      ? Math.round(((valor - anterior) / anterior) * 100)
      : null

  const melhorou =
    delta != null ? (maiorMelhor ? delta > 0 : delta < 0) : false

  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <span className="text-xs text-zinc-500">{label}</span>
        {delta != null && (
          <div
            className={`text-[10px] font-medium mt-0.5 ${melhorou ? 'text-green-600' : 'text-amber-600'}`}
          >
            {delta > 0 ? `+${delta}%` : `${delta}%`} vs {nomeMesAnterior}
          </div>
        )}
      </div>
      <span className="text-sm font-semibold text-zinc-800 shrink-0">{brl(valor)}</span>
    </div>
  )
}
