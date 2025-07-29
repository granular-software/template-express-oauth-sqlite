# mcpresso-oauth-client

A powerful, type-safe OAuth 2.1 PKCE client for Model Context Protocol (MCP) servers. Provides seamless authentication integration with automatic discovery, token management, and React components.

## Features

- ✅ **OAuth 2.1 PKCE Compliant** - Full implementation with S256 code challenge
- ✅ **MCP Discovery** - Automatic OAuth server discovery via RFC 9728
- ✅ **Token Management** - Automatic refresh and secure storage
- ✅ **React Integration** - Ready-to-use hooks and components
- ✅ **TypeScript** - Full type safety with Zod validation
- ✅ **Multiple Storage Options** - Memory, localStorage, sessionStorage
- ✅ **Event System** - Real-time flow state updates
- ✅ **Production Ready** - Error handling, retries, and security

## Installation

```bash
npm install mcpresso-oauth-client
# or
bun add mcpresso-oauth-client
```

## Quick Start

### Basic Usage (Node.js)

```typescript
import { MCPOAuthClient } from 'mcpresso-oauth-client'

// Initialize client - uses Dynamic Client Registration automatically
const client = new MCPOAuthClient({
  redirect_uris: [
    'http://localhost:3000/callback',
    'http://localhost:3001/oauth/callback',
    'http://localhost:6274/oauth/callback', // MCP Inspector
    'http://localhost:5173/oauth/callback', // Vite default
  ],
  scope: 'read write',
  client_name: 'My Application',
  client_uri: 'http://localhost:3000',
})

// Start OAuth flow (DCR happens automatically)
const authURL = await client.startAuthFlow('http://localhost:4000')
console.log('Visit:', authURL)

// Handle callback (in your callback endpoint)
const token = await client.handleCallback(callbackURL)
console.log('Access token:', token.access_token)

// Use token for authenticated requests
const accessToken = await client.getAccessToken('http://localhost:4000')
```

### React Integration

```tsx
import React from 'react'
import {
  OAuthProvider,
  OAuthConnectButton,
  OAuthFlowProgress,
  useOAuthFlow,
} from 'mcpresso-oauth-client/react'

function App() {
  return (
    <OAuthProvider
      config={{
        redirect_uris: [
          'http://localhost:3000/callback',
          'http://localhost:3001/oauth/callback',
          'http://localhost:6274/oauth/callback', // MCP Inspector
          'http://localhost:5173/oauth/callback', // Vite default
        ],
        scope: 'read write',
        client_name: 'My React App',
        client_uri: 'http://localhost:3000',
      }}
    >
      <MyComponent />
    </OAuthProvider>
  )
}

function MyComponent() {
  const { client } = useOAuthClient()
  const { state, error } = useOAuthFlow({
    client,
    resourceURL: 'http://localhost:4000',
    onSuccess: (token) => console.log('Connected!', token),
    onError: (error) => console.error('Auth failed:', error),
  })

  return (
    <div>
      <OAuthConnectButton
        client={client}
        resourceURL="http://localhost:4000"
      />
      <OAuthFlowProgress state={state} error={error} />
    </div>
  )
}
```

## Core Concepts

### OAuth 2.1 PKCE Flow with Dynamic Client Registration

The client implements the complete OAuth 2.1 authorization code flow with PKCE and Dynamic Client Registration (DCR):

1. **Discovery** - Finds OAuth server via `.well-known/oauth-protected-resource`
2. **Client Registration** - Automatically registers client via DCR (RFC 7591) if needed
3. **Authorization** - Redirects user to OAuth server with PKCE challenge
4. **Token Exchange** - Exchanges authorization code for access/refresh tokens
5. **Token Management** - Automatically refreshes expired tokens

### Dynamic Client Registration (DCR)

The client **exclusively uses Dynamic Client Registration** - no pre-configuration needed! The client will automatically:

1. Discover the OAuth server's `registration_endpoint`
2. Register itself dynamically with a generated `client_id`
3. Use the registered credentials for the OAuth flow

**Requirements:** The OAuth server must support DCR (RFC 7591). The client will throw an error if DCR is not supported.

### MCP Discovery (RFC 9728)

Automatic discovery of OAuth servers for MCP resources:

```typescript
// Client automatically discovers OAuth server for this MCP resource
const authURL = await client.startAuthFlow('https://api.example.com')
```

The client fetches `https://api.example.com/.well-known/oauth-protected-resource` to find the authorization server.

## Configuration

### Client Configuration

