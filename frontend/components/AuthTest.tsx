'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AuthTest() {
  const { user, loading, signUp, signIn, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await signUp(email, password)
      setMessage('Sign up successful! Check your email to confirm.')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await signIn(email, password)
      setMessage('Signed in successfully!')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setMessage('Signed out successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed')
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      {user ? (
        <div>
          <h2 className="text-xl font-bold mb-4">Welcome, {user.email}!</h2>
          <Button onClick={handleSignOut} className="w-full bg-red-600 hover:bg-red-700">
            Sign Out
          </Button>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-bold mb-4">Sign In / Sign Up</h2>
          <form onSubmit={handleSignUp} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                Sign Up
              </Button>
              <Button
                type="button"
                onClick={handleSignIn}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Sign In
              </Button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {message && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {message}
        </div>
      )}
    </div>
  )
}
