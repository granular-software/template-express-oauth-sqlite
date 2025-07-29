import React from 'react'
import { useOAuthFlow, useOAuthClient, UseOAuthClientConfig } from './hooks'
import { MCPOAuthClient } from '../client'
import { OAuthFlowState, StoredToken, OAuthError, MCPDiscoveryError } from '../types'

// ===== OAuth Flow Progress Component =====

export interface OAuthFlowProgressProps {
  state: OAuthFlowState
  error?: string | null
  className?: string
}

const flowSteps: { state: OAuthFlowState; label: string; description: string }[] = [
  { state: 'discovering_metadata', label: 'Metadata Discovery', description: 'Discovering OAuth server configuration' },
  { state: 'preparing_authorization', label: 'Client Registration', description: 'Preparing client authorization' },
  { state: 'awaiting_authorization', label: 'Request Authorization', description: 'Redirecting to authorization server' },
  { state: 'exchanging_code', label: 'Token Request', description: 'Exchanging authorization code for tokens' },
  { state: 'completed', label: 'Authentication Complete', description: 'Successfully authenticated' },
]

export function OAuthFlowProgress({ state, error, className = '' }: OAuthFlowProgressProps) {
  const getStepState = (stepState: OAuthFlowState) => {
    if (state === 'error') return 'error'
    if (state === stepState) return 'current'
    
    const currentIndex = flowSteps.findIndex(step => step.state === state)
    const stepIndex = flowSteps.findIndex(step => step.state === stepState)
    
    return stepIndex < currentIndex ? 'completed' : 'pending'
  }

  return (
    <div className={`oauth-flow-progress ${className}`}>
      <div className="flex flex-col space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">OAuth Flow Progress</h2>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex">
              <div className="text-red-400">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Authentication Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {flowSteps.map((step, index) => {
            const stepState = getStepState(step.state)
            
            return (
              <div key={step.state} className="flex items-center">
                <div className="flex-shrink-0">
                  {stepState === 'completed' ? (
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : stepState === 'current' ? (
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    </div>
                  ) : stepState === 'error' ? (
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-gray-500 rounded-full" />
                    </div>
                  )}
                </div>
                
                <div className="ml-4 flex-1">
                  <h3 className={`text-sm font-medium ${
                    stepState === 'completed' ? 'text-green-900' :
                    stepState === 'current' ? 'text-blue-900' :
                    stepState === 'error' ? 'text-red-900' :
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </h3>
                  <p className={`text-xs ${
                    stepState === 'completed' ? 'text-green-700' :
                    stepState === 'current' ? 'text-blue-700' :
                    stepState === 'error' ? 'text-red-700' :
                    'text-gray-400'
                  }`}>
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ===== OAuth Connect Button =====

export interface OAuthConnectButtonProps {
  client: MCPOAuthClient | null
  resourceURL: string
  onSuccess?: (token: StoredToken) => void
  onError?: (error: OAuthError | MCPDiscoveryError) => void
  children?: React.ReactNode
  className?: string
  disabled?: boolean
}

export function OAuthConnectButton({
  client,
  resourceURL,
  onSuccess,
  onError,
  children = 'Connect',
  className = '',
  disabled = false,
}: OAuthConnectButtonProps) {
  const { state, error, isLoading, startFlow, checkToken } = useOAuthFlow({
    client,
    resourceURL,
    onSuccess,
    onError,
  })

  const [hasToken, setHasToken] = React.useState(false)

  React.useEffect(() => {
    if (client) {
      checkToken().then(setHasToken)
    }
  }, [client, checkToken])

  const handleClick = async () => {
    if (hasToken) return
    
    try {
      await startFlow()
    } catch (error) {
      // Error handling is done by the hook
    }
  }

  const getButtonText = () => {
    if (hasToken) return 'Connected'
    if (isLoading) {
      switch (state) {
        case 'discovering_metadata': return 'Discovering...'
        case 'preparing_authorization': return 'Preparing...'
        case 'exchanging_code': return 'Connecting...'
        default: return 'Loading...'
      }
    }
    return children
  }

  const getButtonStyle = () => {
    if (hasToken) return 'bg-green-600 hover:bg-green-700'
    if (error) return 'bg-red-600 hover:bg-red-700'
    return 'bg-blue-600 hover:bg-blue-700'
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading || hasToken}
      className={`
        inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white
        ${getButtonStyle()}
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        transition-colors duration-200
        ${className}
      `}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      
      {hasToken && (
        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      
      {getButtonText()}
    </button>
  )
}

// ===== OAuth Status Card =====

export interface OAuthStatusCardProps {
  client: MCPOAuthClient | null
  resourceURL: string
  title?: string
  className?: string
}

export function OAuthStatusCard({ 
  client, 
  resourceURL, 
  title,
  className = '' 
}: OAuthStatusCardProps) {
  const { state, context, error } = useOAuthFlow({
    client,
    resourceURL,
  })

  const [hasToken, setHasToken] = React.useState(false)

  React.useEffect(() => {
    if (client) {
      client.hasValidToken(resourceURL).then(setHasToken)
    }
  }, [client, resourceURL])

  const getStatusColor = () => {
    if (error) return 'border-red-200 bg-red-50'
    if (hasToken) return 'border-green-200 bg-green-50'
    if (state === 'idle') return 'border-gray-200 bg-gray-50'
    return 'border-blue-200 bg-blue-50'
  }

  const getStatusIcon = () => {
    if (error) {
      return <div className="w-3 h-3 bg-red-500 rounded-full" />
    }
    if (hasToken) {
      return <div className="w-3 h-3 bg-green-500 rounded-full" />
    }
    if (state !== 'idle') {
      return <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
    }
    return <div className="w-3 h-3 bg-gray-400 rounded-full" />
  }

  const getStatusText = () => {
    if (error) return 'Authentication Error'
    if (hasToken) return 'Connected'
    if (state === 'idle') return 'Not Connected'
    return 'Connecting...'
  }

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {title || 'OAuth Status'}
            </h3>
            <p className="text-xs text-gray-600">{getStatusText()}</p>
          </div>
        </div>
        
        {context && (
          <div className="text-xs text-gray-500">
            {new URL(resourceURL).hostname}
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-3 text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}

// ===== OAuth Provider Component =====

export interface OAuthProviderProps {
  config: UseOAuthClientConfig
  children: React.ReactNode
}

export function OAuthProvider({ config, children }: OAuthProviderProps) {
  const { client, isReady } = useOAuthClient(config)

  if (!isReady) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="oauth-provider">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { client } as any)
        }
        return child
      })}
    </div>
  )
}

// ===== OAuth Callback Handler =====

export interface OAuthCallbackHandlerProps {
  client: MCPOAuthClient | null
  onSuccess?: (token: StoredToken) => void
  onError?: (error: OAuthError) => void
  children?: React.ReactNode
}

export function OAuthCallbackHandler({
  client,
  onSuccess,
  onError,
  children,
}: OAuthCallbackHandlerProps) {
  const [isProcessing, setIsProcessing] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const handleCallback = async () => {
      if (!client) return

      try {
        const token = await client.handleCallback(window.location.href)
        onSuccess?.(token)
      } catch (err) {
        const error = err as OAuthError
        setError(error.message)
        onError?.(error)
      } finally {
        setIsProcessing(false)
      }
    }

    handleCallback()
  }, [client, onSuccess, onError])

  if (children) {
    return <>{children}</>
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center mb-4">
            <div className="text-red-400 mr-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-900">Authentication Failed</h3>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md">
        <div className="flex items-center mb-4">
          <div className="text-green-400 mr-3">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-green-900">Authentication Successful</h3>
        </div>
        <p className="text-green-700">You have been successfully authenticated. You can close this window.</p>
      </div>
    </div>
  )
} 