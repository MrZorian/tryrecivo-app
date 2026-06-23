import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get('shop')
  if (!shop) return NextResponse.json({ error: 'Missing shop' }, { status: 400 })

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

  // Get the current user — the user ID travels in the state param so we don't
  // need session cookies after the cross-origin Shopify redirect
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${APP_URL}/login`)
  }

  const apiKey = process.env.SHOPIFY_API_KEY!
  const scopes = 'read_orders,read_customers'
  const redirectUri = `${APP_URL}/api/shopify/callback`
  const random = Math.random().toString(36).substring(2)
  // Embed user ID in state so callback can recover it without session cookies
  const state = `${random}.${user.id}`

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

  const response = NextResponse.redirect(installUrl)
  response.cookies.set('shopify_state', state, { httpOnly: true, maxAge: 600 })
  return response
}
