import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { createHmac } from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

async function verifyShopifyHmac(req: NextRequest, body: string): Promise<boolean> {
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256')
  if (!hmacHeader) return false
  const secret = process.env.SHOPIFY_API_SECRET!
  const digest = createHmac('sha256', secret).update(body, 'utf8').digest('base64')
  return digest === hmacHeader
}

function buildEmailHtml(order: any, store: any, settings: any, isPaidPlan: boolean): string {
  const style = settings?.receipt_style || 'bold'
  const brandColor = settings?.brand_color || '#1a2f5e'
  const accentColor = '#00bfa5'

  const lineItemsData = order.line_items || []
  const storeName = store.shop_name || store.shop_domain

  const brandinFooter = isPaidPlan ? '' : `
    <tr><td colspan="2" style="padding:16px 32px;text-align:center;background:#f8fafc;border-top:1px solid #f1f5f9;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">
        Powered by <a href="https://tryrecivo.com" style="color:#00bfa5;font-weight:700;text-decoration:none;">
          <img src="https://tryrecivo.com/favicon.ico" width="12" height="12" style="vertical-align:middle;margin-right:3px;" alt=""/>Recivo
        </a> â Branded receipts for Shopify
      </p>
    </td></tr>`

  const shippingRow = settings?.show_delivery_charges && order.shipping_lines?.length > 0
    ? `<tr><td style="font-size:13px;color:#64748b;padding:4px 0;">Shipping</td><td style="font-size:13px;color:#334155;text-align:right;padding:4px 0;">$${order.shipping_lines[0]?.price || '0.00'}</td></tr>` : ''

  const taxRow = settings?.show_tax_breakdown
    ? `<tr><td style="font-size:13px;color:#64748b;padding:4px 0;">Tax</td><td style="font-size:13px;color:#334155;text-align:right;padding:4px 0;">$${order.total_tax || '0.00'}</td></tr>` : ''

  const socialLinks = settings?.show_social_links && (settings?.instagram_url || settings?.tiktok_url || settings?.facebook_url)
    ? `<div style="margin-top:24px;text-align:center;">
        <p style="font-size:11px;color:#94a3b8;margin:0 0 8px;">Follow us</p>
        ${settings.instagram_url ? `<a href="${settings.instagram_url}" style="margin:0 6px;font-size:12px;color:${brandColor};font-weight:600;">Instagram</a>` : ''}
        ${settings.tiktok_url ? `<a href="${settings.tiktok_url}" style="margin:0 6px;font-size:12px;color:${brandColor};font-weight:600;">TikTok</a>` : ''}
        ${settings.facebook_url ? `<a href="${settings.facebook_url}" style="margin:0 6px;font-size:12px;color:${brandColor};font-weight:600;">Facebook</a>` : ''}
      </div>` : ''

  const customerName = `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'there'

  // âââ STYLE: BOLD âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  if (style === 'bold') {
    const itemRows = lineItemsData.map((item: any) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;">${item.title}${item.variant_title ? ` <span style="color:#94a3b8;font-size:12px;">(${item.variant_title})</span>` : ''} Ã${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;text-align:right;white-space:nowrap;">$${item.price}</td>
      </tr>`).join('')

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="580" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);">
  <tr><td style="background:${brandColor};padding:36px 32px;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:1.5px;">${storeName}</p>
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:white;">Order confirmed! ð</h1>
    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);">Order #${order.order_number} Â· ${new Date(order.created_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#334155;">Hi ${customerName},</p>
    <table width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:2px solid #f1f5f9;padding-top:16px;">
      ${shippingRow}${taxRow}
      <tr><td colspan="2" style="padding-top:10px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="background:#e0f7f4;border-radius:10px;padding:14px 16px;font-size:16px;font-weight:800;color:#085041;">Total</td>
          <td style="background:#e0f7f4;border-radius:10px;padding:14px 16px;font-size:16px;font-weight:800;color:#085041;text-align:right;">$${order.total_price}</td>
        </tr></table>
      </td></tr>
    </table>
    ${settings?.thank_you_message ? `<p style="margin:24px 0 0;font-size:14px;color:#64748b;line-height:1.7;">${settings.thank_you_message}</p>` : ''}
    ${settings?.return_policy ? `<div style="margin-top:20px;padding:14px 16px;background:#f8fafc;border-radius:8px;border-left:3px solid ${brandColor};"><p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;"><strong style="color:#334155;">Returns:</strong> ${settings.return_policy}</p></div>` : ''}
    ${socialLinks}
    ${settings?.disclaimer ? `<p style="margin-top:20px;font-size:11px;color:#94a3b8;line-height:1.5;">${settings.disclaimer}</p>` : ''}
  </td></tr>
  ${brandinFooter}
</table></td></tr></table></body></html>`
  }

  // âââ STYLE: MINIMAL âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  if (style === 'minimal') {
    const itemRows = lineItemsData.map((item: any) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:13px;color:#333;">${item.title}${item.variant_title ? ` (${item.variant_title})` : ''} Ã${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:13px;color:#333;text-align:right;">$${item.price}</td>
      </tr>`).join('')

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:48px 16px;">
<table width="520" cellpadding="0" cellspacing="0">
  <tr><td style="border-bottom:2px solid #111;padding-bottom:20px;">
    <p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#888;">${storeName}</p>
   
