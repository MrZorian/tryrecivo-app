import { NextRequest, NextResponse } from 'next/server'
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
  // We also embed plan + shop in the return_url from create/route.ts as fallback.
  const planHandle = searchParams.get('plan_handle') || searchParams.get('plan')
  const shop = searchParams.get('shop')

  if (!planHandle || !shop) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=missing_params`)
  }

  const planId = planHandle.toLowerCase() // 'starter' | 'growth' | 'pro'
  if (!PLAN_LIMITS[planId]) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=unknown_plan`)
  }

  // Use service role — no session cookies needed.
  // We look up the store by shop domain to get the user_id.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Look up the store by shop domain — no is_active filter since stores may
  // not have that flag set, and we still need to honour the plan update.
  const { data: store } = await supabase
    .from('stores')
    .select('user_id')
    .eq('shop_domain', shop)
    .order('created_at', { ascending: false })
    .limit(1)
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
    .eq('id', store.user_id)

  return NextResponse.redirect(`${APP_URL}/dashboard/billing?upgraded=true`)
}
