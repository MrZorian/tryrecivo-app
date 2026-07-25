// Loosely typed to avoid @supabase/supabase-js generic mismatches across call sites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseServiceClient = any

export interface StoreTokenRow {
  shop_domain: string
  access_token: string | null
  refresh_token?: string | null
  token_expires_at?: string | null
}

/**
 * Returns a valid Shopify Admin API access token for the store, refreshing it
 * first if the current expiring offline token has (nearly) expired.
 *
 * Shopify offline tokens now expire (~1h) and must be rotated using the stored
 * refresh_token via `grant_type=refresh_token`. Without this, every server-side
 * Shopify call — including billing — fails with "Invalid API key or access token"
 * once the token lapses. See:
 * https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/offline-access-tokens#refreshing-expiring-offline-tokens
 */
export async function getValidAccessToken(
  store: StoreTokenRow,
  supabase: SupabaseServiceClient
): Promise<string | null> {
  const now = Date.now()
  const expiresAt = store.token_expires_at
    ? new Date(store.token_expires_at).getTime()
    : 0

  // Token still valid (60s safety buffer) → use it as-is.
  if (store.access_token && expiresAt > now + 60_000) {
    return store.access_token
  }

  // No refresh token available → return whatever we have (may be a legacy token).
  if (!store.refresh_token) {
    return store.access_token ?? null
  }

  // Refresh the expiring offline token.
  try {
    const res = await fetch(
      `https://${store.shop_domain}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          grant_type: 'refresh_token',
          refresh_token: store.refresh_token,
        }),
      }
    )
    const json = await res.json()
    if (!json?.access_token) {
      console.error('[shopifyToken] refresh failed:', JSON.stringify(json))
      return store.access_token ?? null
    }

    const newExpiresAt = json.expires_in
      ? new Date(Date.now() + json.expires_in * 1000).toISOString()
      : null

    await supabase
      .from('stores')
      .update({
        access_token: json.access_token,
        refresh_token: json.refresh_token || store.refresh_token,
        token_expires_at: newExpiresAt,
      })
      .eq('shop_domain', store.shop_domain)

    return json.access_token as string
  } catch (err) {
    console.error('[shopifyToken] refresh error:', err)
    return store.access_token ?? null
  }
}
