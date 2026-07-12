/**
 * GDPR Mandatory Webhook: shop/redact
 * Shopify calls this 48 hours after a shop uninstalls the app.
 * We must delete all stored data for this shop.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient } from '@supabase/supabase-js'

function verifyHmac(body: string, hmacHeader: string | null): boolean {
    if (!hmacHeader) return false
    const secret = process.env.SHOPIFY_API_SECRET!
    const digest = createHmac('sha256', secret).update(body, 'utf8').digest('base64')
    return digest === hmacHeader
}

export async function POST(req: NextRequest) {
    const body = await req.text()
    const hmac = req.headers.get('x-shopify-hmac-sha256')

  if (!verifyHmac(body, hmac)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = JSON.parse(body)
    const { shop_domain } = payload

  const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

  // Find the store first to get its ID for cascading deletes
  const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('shop_domain', shop_domain)
      .maybeSingle()

  if (store) {
        // Delete email logs and store record in parallel
      await Promise.all([
              supabase.from('email_logs').delete().eq('store_id', store.id),
              supabase.from('stores').delete().eq('id', store.id),
            ])
  }

  console.log(`[GDPR] shop/redact: completed for ${shop_domain}`)

  return NextResponse.json({ acknowledged: true }, { status: 200 })
}
