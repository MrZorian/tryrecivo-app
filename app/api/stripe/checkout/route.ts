import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

const STRIPE_PRICES: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  growth:  process.env.STRIPE_PRICE_GROWTH!,
  pro:     process.env.STRIPE_PRICE_PRO!,
}

export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
  const { searchParams } = req.nextUrl
  const planId = searchParams.get('plan')

  if (!planId || !STRIPE_PRICES[planId]) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=invalid_plan`)
  }

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

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: STRIPE_PRICES[planId], quantity: 1 }],
    success_url: `${APP_URL}/dashboard/billing?upgraded=true&source=stripe`,
    cancel_url:  `${APP_URL}/dashboard/billing?error=charge_declined`,
    metadata: { user_id: user.id, plan: planId },
    subscription_data: { metadata: { user_id: user.id, plan: planId } },
    customer_email: user.email,
    allow_promotion_codes: true,
  })

  return NextResponse.redirect(session.url!)
}