```typescript
interface OAuthClientConfig {
  // Required: OAuth flow configuration
  redirect_uri: string                 // Callback URL
  scope?: string                       // Requested permissions
  
  // Required: Client registration details for DCR
  client_name: string                  // Application name for DCR
  client_uri?: string                  // Application homepage URL
  
  // Optional: Technical configuration
  pkce_method?: 'S256' | 'plain'      // PKCE method (default: S256)
  discovery_timeout?: number           // Discovery timeout (default: 30s)
  token_storage?: TokenStorage         // Token storage implementation
}
```

### Token Storage

Choose from multiple storage options:

```typescript
import {
  MemoryTokenStorage,           // In-memory (development)
  LocalStorageTokenStorage,     // Browser localStorage
  SessionStorageTokenStorage,   // Browser sessionStorage
  createDefaultTokenStorage,    // Auto-detect best option
} from 'mcpresso-oauth-client'

const client = new MCPOAuthClient({
  // ... other config
  token_storage: new LocalStorageTokenStorage(),
})
```

### Custom Storage

Implement your own storage:

```typescript
class DatabaseTokenStorage implements TokenStorage {
  async getToken(resource: string): Promise<StoredToken | null> {
    return await db.tokens.findByResource(resource)
  }
  
  async setToken(resource: string, token: StoredToken): Promise<void> {
    await db.tokens.upsert(resource, token)
  }
  
  async removeToken(resource: string): Promise<void> {
    await db.tokens.delete(resource)
  }
  
  async clear(): Promise<void> {
    await db.tokens.deleteAll()
  }
}
```

## React Components

### OAuthProvider

Provides OAuth client context to child components:

```tsx
<OAuthProvider config={{ client_id: 'your-app', redirect_uri: '/callback' }}>
  <App />
</OAuthProvider>
```

### OAuthConnectButton

Smart button that handles the OAuth flow:

```tsx
<OAuthConnectButton
  client={client}
  resourceURL="https://api.example.com"
  onSuccess={(token) => console.log('Connected!')}
  onError={(error) => console.error(error)}
>
  Connect to API
</OAuthConnectButton>
```

### OAuthFlowProgress

Visual progress indicator for OAuth flow:

```tsx
<OAuthFlowProgress
  state={state}
  error={error}
  className="my-4"
/>
```

Shows progress through:
- Metadata Discovery
- Client Registration  
- Preparing Authorization
- Request Authorization
- Token Request
- Authentication Complete

### OAuthStatusCard

Status card showing connection state:

```tsx
<OAuthStatusCard
  client={client}
  resourceURL="https://api.example.com"
  title="API Connection"
/>
```

### OAuthCallbackHandler

Handles OAuth callback in your redirect URI page:

```tsx
// pages/callback.tsx
export default function CallbackPage() {
  return (
    <OAuthCallbackHandler
      client={client}
      onSuccess={() => router.push('/dashboard')}
      onError={(error) => router.push('/error')}
    />
  )
}
```

## React Hooks

### useOAuthClient

Initialize and manage OAuth client:

```tsx
const { client, isReady } = useOAuthClient({
  client_id: 'your-app',
  redirect_uri: '/callback',
})
```

### useOAuthFlow

Manage OAuth flow state:

```tsx
const {
  state,
  error,
  isLoading,
  startFlow,
  handleCallback,
  checkToken,
  getAccessToken,
  removeToken,
} = useOAuthFlow({
  client,
  resourceURL: 'https://api.example.com',
  onSuccess: (token) => console.log('Success!'),
  onError: (error) => console.error(error),
})
```

### useToken

Manage access tokens with automatic refresh:

```tsx
const { token, isLoading, error, refresh } = useToken(
  client,
  'https://api.example.com'
)

// Use token in API calls
useEffect(() => {
  if (token) {
    fetch('/api/data', {
      headers: { Authorization: `Bearer ${token}` }
    })
  }
}, [token])
```

### useOAuthResources

Manage multiple MCP resources:

```tsx
const { tokens, loadingStates, checkAuthStatus } = useOAuthResources(
  client,
  [
    'https://api1.example.com',
    'https://api2.example.com',
    'https://api3.example.com',
  ]
)
```

## Integration with Next.js

### 1. Setup OAuth Provider

```tsx
// app/layout.tsx
import { OAuthProvider } from 'mcpresso-oauth-client/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <OAuthProvider
          config={{
            client_id: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID!,
            redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/callback`,
            scope: 'read write',
          }}
        >
          {children}
        </OAuthProvider>
      </body>
    </html>
  )
}
```

### 2. Create Callback Page

```tsx
// app/callback/page.tsx
'use client'
import { OAuthCallbackHandler } from 'mcpresso-oauth-client/react'
import { useRouter } from 'next/navigation'

