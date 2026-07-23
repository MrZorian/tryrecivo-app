import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const VALID_PLANS = ['starter', 'growth', 'pro']

export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
  const { searchParams } = req.nextUrl
  const planId = searchParams.get('plan')

  if (!planId || !VALID_PLANS.includes(planId)) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=invalid_plan`)
  }

  // Auth check
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
  if (!user) return NextResponse.redirect(`${APP_URL}/login`)

  // Get user's connected store
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: store } = await supabase
    .from('stores')
    .select('shop_domain')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!store) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=no_store`)
  }

  // Redirect to Shopify App Pricing plan selection page.
  // Include return_url so Shopify redirects back to our callback after approval
  // (without it, Shopify redirects to application_url = "/" which goes to /login).
  const storeHandle = store.shop_domain.replace('.myshopify.com', '')
  const returnUrl = `${APP_URL}/api/shopify/billing/callback?shop=${encodeURIComponent(store.shop_domain)}&plan=${planId}`
  const planSelectionUrl = `https://admin.shopify.com/store/${storeHandle}/charges/recivo/plans/${planId}?interval=EVERY_30_DAYS&return_url=${encodeURIComponent(returnUrl)}`

  return NextResponse.redirect(planSelectionUrl)
}
