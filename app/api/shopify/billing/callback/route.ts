import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const PLAN_LIMITS: Record<string, { emails_limit: number }> = {
  starter: { emails_limit: 5000 },
  growth:  { emails_limit: 20000 },
  pro:     { emails_limit: 999999 },
}

export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
  const { searchParams } = req.nextUrl

  // Shopify App Pricing sends: plan_handle, shop
  // Legacy Billing API sent: plan, shop, charge_id
  const planHandle = searchParams.get('plan_handle') || searchParams.get('plan')
  const shop = searchParams.get('shop')

  if (!planHandle || !shop) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=missing_params`)
  }

  const planId = planHandle.toLowerCase() // 'starter' | 'growth' | 'pro'
  if (!PLAN_LIMITS[planId]) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=unknown_plan`)
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify the store belongs to this user
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shop)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!store) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=store_not_found`)
  }

  // With Shopify App Pricing, Shopify handles charge verification.
  // We just update the user's plan in our database.
  const planLimits = PLAN_LIMITS[planId]
  await supabase
    .from('profiles')
    .update({
      plan: planId,
      emails_limit: planLimits.emails_limit,
    })
    .eq('id', user.id)

  return NextResponse.redirect(`${APP_URL}/dashboard/billing?upgraded=true`)
}
