import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()

  // Only guard dashboard routes
  if (!pathname.startsWith('/dashboard')) return res

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value },
        set(name, value, options) { res.cookies.set({ name, value, ...options }) },
        remove(name, options) { res.cookies.set({ name, value: '', ...options }) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → login
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Email not confirmed → verify-email page
  if (!user.email_confirmed_at) {
    const email = user.email || ''
    return NextResponse.redirect(new URL(`/verify-email?email=${encodeURIComponent(email)}`, req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
