'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      }
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    // Send custom welcome email
    try {
      await fetch('/api/auth/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })
    } catch (_) {
      // Non-blocking - don't fail signup if welcome email fails
    }

    // Check if email confirmation is required
    const needsConfirmation = !data.session
    if (needsConfirmation) {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4" style={{background:'#1a2f5e'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="13" rx="2" stroke="#00bfa5" strokeWidth="1.8"/>
              <polyline points="3,5 12,12 21,5" stroke="#00bfa5" strokeWidth="1.8" strokeLinejoin="round"/>
              <circle cx="19" cy="15" r="3.5" fill="#00bfa5"/>
              <polyline points="17,15 18.5,16.5 21,13.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{color:'#1a2f5e'}}>Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Start sending branded receipts in 2 minutes</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 text-gray-900"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 text-gray-900"
              placeholder="you@store.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 text-gray-900"
              placeholder="Min 8 characters"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-white font-semibold transition-all"
            style={{background: loading ? '#94a3b8' : '#00bfa5'}}
          >
            {loading ? 'Creating account...' : 'Create free account'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Free plan includes 500 emails/month. No credit card needed.
          </p>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold" style={{color:'#1a2f5e'}}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
