import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email, name } = await req.json()
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

  const firstName = name?.split(' ')[0] || 'there'

  // Generate email verification link via Supabase admin
  let verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.tryrecivo.com'}/dashboard`
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.tryrecivo.com'}/dashboard`,
      },
    })
    if (linkData?.properties?.action_link) {
      verifyUrl = linkData.properties.action_link
    }
  } catch (_) {
    // Fall back to dashboard link if link generation fails
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Welcome to tryrecivo</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.10);">
  <tr><td style="background:#1a2f5e;padding:40px 40px 32px;text-align:center;">
    <img src="https://app.tryrecivo.com/logo.png" alt="tryrecivo" width="140" height="auto" style="display:block;margin:0 auto 20px;max-width:140px;" />
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Welcome to Recivo! &#127881;</h1>
    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.65);font-weight:400;">Your branded receipt journey starts here</p>
  </td></tr>
  <tr><td style="background:#e0f7f4;padding:20px 40px;text-align:center;border-bottom:2px solid #b2f0e8;">
    <p style="margin:0 0 12px;font-size:14px;color:#085041;font-weight:600;">&#9993; One more step &#8212; verify your email to activate your account</p>
    <a href="${verifyUrl}" style="display:inline-block;background:#00bfa5;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.2px;">&#10003; Verify my email</a>
  </td></tr>
  <tr><td style="padding:36px 40px 28px;">
    <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.75;">Hi ${firstName},<br><br>You&rsquo;re all set! Your Recivo account is ready. Here&rsquo;s how to get started in 3 easy steps:</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:14px 0;border-bottom:1px solid #f1f5f9;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:38px;height:38px;min-width:38px;background:#e0f7f4;border-radius:50%;text-align:center;vertical-align:middle;font-weight:800;color:#00bfa5;font-size:15px;">1</td>
          <td style="padding-left:16px;vertical-align:middle;"><p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#1a2f5e;">Connect your Shopify store</p><p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">Go to your dashboard and click &ldquo;Connect Shopify store&rdquo;</p></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:14px 0;border-bottom:1px solid #f1f5f9;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:38px;height:38px;min-width:38px;background:#e0f7f4;border-radius:50%;text-align:center;vertical-align:middle;font-weight:800;color:#00bfa5;font-size:15px;">2</td>
          <td style="padding-left:16px;vertical-align:middle;"><p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#1a2f5e;">Customize your receipt style</p><p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">Choose from 4 beautiful styles &mdash; Basic, Modern, Classic, or Luxury</p></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:14px 0;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:38px;height:38px;min-width:38px;background:#e0f7f4;border-radius:50%;text-align:center;vertical-align:middle;font-weight:800;color:#00bfa5;font-size:15px;">3</td>
          <td style="padding-left:16px;vertical-align:middle;"><p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#1a2f5e;">Watch receipts send automatically</p><p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">Every paid order triggers a branded receipt to your customer</p></td>
        </tr></table>
      </td></tr>
    </table>
    <div style="text-align:center;margin-top:32px;">
      <a href="https://app.tryrecivo.com/dashboard" style="display:inline-block;background:#1a2f5e;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.2px;">Go to dashboard &rarr;</a>
    </div>
    <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.7;">Your free plan includes <strong style="color:#64748b;">500 emails/month</strong>.<br>Need more? <a href="https://app.tryrecivo.com/dashboard/billing" style="color:#00bfa5;font-weight:600;text-decoration:none;">Upgrade anytime &rarr;</a></p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:22px 40px;text-align:center;border-top:1px solid #f1f5f9;">
    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">&copy; 2026 Recivo &middot; <a href="https://tryrecivo.com" style="color:#00bfa5;text-decoration:none;">tryrecivo.com</a><br>You&rsquo;re receiving this because you signed up for Recivo.</p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`

  await resend.emails.send({
    from: 'Recivo <receipts@tryrecivo.com>',
    to: email,
    subject: `Welcome to Recivo, ${firstName}! Verify your email to get started`,
    html,
  })

  return NextResponse.json({ ok: true })
}
