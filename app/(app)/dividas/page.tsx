import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dívidas — Sobra' }

export default function DividasPage() {
  return (
    <main className="px-4 pt-6">
      <h1 className="text-xl font-bold text-zinc-900">Dívidas</h1>
      <p className="mt-4 text-sm text-zinc-500">Em breve.</p>
    </main>
  )
}
