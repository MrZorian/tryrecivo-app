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
    features: ['1 store', 'All 4 receipt styles', 'Brand color customization', 'Full order breakdown'],
    locked: ['Custom thank-you message', 'Return policy', 'Remove Recivo branding'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    emails: '5,000',
    popular: true,
    features: ['1 store', 'All 4 receipt styles', 'Custom thank-you message', 'Return policy & disclaimer', 'Remove Recivo branding'],
    locked: [],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 49,
    emails: '20,000',
    features: ['3 stores', 'Everything in Starter', 'Custom sending domain', 'Analytics dashboard', 'Social links', 'Priority support'],
    locked: [],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    emails: 'Unlimited',
    features: ['Unlimited stores', 'Everything in Growth', 'White-label (no Recivo branding)', 'API access', 'Dedicated support'],
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const upgraded = searchParams.get('upgraded')
  const error = searchParams.get('error')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('plan, emails_used, emails_limit').eq('id', user.id).single()
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
    if (!hasStore) {
      router.push('/dashboard/connect')
      return
    }
    setUpgrading(planId)
    window.location.href = `/api/shopify/billing/create?plan=${planId}`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">â Dashboard</Link>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-sm" style={{color:'#1a2f5e'}}>Billing</span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Success banner */}
        {upgraded && (
          <div className="mb-6 
