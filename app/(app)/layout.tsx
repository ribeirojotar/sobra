import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from './_components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50">
      {/* main content; pb-16 leaves room for the fixed bottom nav */}
      <div className="flex-1 pb-16">{children}</div>
      <BottomNav />
    </div>
  )
}
