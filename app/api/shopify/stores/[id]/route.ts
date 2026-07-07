import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const storeId = params.id

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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Only delete if the store belongs to this user
  const { data: store, error: fetchErr } = await supabase
    .from('stores')
    .select('id, user_id, shop_domain, access_token')
    .eq('id', storeId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  // Optionally revoke the token on Shopify's side (uninstall the app)
  try {
    await fetch(`https://${store.shop_domain}/admin/api/2026-04/api_permissions/current.json`, {
      method: 'DELETE',
      headers: { 'X-Shopify-Access-Token': store.access_token },
    })
  } catch {
    // Ignore – token may already be revoked; proceed with local deletion
  }

  // Delete from our database
  const { error: deleteErr } = await supabase
    .from('stores')
    .delete()
    .eq('id', storeId)
    .eq('user_id', user.id)

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
