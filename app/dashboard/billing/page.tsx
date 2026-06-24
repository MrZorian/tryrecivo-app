'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    emails: '500',
    features: [
      '1 store',
      'Basic receipt style',
      'Brand color customization',
      'Full order breakdown',
    ],
    locked: ['Modern, Classic & Luxury styles', 'Custom thank-you message', 'Return policy & disclaimer', 'Social links', 'Remove Recivo branding'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    emails: '5,000',
    popular: true,
    features: [
      '1 store',
      'Basic, Modern & Classic styles',
      'Custom thank-you message',
      'Return policy & disclaimer',
      'Social media links in footer',
      'Remove Recivo branding',
    ],
    locked: ['Luxury style'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 49,
    emails: '20,000',
    features: [
      '3 stores',
      'All 4 receipt styles incl. Luxury',
      'Everything in Starter',
      'Custom sending domain',
      'Analytics dashboard',
      'Priority support',
    ],
    locked: [],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    emails: 'Unlimited',
    features: [
      'Unlimited stores',
      'All receipt styles',
      'Everything in Growth',
      'White-label (no Recivo branding)',
      'API access',
      'Dedicated support',
    ],
    locked: [],
  },
]

function BillingContent() {
  const [currentPlan, setCurrentPlan] = useState('free')
  const [emailsUsed, setEmailsUsed] = useState(0)
  const [emailsLimit, setEmailsLimit] = useState(500)
  const [hasStore, setHasStore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [payMethod, setPayMethod] = useState<'shopify' | 'card'>('shopify')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const upgraded = searchParams.get('upgraded')
  const source   = searchParams.get('source')
  const error    = searchParams.get('error')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, emails_used, emails_limit')
        .eq('id', user.id)
        .single()
      if (profile) {
        setCurrentPlan(profile.plan || 'free')
        setEmailsUsed(profile.emails_used || 0)
        setEmailsLimit(profile.emails_limit || 500)
      }

      const { data: stores } = await supabase.from('stores').select('id').eq('user_id', user.id).limit(1)
      setHasStore((stores?.length || 0) > 0)
      setLoading(false)
    }
    load()
  }, [])

  const handleUpgrade = (planId: string) => {
    setUpgrading(planId)
    if (payMethod === 'card') {
      window.location.href = `/api/stripe/checkout?plan=${planId}`
    } else {
      if (!hasStore) { router.push('/dashboard/connect'); return }
      window.location.href = `/api/shopify/billing/create?plan=${planId}`
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity mr-1">
          <img src="/logo.png" alt="tryrecivo" width={120} />
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-sm" style={{ color: '#1a2f5e' }}>Billing</span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Success banner */}
        {upgraded && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold text-emerald-800">Plan upgraded successfully!</p>
              <p className="text-sm text-emerald-600">
                Your new limits are active immediately.
                {source === 'stripe' && ' Billed via credit card.'}
              </p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error === 'charge_declined'
              ? '⚠️ Upgrade was cancelled. No charge was made.'
              : `⚠️ Something went wrong (${error}). Please try again.`}
          </div>
        )}

        {/* Shopify store warning (only for Shopify billing) */}
        {!hasStore && payMethod === 'shopify' && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            ⚠️ Shopify billing requires a connected store.{' '}
            <Link href="/dashboard/connect" className="font-semibold underline">Connect now</Link>{' '}
            or switch to <button className="font-semibold underline" onClick={() => setPayMethod('card')}>credit card</button>.
          </div>
        )}

        {/* Usage bar */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm font-semibold text-gray-700">Current usage</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold text-white capitalize" style={{ background: '#1a2f5e' }}>{currentPlan}</span>
            </div>
            <span className="text-sm text-gray-500">
              {emailsUsed.toLocaleString()} / {emailsLimit === 999999 ? '∞' : emailsLimit.toLocaleString()} emails
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (emailsUsed / Math.max(emailsLimit, 1)) * 100)}%`, background: '#00bfa5' }}
            />
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#1a2f5e' }}>Choose your plan</h1>
          <p className="text-gray-500 text-sm">Cancel anytime.</p>
        </div>

        {/* Payment method toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
            <button
              onClick={() => setPayMethod('shopify')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${payMethod === 'shopify' ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              style={payMethod === 'shopify' ? { background: '#1a2f5e' } : {}}
            >
              🛍 Pay via Shopify
            </button>
            <button
              onClick={() => setPayMethod('card')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${payMethod === 'card' ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              style={payMethod === 'card' ? { background: '#1a2f5e' } : {}}
            >
              💳 Pay by card
            </button>
          </div>
        </div>

        {payMethod === 'shopify' && (
          <p className="text-center text-xs text-gray-400 mb-6">
            Charged through your Shopify account. Manage in your Shopify admin.
          </p>
        )}
        {payMethod === 'card' && (
          <p className="text-center text-xs text-gray-400 mb-6">
            Secure checkout via Stripe. No Shopify store required.
          </p>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {plans.map(plan => {
            const isCurrent = currentPlan === plan.id
            const isHigher  = plans.findIndex(p => p.id === plan.id) > plans.findIndex(p => p.id === currentPlan)

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-xl p-6 border shadow-sm relative flex flex-col ${plan.popular ? 'border-2' : 'border-gray-100'}`}
                style={plan.popular ? { borderColor: '#1a2f5e' } : {}}
              >
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap" style={{ background: '#1a2f5e' }}>
                    MOST POPULAR
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap" style={{ background: '#00bfa5' }}>
                    CURRENT PLAN
                  </div>
                )}

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{plan.name}</p>
                <p className="text-3xl font-bold mb-1" style={{ color: '#1a2f5e' }}>
                  ${plan.price}<span className="text-base font-normal text-gray-400">/mo</span>
                </p>
                <p className="text-xs font-semibold mb-5" style={{ color: '#00bfa5' }}>{plan.emails} emails/mo</p>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <span style={{ color: '#00bfa5' }}>✓</span> {f}
                    </li>
                  ))}
                  {plan.locked.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <span>✗</span> {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button disabled className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-400 cursor-default">
                    Current plan
                  </button>
                ) : plan.price === 0 ? (
                  <button disabled className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-400 cursor-default border border-gray-200">
                    Free
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgrading === plan.id}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style={plan.popular
                      ? { background: upgrading === plan.id ? '#94a3b8' : '#1a2f5e', color: 'white' }
                      : { background: 'transparent', color: '#1a2f5e', border: '1.5px solid #1a2f5e', opacity: upgrading === plan.id ? 0.6 : 1 }
                    }
                  >
                    {upgrading === plan.id
                      ? 'Redirecting...'
                      : isHigher ? `Upgrade ${payMethod === 'card' ? '💳' : '🛍'}` : 'Downgrade'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          {payMethod === 'shopify'
            ? 'Billed via Shopify. Cancel anytime from your Shopify admin.'
            : 'Billed via Stripe. Secure card processing. Cancel anytime.'}
        </p>
      </div>
    </div>
  )
}

export default function Billing() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>}>
      <BillingContent />
    </Suspense>
  )
}
