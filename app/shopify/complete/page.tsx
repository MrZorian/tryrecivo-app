'use client'
/**
 * /shopify/complete
 *
 * Intermediate client page hit after:
 *   (a) Shopify install -> signup (no email confirmation required), OR
 *   (b) Email confirmation link -> Supabase redirects here via emailRedirectTo
 *
 * Supabase email-verification links may carry an access_token / refresh_token
 * in the URL hash, which only the browser can process. We call getSession() to
 * make the client SDK pick that up and persist the session, then hand off to the
 * server-side complete-install route which reads the pending cookie and creates
 * the store record.
 */
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function ShopifyCompletePage() {
  const supabase = createClient()

  useEffect(() => {
    async function complete() {
      await supabase.auth.getSession()
      window.location.href = '/api/shopify/complete-install'
    }
    complete()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div
          className="animate-spin h-10 w-10 border-4 border-t-transparent rounded-full mx-auto mb-4"
          style={{ borderColor: '#00bfa5', borderTopColor: 'transparent' }}
        />
        <p className="text-gray-600 font-medium">Connecting your Shopify store...</p>
        <p className="text-gray-400 text-sm mt-1">This will only take a moment.</p>
      </div>
    </div>
  )
}
