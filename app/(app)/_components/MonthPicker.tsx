'use client'

import { useRouter, usePathname } from 'next/navigation'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function MonthPicker({ mes }: { mes: string }) {
  const router = useRouter()
  const pathname = usePathname()

  function navigate(delta: number) {
    const [y, m] = mes.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    router.push(`${pathname}?mes=${next}`)
  }

  const [y, m] = mes.split('-').map(Number)
  const label = `${MESES[m - 1]} de ${y}`

  return (
    <div className="flex items-center justify-center gap-3 py-1">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Mês anterior"
        className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="size-4">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <span className="min-w-[140px] text-center text-sm font-semibold text-zinc-700">
        {label}
      </span>

      <button
        type="button"
        onClick={() => navigate(1)}
        aria-label="Próximo mês"
        className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="size-4">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  )
}
