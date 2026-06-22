import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const PLANS: Record<string, { name: string; price: number; emails: number }> = {
  starter: { name: 'Recivo Starter', price: 19, emails: 5000 },
  growth:  { name: 'Recivo Growth',  price: 49, emails: 20000 },
  pro:     { name: 'Recivo Pro',     price: 99, emails: 0 }, // 0 = unlimited
}

export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
  const { searchParams } = req.nextUrl
  const planId = searchParams.get('plan')

  if (!planId || !PLANS[planId]) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=invalid_plan`)
  }

  // Auth check
  const res = NextResponse.next()
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
    .select('shop_domain, access_token')
    .eq('user_id', user.id)
    .single()

  if (!store) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=no_store`)
  }

  const plan = PLANS[planId]

  // Create recurring charge via Shopify Admin API
  const chargeRes = await fetch(
    `https://${store.shop_domain}/admin/api/2024-01/recurring_application_charges.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': store.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recurring_application_charge: {
          name: plan.name,
          price: plan.price.toFixed(2),
          return_url: `${APP_URL}/api/shopify/billing/callback?plan=${planId}&shop=${store.shop_domain}`,
          test: true, // Remove in production
          trial_days: 0,
        },
      }),
    }
  )

  const { recurring_application_charge: charge } = await chargeRes.json()

  if (!charge?.confirmation_url) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=charge_failed`)
  }

  return NextResponse.redirect(charge.confirmation_url)
}
