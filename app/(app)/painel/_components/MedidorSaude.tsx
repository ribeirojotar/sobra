type Props = {
  score: number
  temDividas: boolean
  dividasAcumulando: number
}

type Nivel = {
  label: string
  icone: string
  cor: string
  barCor: string
  msg: string
}

const NIVEIS: Nivel[] = [
  {
    label: 'Crítico',
    icone: '⚡',
    cor: 'text-red-600',
    barCor: 'bg-red-500',
    msg: 'Situação delicada — mas você está aqui, enfrentando. Isso já é o começo.',
  },
  {
    label: 'Atenção',
    icone: '🔥',
    cor: 'text-orange-600',
    barCor: 'bg-orange-400',
    msg: 'Progresso real acontecendo. Cada pagamento é uma vitória.',
  },
  {
    label: 'Avançando',
    icone: '🌱',
    cor: 'text-yellow-600',
    barCor: 'bg-yellow-400',
    msg: 'Metade do caminho. O fim das dívidas está no horizonte.',
  },
  {
    label: 'Ótimo',
    icone: '✦',
    cor: 'text-green-600',
    barCor: 'bg-green-500',
    msg: 'Quase lá. A liberdade financeira está próxima.',
  },
]

function getNivel(score: number): Nivel {
  if (score >= 75) return NIVEIS[3]
  if (score >= 50) return NIVEIS[2]
  if (score >= 25) return NIVEIS[1]
  return NIVEIS[0]
}

export function MedidorSaude({ score, temDividas, dividasAcumulando }: Props) {
  if (!temDividas) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Saúde Financeira
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">
            🎉
          </span>
          <div>
            <p className="text-sm font-bold text-green-600">Livre das dívidas!</p>
            <p className="text-xs text-zinc-500">Hora de construir a reserva e investir.</p>
          </div>
        </div>
      </div>
    )
  }

  const nivel = getNivel(score)

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Saúde Financeira
        </p>
        <span className={`rounded-full bg-zinc-50 px-2 py-0.5 text-xs font-bold ring-1 ring-zinc-200 ${nivel.cor}`}>
          {nivel.icone} {nivel.label}
        </span>
      </div>

      {/* Barra */}
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full transition-all ${nivel.barCor}`}
          style={{ width: `${score}%` }}
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Saúde financeira: ${score}%`}
        />
      </div>
      <div className="mt-1 flex justify-between">
        <span className="text-[10px] text-zinc-400">Crítico</span>
        <span className="text-[10px] text-zinc-400">Ótimo</span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-zinc-600">{nivel.msg}</p>

      {dividasAcumulando > 0 && (
        <p className="mt-2 text-xs text-amber-600">
          {dividasAcumulando === 1
            ? '⚠️ 1 dívida acumulando juros sem pagamento.'
            : `⚠️ ${dividasAcumulando} dívidas acumulando juros sem pagamento.`}
        </p>
      )}
    </div>
  )
}
