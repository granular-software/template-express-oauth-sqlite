'use client'

import React from 'react'
import { MCPServersDashboard, MCPToolsList, MCPServer } from '../../lib/oauth-integration'
import type { StoredToken } from 'mcpresso-oauth-client'

// Example MCP servers configuration
const EXAMPLE_SERVERS: MCPServer[] = [
  {
    id: 'local-dev',
    name: 'Local Development Server',
    url: 'http://localhost:4000',
    description: 'Local MCP server for development and testing',
    category: 'Development',
  },
  {
    id: 'data-api',
    name: 'Data API Server',
    url: 'https://api.example.com',
    description: 'Production data API with user and content management',
    category: 'Production',
  },
  {
    id: 'analytics',
    name: 'Analytics Server',
    url: 'https://analytics.example.com',
    description: 'Real-time analytics and reporting tools',
    category: 'Analytics',
  },
  {
    id: 'file-server',
    name: 'File Management Server',
    url: 'https://files.example.com',
    description: 'File upload, storage, and processing services',
    category: 'Storage',
  },
]

export default function MCPServersPage() {
  const [selectedServer, setSelectedServer] = React.useState<MCPServer | null>(null)
  const [notifications, setNotifications] = React.useState<string[]>([])

  const handleServerConnected = (server: MCPServer, token: StoredToken) => {
    const message = `Successfully connected to ${server.name}`
    setNotifications(prev => [...prev, message])
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== message))
    }, 5000)
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">MCP Server Management</h1>
        <p className="text-muted-foreground">
          Connect to and manage your Model Context Protocol servers with OAuth authentication.
        </p>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification, index) => (
            <div
              key={index}
              className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800"
            >
              ✅ {notification}
            </div>
          ))}
        </div>
      )}

      {/* Servers Dashboard */}
      <MCPServersDashboard
        servers={EXAMPLE_SERVERS}
        onServerConnected={handleServerConnected}
      />

      {/* Tools Explorer */}
      {selectedServer && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Tools for {selectedServer.name}
            </h2>
            <button
              onClick={() => setSelectedServer(null)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          <MCPToolsList serverUrl={selectedServer.url} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {EXAMPLE_SERVERS.map((server) => (
          <button
            key={server.id}
            onClick={() => setSelectedServer(server)}
            className="p-4 border rounded-lg text-left hover:bg-muted/50 transition-colors"
          >
            <h3 className="font-medium">{server.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              View tools
            </p>
          </button>
        ))}
      </div>

      {/* Development Notes */}
      <div className="bg-muted/30 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold">Development Notes</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Make sure your MCP servers support OAuth 2.1 with PKCE</p>
          <p>• Configure your OAuth client credentials in environment variables</p>
          <p>• The callback URL should be set to: <code>/auth/callback</code></p>
          <p>• For testing, start a local MCP server on <code>http://localhost:4000</code></p>
        </div>
      </div>
    </div>
  )
} 