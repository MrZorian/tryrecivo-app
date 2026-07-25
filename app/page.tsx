import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export default async function Home() {
  // Shopify redirects merchants back to the App URL ("/") after a billing
  // approval. If the merchant already has a session, send them into the app
  // instead of unconditionally bouncing to /login — that redirect looked to
  // reviewers like the app "logging you out" right after choosing a plan.
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard/billing')
  }
  redirect('/login')
}
