import { useState, useEffect, useCallback, useRef } from 'react'
import { MCPOAuthClient } from '../client'
import {
  OAuthClientConfig,
  AuthFlowContext,
  OAuthFlowState,
  StoredToken,
  PKCEMethod,
  TokenStorage,
  OAuthError,
  MCPDiscoveryError,
} from '../types'

// ===== OAuth Client Hook =====

export interface UseOAuthClientConfig {
  // Required: OAuth flow configuration
  redirect_uris: string[]
  scope?: string
  
  // Required: Client registration details for DCR
  client_name: string
  client_uri?: string
  
  // Optional: Technical configuration
  pkce_method?: PKCEMethod
  discovery_timeout?: number
  token_storage?: TokenStorage
  autoRefresh?: boolean
}

export function useOAuthClient(config: UseOAuthClientConfig) {
  const clientRef = useRef<MCPOAuthClient | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Initialize client
  useEffect(() => {
    const client = new MCPOAuthClient(config)
    clientRef.current = client
    setIsReady(true)

    return () => {
      // Cleanup if needed
      clientRef.current = null
      setIsReady(false)
    }
  	}, [config.redirect_uris, config.client_name])

  return {
    client: clientRef.current,
    isReady,
  }
}

// ===== OAuth Flow Hook =====

export interface UseOAuthFlowOptions {
  client: MCPOAuthClient | null
  resourceURL: string
  onSuccess?: (token: StoredToken) => void
  onError?: (error: OAuthError | MCPDiscoveryError) => void
}

export function useOAuthFlow({
  client,
  resourceURL,
  onSuccess,
  onError,
}: UseOAuthFlowOptions) {
  const [state, setState] = useState<OAuthFlowState>('idle')
  const [context, setContext] = useState<AuthFlowContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Listen to client events
  useEffect(() => {
    if (!client) return

    const handleStateChange = ({ state, context }: { state: OAuthFlowState; context: AuthFlowContext }) => {
      if (context.resource_url === resourceURL) {
        setState(state)
        setContext(context)
        setError(context.error || null)
        setIsLoading(['discovering_metadata', 'preparing_authorization', 'exchanging_code'].includes(state))
      }
    }

    const handleTokenUpdated = ({ resource, token }: { resource: string; token: StoredToken }) => {
      if (resource === resourceURL) {
        onSuccess?.(token)
      }
    }

    const handleError = ({ error }: { error: OAuthError | MCPDiscoveryError }) => {
      setError(error.message)
      onError?.(error)
    }

    client.on('state_change', handleStateChange)
    client.on('token_updated', handleTokenUpdated)
    client.on('error', handleError)

    return () => {
      client.off('state_change', handleStateChange)
      client.off('token_updated', handleTokenUpdated)
      client.off('error', handleError)
    }
  }, [client, resourceURL, onSuccess, onError])

  // Start OAuth flow
  const startFlow = useCallback(async () => {
    if (!client) throw new Error('OAuth client not initialized')
    
    try {
      setError(null)
      const authURL = await client.startAuthFlow(resourceURL)
      
      // Redirect to authorization URL
      if (typeof window !== 'undefined') {
        window.location.href = authURL
      }
      
      return authURL
    } catch (err) {
      const error = err as OAuthError | MCPDiscoveryError
      setError(error.message)
      onError?.(error)
      throw error
    }
  }, [client, resourceURL, onError])

  // Handle callback (usually called in redirect URI page)
  const handleCallback = useCallback(async (callbackURL?: string) => {
    if (!client) throw new Error('OAuth client not initialized')
    
    const url = callbackURL || (typeof window !== 'undefined' ? window.location.href : '')
    if (!url) throw new Error('No callback URL provided')

    try {
      setError(null)
      const token = await client.handleCallback(url)
      onSuccess?.(token)
      return token
    } catch (err) {
      const error = err as OAuthError
      setError(error.message)
      onError?.(error)
      throw error
    }
  }, [client, onSuccess, onError])

  // Check if we have a valid token
  const checkToken = useCallback(async () => {
    if (!client) return false
    return await client.hasValidToken(resourceURL)
  }, [client, resourceURL])

  // Get access token
  const getAccessToken = useCallback(async () => {
    if (!client) return null
    return await client.getAccessToken(resourceURL)
  }, [client, resourceURL])

  // Remove token
  const removeToken = useCallback(async () => {
    if (!client) return
    await client.removeToken(resourceURL)
  }, [client, resourceURL])

  return {
    state,
    context,
    error,
    isLoading,
    startFlow,
    handleCallback,
    checkToken,
    getAccessToken,
    removeToken,
  }
}

// ===== Token Hook =====

export function useToken(client: MCPOAuthClient | null, resourceURL: string) {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshToken = useCallback(async () => {
    if (!client) return null

    setIsLoading(true)
    setError(null)

    try {
      const accessToken = await client.getAccessToken(resourceURL)
      setToken(accessToken)
      return accessToken
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get token'
      setError(errorMessage)
      setToken(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [client, resourceURL])

  // Load token on mount and when dependencies change
  useEffect(() => {
    refreshToken()
  }, [refreshToken])

  // Listen for token updates
  useEffect(() => {
    if (!client) return

    const handleTokenUpdated = ({ resource }: { resource: string }) => {
      if (resource === resourceURL) {
        refreshToken()
      }
    }

    const handleTokenRemoved = ({ resource }: { resource: string }) => {
      if (resource === resourceURL) {
        setToken(null)
      }
    }

    client.on('token_updated', handleTokenUpdated)
    client.on('token_removed', handleTokenRemoved)

    return () => {
      client.off('token_updated', handleTokenUpdated)
      client.off('token_removed', handleTokenRemoved)
    }
  }, [client, resourceURL, refreshToken])

  return {
    token,
    isLoading,
    error,
    refresh: refreshToken,
  }
}

// ===== Multiple Resources Hook =====

export function useOAuthResources(client: MCPOAuthClient | null, resourceURLs: string[]) {
  const [tokens, setTokens] = useState<Record<string, string | null>>({})
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const updateToken = useCallback((resourceURL: string, token: string | null) => {
    setTokens(prev => ({ ...prev, [resourceURL]: token }))
  }, [])

  const updateLoading = useCallback((resourceURL: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [resourceURL]: loading }))
  }, [])

  // Load tokens for all resources
  const loadAllTokens = useCallback(async () => {
    if (!client) return

    const promises = resourceURLs.map(async (resourceURL) => {
      updateLoading(resourceURL, true)
      try {
        const token = await client.getAccessToken(resourceURL)
        updateToken(resourceURL, token)
      } catch (error) {
        updateToken(resourceURL, null)
      } finally {
        updateLoading(resourceURL, false)
      }
    })

    await Promise.all(promises)
  }, [client, resourceURLs, updateToken, updateLoading])

  // Check which resources need authentication
  const checkAuthStatus = useCallback(async () => {
    if (!client) return {}

    const results: Record<string, boolean> = {}
    
    for (const resourceURL of resourceURLs) {
      results[resourceURL] = await client.hasValidToken(resourceURL)
    }

    return results
  }, [client, resourceURLs])

  useEffect(() => {
    loadAllTokens()
  }, [loadAllTokens])

  return {
    tokens,
    loadingStates,
    loadAllTokens,
    checkAuthStatus,
  }
} 