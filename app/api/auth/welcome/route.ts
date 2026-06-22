import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email, name } = await req.json()
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

  const firstName = name?.split(' ')[0] || 'there'

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="540" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:#1a2f5e;padding:40px 40px 32px;text-align:center;">
    <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:rgba(0,191,165,0.2);border-radius:14px;margin-bottom:16px;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="5" width="18" height="13" rx="2" stroke="#00bfa5" stroke-width="1.8"/>
        <polyline points="3,5 12,12 21,5" stroke="#00bfa5" stroke-width="1.8" stroke-linejoin="round"/>
        <circle cx="19" cy="15" r="3.5" fill="#00bfa5"/>
        <polyline points="17,15 18.5,16.5 21,13.5" stroke="white" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h1 style="margin:0;font-size:24px;font-weight:800;color:white;">Welcome to Recivo! ð</h1>
    <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.65);">Your branded receipt journey starts here</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      Hi ${firstName},<br><br>
      You're all set! Your Recivo account is ready. Here's how to get started in 3 easy steps:
    </p>

    <!-- Steps -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
        <table><tr>
          <td style="width:36px;height:36px;background:#e0f7f4;border-radius:50%;text-align:center;vertical-align:middle;font-weight:800;color:#00bfa5;font-size:14px;">1</td>
          <td style="padding-left:14px;"><p style="margin:0;font-size:14px;font-weight:600;color:#1a2f5e;">Connect your Shopify store</p><p style="margin:2px 0 0;font-size:12px;color:#64748b;">Go to your dashboard and click "Connect Shopify store"</p></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
        <table><tr>
          <td style="width:36px;height:36px;background:#e0f7f4;border-radius:50%;text-align:center;vertical-align:middle;font-weight:800;color:#00bfa5;font-size:14px;">2</td>
          <td style="padding-left:14px;"><p style="margin:0;font-size:14px;font-weight:600;color:#1a2f5e;">Customize your receipt style</p><p style="margin:2px 0 0;font-size:12px;color:#64748b;">Choose from 4 beautiful styles â Minimal, Bold, Classic, or Luxury</p></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:12px 0;">
        <table><tr>
          <td style="width:36px;height:36px;background:#e0f7f4;border-radius:50%;text-align:center;vertical-align:middle;font-weight:800;color:#00bfa5;font-size:14px;">3</td>
          <td style="padding-left:14px;"><p style="margin:0;font-size:14px;font-weight:600;color:#1a2f5e;">Watch receipts send automatically</p><p style="margin:2px 0 0;font-size:12px;color:#64748b;">Every paid order triggers a branded receipt to your customer</p></td>
        </tr></table>
      </td></tr>
    </table>

    <!-- CTA -->
    <div style="text-align:center;margin-top:32px;">
      <a href="https://app.tryrecivo.com/dashboard" style="display:inline-block;background:#00bfa5;color:white;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;">Go to dashboard â</a>
    </div>

    <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.6;">
      Your free plan includes <strong style="color:#64748b;">500 emails/month</strong>.<br>
      Need more? <a href="https://app.tryrecivo.com/dashboard/billing" style="color:#00bfa5;font-weight:600;text-decoration:none;">Upgrade anytime â</a>
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #f1f5f9;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">
      Â© 2026 Recivo Â· <a href="https://tryrecivo.com" style="color:#00bfa5;text-decoration:none;">tryrecivo.com</a><br>
      You're receiving this because you signed up for Recivo.
    </p>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`

  await resend.emails.send({
    from: 'Recivo <receipts@tryrecivo.com>',
    to: email,
    subject: 'Welcome to Recivo â your account is ready ð',
    html,
  })

  return NextResponse.json({ ok: true })
}
