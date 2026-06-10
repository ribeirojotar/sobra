import type { Metadata } from 'next'
import { LoginForm } from './_components/LoginForm'

export const metadata: Metadata = {
  title: 'Entrar — Sobra',
}

const ERROR_MESSAGES: Record<string, string> = {
  link_invalido: 'O link expirou ou é inválido. Solicite um novo.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const urlError = error ? (ERROR_MESSAGES[error] ?? 'Algo deu errado. Tente novamente.') : undefined

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Sobra</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Recuperação financeira, passo a passo.
          </p>
        </div>
        <LoginForm urlError={urlError} />
      </div>
    </main>
  )
}
