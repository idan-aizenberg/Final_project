'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({ children, requireAuth = true, redirectTo }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (requireAuth && !user) {
      // User needs to be authenticated but isn't
      const path = redirectTo || '/sign-in'
      router.push(path as any)
    } else if (!requireAuth && user) {
      // User is authenticated but shouldn't be (e.g., on sign-in page)
      const path = redirectTo || '/dashboard'
      router.push(path as any)
    }
  }, [user, loading, requireAuth, redirectTo, router])

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If auth requirements are not met, don't render children
  if (requireAuth && !user) return null
  if (!requireAuth && user) return null

  return <>{children}</>
}

