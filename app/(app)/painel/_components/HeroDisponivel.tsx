import { brl } from '@/lib/format'

type Props = {
  disponivel: number
  saldoTotal: number
  saldoFixas: number
  saldoDividas: number
  saldoReserva: number
}

export function HeroDisponivel({ disponivel, saldoTotal, saldoFixas, saldoDividas, saldoReserva }: Props) {
  const negativo = disponivel < 0

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        Disponível pra gastar
      </p>
      <p className={`mt-1 text-4xl font-bold ${negativo ? 'text-red-600' : 'text-zinc-900'}`}>
        {brl(disponivel)}
      </p>
      {negativo && (
        <p className="mt-1 text-xs text-red-500">
          Saldo negativo — verifique os lançamentos.
        </p>
      )}

      {saldoTotal > 0 ? (
        <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-4">
          <BreakRow label="Total nas caixinhas" valor={saldoTotal} />
          {saldoFixas > 0 && <BreakRow label="− Reservado em Fixas" valor={saldoFixas} deduz />}
          {saldoDividas > 0 && <BreakRow label="− Reservado p/ Dívidas" valor={saldoDividas} deduz />}
          {saldoReserva > 0 && <BreakRow label="− Reserva" valor={saldoReserva} deduz />}
          <div className="flex justify-between border-t border-zinc-100 pt-1.5">
            <span className="text-xs font-semibold text-zinc-600">= Livre pra gastar</span>
            <span className={`text-xs font-semibold ${negativo ? 'text-red-600' : 'text-zinc-900'}`}>
              {brl(disponivel)}
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-400">
          Registre um lançamento ou configure as caixinhas no{' '}
          <a href="/plano" className="underline text-blue-500">Plano</a>.
        </p>
      )}
    </div>
  )
}

function BreakRow({ label, valor, deduz }: { label: string; valor: number; deduz?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-xs font-medium ${deduz ? 'text-zinc-400' : 'text-zinc-700'}`}>
        {brl(valor)}
      </span>
    </div>
  )
}
