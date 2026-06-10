'use client'

import { useActionState } from 'react'
import { signInWithEmail, type LoginState } from '../actions'

const initial: LoginState = { status: 'idle' }

export function LoginForm({ urlError }: { urlError?: string }) {
  const [state, action, pending] = useActionState(signInWithEmail, initial)

  if (state.status === 'success') {
    return (
      <div className="text-center">
        <p className="text-base font-semibold text-zinc-900">Verifique seu e-mail</p>
        <p className="mt-2 text-sm text-zinc-500">
          Enviamos um link de acesso. Clique nele para entrar.
        </p>
      </div>
    )
  }

  const errorMsg =
    state.status === 'error' ? state.message : urlError

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {errorMsg && (
        <p role="alert" className="text-sm text-red-600">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60"
      >
        {pending ? 'Enviando…' : 'Entrar com e-mail'}
      </button>
    </form>
  )
}
