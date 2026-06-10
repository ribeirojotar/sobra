'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export type LoginState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

export async function signInWithEmail(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = (formData.get('email') as string | null)?.trim()

  if (!email) {
    return { status: 'error', message: 'Informe um e-mail.' }
  }

  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3000'

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { status: 'error', message: error.message }
  }

  return { status: 'success' }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
