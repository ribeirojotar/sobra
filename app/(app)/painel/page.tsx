import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/login/actions'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Painel — Sobra' }

export default async function PainelPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="px-4 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Painel</h1>
        <form
          action={async () => {
            'use server'
            await signOut()
            redirect('/login')
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100"
          >
            Sair
          </button>
        </form>
      </div>

      <p className="text-sm text-zinc-500">
        Logado como <span className="font-medium text-zinc-700">{user.email}</span>
      </p>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Disponível pra gastar
        </p>
        <p className="mt-2 text-4xl font-bold text-zinc-900">—</p>
        <p className="mt-1 text-xs text-zinc-400">
          Configure suas caixinhas no Plano
        </p>
      </div>
    </main>
  )
}
