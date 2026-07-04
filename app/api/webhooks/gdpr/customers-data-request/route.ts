/**
 * GDPR Mandatory Webhook: customers/data_request
 * Shopify calls this when a customer requests a copy of their data.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

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
  const { shop_domain, customer } = payload

  console.log(`[GDPR] Data request for customer ${customer?.id} on shop ${shop_domain}`)

  return NextResponse.json({ acknowledged: true }, { status: 200 })
}
