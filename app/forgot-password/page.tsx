'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center hover:opacity-80 transition-opacity mb-2">
            <img src="/logo.png" alt="tryrecivo" width={120} />
          </Link>
          <h1 className="text-2xl font-bold mt-2" style={{color:'#1a2f5e'}}>Reset your password</h1>
          <p className="text-gray-500 text-sm mt-1">We&apos;ll send you a link to reset it</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:'#e0f7f4'}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00bfa5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-gray-700 font-semibold mb-2">Check your inbox</p>
            <p className="text-gray-500 text-sm mb-6">We sent a password reset link to <strong>{email}</strong></p>
            <Link href="/login" className="text-sm font-semibold" style={{color:'#00bfa5'}}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 text-gray-900"
                placeholder="you@store.com"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold transition-all"
              style={{background: loading ? '#94a3b8' : '#1a2f5e'}}
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>

            <p className="text-center text-sm text-gray-500">
              <Link href="/login" className="font-semibold" style={{color:'#00bfa5'}}>
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
