'use client'

import { OAuthCallbackHandler, useOAuthClient } from 'mcpresso-oauth-client/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const OAUTH_CONFIG = {
  redirect_uri: process.env.NEXT_PUBLIC_BASE_URL 
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`
    : 'http://localhost:3000/auth/callback',
  scope: 'read write admin',
  client_name: 'MCP Dashboard',
  client_uri: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
}

export default function OAuthCallbackPage() {
  const router = useRouter()
  const { client } = useOAuthClient(OAUTH_CONFIG)

  // Auto-redirect after a delay if callback doesn't complete
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push('/dashboard?error=callback_timeout')
    }, 30000) // 30 second timeout

    return () => clearTimeout(timeout)
  }, [router])

  return (
    <div className="min-h-screen bg-background">
      <OAuthCallbackHandler
        client={client}
        onSuccess={(token) => {
          console.log('OAuth callback successful:', token)
          router.push('/dashboard?success=connected')
        }}
        onError={(error) => {
          console.error('OAuth callback error:', error)
          router.push(`/dashboard?error=${encodeURIComponent(error.message)}`)
        }}
      />
    </div>
  )
} 