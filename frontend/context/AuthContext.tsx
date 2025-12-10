'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  subscription_tier: 'basic' | 'standard' | 'professional' | 'enterprise'
  created_at: string
  updated_at: string
}

interface MockUser {
  id: string
  email: string
}

interface AuthContextType {
  user: MockUser | null
  userProfile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  updateSubscription: (tier: 'basic' | 'standard' | 'professional' | 'enterprise') => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on mount (from localStorage)
    const checkUser = () => {
      try {
        const storedUser = localStorage.getItem('mock_user')
        const storedProfile = localStorage.getItem('mock_profile')
        
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }
        if (storedProfile) {
          setUserProfile(JSON.parse(storedProfile))
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  const signUp = async (email: string, password: string) => {
    // Mock signup - just create a user
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
    
    const mockUser: MockUser = {
      id: Math.random().toString(36).substr(2, 9),
      email,
    }
    
    const mockProfile: UserProfile = {
      id: mockUser.id,
      email,
      full_name: email.split('@')[0],
      subscription_tier: 'basic',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    localStorage.setItem('mock_user', JSON.stringify(mockUser))
    localStorage.setItem('mock_profile', JSON.stringify(mockProfile))
    
    setUser(mockUser)
    setUserProfile(mockProfile)
    
    return { user: mockUser }
  }

  const signIn = async (email: string, password: string) => {
    // Mock signin - accept any credentials for testing
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
    
    const mockUser: MockUser = {
      id: Math.random().toString(36).substr(2, 9),
      email,
    }
    
    const mockProfile: UserProfile = {
      id: mockUser.id,
      email,
      full_name: email.split('@')[0],
      subscription_tier: 'professional',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    localStorage.setItem('mock_user', JSON.stringify(mockUser))
    localStorage.setItem('mock_profile', JSON.stringify(mockProfile))
    
    setUser(mockUser)
    setUserProfile(mockProfile)
    
    return { user: mockUser }
  }

  const signOut = async () => {
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network delay
    
    localStorage.removeItem('mock_user')
    localStorage.removeItem('mock_profile')
    
    setUser(null)
    setUserProfile(null)
  }

  const updateSubscription = async (tier: 'basic' | 'standard' | 'professional' | 'enterprise') => {
    if (!user || !userProfile) throw new Error('User not authenticated')

    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network delay

    const updatedProfile = {
      ...userProfile,
      subscription_tier: tier,
      updated_at: new Date().toISOString(),
    }

    localStorage.setItem('mock_profile', JSON.stringify(updatedProfile))
    setUserProfile(updatedProfile)
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signUp, signIn, signOut, updateSubscription }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
