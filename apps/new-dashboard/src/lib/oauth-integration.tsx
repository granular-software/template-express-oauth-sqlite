'use client'

import React from 'react'
import {
  OAuthProvider,
  OAuthConnectButton,
  OAuthFlowProgress,
  OAuthStatusCard,
  useOAuthClient,
  useOAuthFlow,
  useToken,
} from 'mcpresso-oauth-client/react'
import type { StoredToken } from 'mcpresso-oauth-client'

// ===== Configuration =====

const OAUTH_CONFIG = {
  redirect_uri: process.env.NEXT_PUBLIC_BASE_URL 
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`
    : 'http://localhost:3000/auth/callback',
  scope: 'read write admin',
  client_name: 'MCP Dashboard',
  client_uri: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
}

// ===== OAuth Provider Wrapper =====

export function MCPOAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <OAuthProvider config={OAUTH_CONFIG}>
      {children}
    </OAuthProvider>
  )
}

// ===== MCP Server Connection Component =====

export interface MCPServerConnectionProps {
  serverUrl: string
  serverName: string
  description?: string
  onConnected?: (token: StoredToken) => void
  className?: string
}

export function MCPServerConnection({
  serverUrl,
  serverName,
  description,
  onConnected,
  className = '',
}: MCPServerConnectionProps) {
  const { client } = useOAuthClient(OAUTH_CONFIG)
  const { state, error, isLoading } = useOAuthFlow({
    client,
    resourceURL: serverUrl,
    onSuccess: (token) => {
      console.log(`Connected to ${serverName}:`, token)
      onConnected?.(token)
    },
    onError: (error) => {
      console.error(`Failed to connect to ${serverName}:`, error)
    },
  })

  return (
    <div className={`border rounded-lg p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{serverName}</h3>
          <p className="text-sm text-muted-foreground">{serverUrl}</p>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        
        <OAuthConnectButton
          client={client}
          resourceURL={serverUrl}
          onSuccess={onConnected}
        >
          Connect
        </OAuthConnectButton>
      </div>

      {(state !== 'idle' && state !== 'completed') && (
        <OAuthFlowProgress
          state={state}
          error={error}
          className="mt-4"
        />
      )}
    </div>
  )
}

// ===== MCP Servers Dashboard =====

export interface MCPServer {
  id: string
  name: string
  url: string
  description?: string
  category?: string
}

export interface MCPServersDashboardProps {
  servers: MCPServer[]
  onServerConnected?: (server: MCPServer, token: StoredToken) => void
}

export function MCPServersDashboard({ 
  servers, 
  onServerConnected 
}: MCPServersDashboardProps) {
  const { client } = useOAuthClient(OAUTH_CONFIG)
  const [connectedServers, setConnectedServers] = React.useState<Set<string>>(new Set())

  // Check initial connection status
  React.useEffect(() => {
    const checkConnections = async () => {
      if (!client) return

      const connected = new Set<string>()
      for (const server of servers) {
        const hasToken = await client.hasValidToken(server.url)
        if (hasToken) {
          connected.add(server.id)
        }
      }
      setConnectedServers(connected)
    }

    checkConnections()
  }, [client, servers])

  const handleServerConnected = (server: MCPServer, token: StoredToken) => {
    setConnectedServers(prev => new Set([...prev, server.id]))
    onServerConnected?.(server, token)
  }

  // Group servers by category
  const groupedServers = servers.reduce((acc, server) => {
    const category = server.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(server)
    return acc
  }, {} as Record<string, MCPServer[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">MCP Servers</h2>
        <div className="text-sm text-muted-foreground">
          {connectedServers.size} of {servers.length} connected
        </div>
      </div>

      {Object.entries(groupedServers).map(([category, categoryServers]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-lg font-semibold">{category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryServers.map((server) => (
              <MCPServerConnection
                key={server.id}
                serverUrl={server.url}
                serverName={server.name}
                description={server.description}
                onConnected={(token) => handleServerConnected(server, token)}
                className={connectedServers.has(server.id) ? 'border-green-200 bg-green-50' : ''}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ===== MCP API Client Hook =====

export function useMCPRequest(serverUrl: string) {
  const { client } = useOAuthClient(OAUTH_CONFIG)
  const { token, isLoading: tokenLoading } = useToken(client, serverUrl)

  const makeRequest = React.useCallback(async (
    method: string,
    params?: any,
    options?: RequestInit
  ) => {
    if (!token) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options?.headers,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params: params || {},
        id: Date.now(),
      }),
      ...options,
    })

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(`MCP error: ${data.error.message || data.error.code}`)
    }

    return data.result
  }, [serverUrl, token])

  return {
    makeRequest,
    token,
    isLoading: tokenLoading,
    isAuthenticated: !!token,
  }
}

// ===== Tools List Component =====

export function MCPToolsList({ serverUrl }: { serverUrl: string }) {
  const { makeRequest, isAuthenticated, isLoading } = useMCPRequest(serverUrl)
  const [tools, setTools] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!isAuthenticated) return

    const loadTools = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const result = await makeRequest('tools/list')
        setTools(result.tools || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tools')
      } finally {
        setLoading(false)
      }
    }

    loadTools()
  }, [isAuthenticated, makeRequest])

  if (!isAuthenticated) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Connect to the MCP server to view available tools
      </div>
    )
  }

  if (isLoading || loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading tools...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Failed to load tools: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Available Tools</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool, index) => (
          <div key={tool.name || index} className="border rounded-lg p-4">
            <h4 className="font-medium">{tool.name}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {tool.description || 'No description available'}
            </p>
            {tool.inputSchema && (
              <div className="mt-2 text-xs text-muted-foreground">
                Schema: {JSON.stringify(tool.inputSchema, null, 2)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Connection Status Bar =====

export function MCPConnectionStatus({ servers }: { servers: MCPServer[] }) {
  const { client } = useOAuthClient(OAUTH_CONFIG)
  const [statuses, setStatuses] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    const checkStatuses = async () => {
      if (!client) return

      const newStatuses: Record<string, boolean> = {}
      for (const server of servers) {
        newStatuses[server.id] = await client.hasValidToken(server.url)
      }
      setStatuses(newStatuses)
    }

    checkStatuses()
    const interval = setInterval(checkStatuses, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [client, servers])

  const connectedCount = Object.values(statuses).filter(Boolean).length

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${
        connectedCount === servers.length ? 'bg-green-500' :
        connectedCount > 0 ? 'bg-yellow-500' : 'bg-red-500'
      }`} />
      <span>
        {connectedCount} of {servers.length} MCP servers connected
      </span>
    </div>
  )
} 