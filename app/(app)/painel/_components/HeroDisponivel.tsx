import { brl } from '@/lib/format'

type Props = {
  saldoLivre: number
  faturasComprometidas: number
}

export function HeroDisponivel({ saldoLivre, faturasComprometidas }: Props) {
  const disponivel = saldoLivre - faturasComprometidas
  const negativo = disponivel < 0
  const temDados = saldoLivre !== 0 || faturasComprometidas !== 0

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        Disponível pra gastar
      </p>
      <p className={`mt-1 text-4xl font-bold ${negativo ? 'text-red-600' : 'text-zinc-900'}`}>
        {brl(disponivel)}
      </p>

      {temDados ? (
        <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-4">
          <BreakRow label="Saldo na Livre" valor={saldoLivre} />
          {faturasComprometidas > 0 && (
            <BreakRow label="− Faturas comprometidas" valor={faturasComprometidas} deduz />
          )}
          <div className="flex justify-between border-t border-zinc-100 pt-1.5">
            <span className="text-xs font-semibold text-zinc-600">= Disponível</span>
            <span
              className={`text-xs font-semibold ${negativo ? 'text-red-600' : 'text-zinc-900'}`}
            >
              {brl(disponivel)}
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-400">
          Registre um lançamento ou configure as caixinhas no{' '}
          <a href="/plano" className="underline text-blue-500">
            Plano
          </a>
          .
        </p>
      )}

      {negativo && (
        <p className="mt-2 text-xs text-red-500">
          Faturas comprometidas excedem o saldo — verifique os cartões.
        </p>
      )}
    </div>
  )
}

function BreakRow({
  label,
  valor,
  deduz,
}: {
  label: string
  valor: number
  deduz?: boolean
}) {
  return (
    <div className="flex justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-xs font-medium ${deduz ? 'text-zinc-400' : 'text-zinc-700'}`}>
        {brl(valor)}
      </span>
    </div>
  )
}
