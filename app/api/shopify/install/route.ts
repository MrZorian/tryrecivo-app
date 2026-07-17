import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get('shop')
  if (!shop) return NextResponse.json({ error: 'Missing shop' }, { status: 400 })

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
  const apiKey = process.env.SHOPIFY_API_KEY!
  const scopes = 'read_orders,read_customers,write_merchant_managed_webhooks'
  const redirectUri = `${APP_URL}/api/shopify/callback`
  const state = Math.random().toString(36).substring(2)

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

  const response = NextResponse.redirect(installUrl)
  response.cookies.set('shopify_state', state, { httpOnly: true, maxAge: 600 })
  return response
}