export default function CallbackPage() {
  const router = useRouter()
  
  return (
    <OAuthCallbackHandler
      onSuccess={() => router.push('/dashboard')}
      onError={() => router.push('/?error=auth_failed')}
    />
  )
}
```

### 3. Use in Components

```tsx
// app/dashboard/page.tsx
'use client'
import { useOAuthClient, OAuthConnectButton } from 'mcpresso-oauth-client/react'

export default function Dashboard() {
  const { client } = useOAuthClient()
  
  return (
    <div>
      <h1>Dashboard</h1>
      <OAuthConnectButton
        client={client}
        resourceURL="https://your-mcp-server.com"
      >
        Connect to MCP Server
      </OAuthConnectButton>
    </div>
  )
}
```

## Advanced Usage

### Event Listeners

Listen to OAuth flow events:

```typescript
client.on('state_change', ({ state, context }) => {
  console.log(`Flow state: ${state} for ${context.resource_url}`)
})

client.on('token_updated', ({ resource, token }) => {
  console.log(`Token updated for ${resource}`)
})

client.on('error', ({ error }) => {
  console.error('OAuth error:', error.message)
})
```

### Multiple Resources

Handle multiple MCP servers:

```typescript
const resources = [
  'https://api1.example.com',
  'https://api2.example.com',
  'https://api3.example.com',
]

// Start flows for all resources
for (const resource of resources) {
  if (!await client.hasValidToken(resource)) {
    const authURL = await client.startAuthFlow(resource)
    // Handle authorization...
  }
}

// Use tokens for API calls
for (const resource of resources) {
  const token = await client.getAccessToken(resource)
  if (token) {
    // Make authenticated request to resource
    await makeAuthenticatedRequest(resource, token)
  }
}
```

### Custom PKCE Implementation

```typescript
import { createPKCEChallenge } from 'mcpresso-oauth-client'

// Generate PKCE challenge manually
const pkce = createPKCEChallenge('S256')
console.log('Code verifier:', pkce.code_verifier)
console.log('Code challenge:', pkce.code_challenge)
console.log('Challenge method:', pkce.code_challenge_method)
```

## Error Handling

The client provides comprehensive error handling:

```typescript
import { OAuthError, MCPDiscoveryError } from 'mcpresso-oauth-client'

try {
  await client.startAuthFlow(resourceURL)
} catch (error) {
  if (error instanceof MCPDiscoveryError) {
    console.error('Discovery failed:', error.resource_url)
  } else if (error instanceof OAuthError) {
    console.error('OAuth error:', error.error, error.error_description)
  }
}
```

## Security Best Practices

1. **HTTPS Only** - Always use HTTPS in production
2. **Secure Storage** - Use secure token storage in production
3. **Token Validation** - Tokens are automatically validated for expiry
4. **PKCE Required** - PKCE is mandatory for security
5. **State Parameter** - State parameter prevents CSRF attacks

## Testing

### Mock OAuth Server

Create a mock server for testing:

```typescript
// test/mock-oauth-server.ts
import express from 'express'

const app = express()

app.get('/.well-known/oauth-protected-resource', (req, res) => {
  res.json({
    resource: 'http://localhost:4000',
    authorization_servers: ['http://localhost:4001'],
  })
})

app.get('/.well-known/oauth-authorization-server', (req, res) => {
  res.json({
    issuer: 'http://localhost:4001',
    authorization_endpoint: 'http://localhost:4001/authorize',
    token_endpoint: 'http://localhost:4001/token',
    response_types_supported: ['code'],
    code_challenge_methods_supported: ['S256'],
  })
})

app.listen(4000)
```

### Unit Tests

```typescript
import { MCPOAuthClient, MemoryTokenStorage } from 'mcpresso-oauth-client'

describe('MCPOAuthClient', () => {
  let client: MCPOAuthClient

  beforeEach(() => {
    client = new MCPOAuthClient({
      client_id: 'test-client',
      redirect_uri: 'http://localhost:3000/callback',
      token_storage: new MemoryTokenStorage(),
    })
  })

  test('generates authorization URL', async () => {
    const authURL = await client.startAuthFlow('http://localhost:4000')
    expect(authURL).toContain('code_challenge')
    expect(authURL).toContain('client_id=test-client')
  })
})
```

## Examples

See the `examples/` directory for complete working examples:

- [`demo.ts`](./examples/demo.ts) - Node.js command-line demo
- [`react-demo.tsx`](./examples/react-demo.tsx) - React components demo

## Requirements

- Node.js 18+ 
- Modern browser with Web Crypto API support
- MCP server with OAuth 2.1 support (e.g., using `mcpresso-oauth-server`)

## Related Packages

- [`mcpresso`](../mcpresso) - MCP server framework
- [`mcpresso-oauth-server`](../mcpresso-oauth-server) - OAuth 2.1 server for MCP

## License

MIT - See LICENSE file for details. 