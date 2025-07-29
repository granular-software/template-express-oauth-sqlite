# MCPresso OAuth Client Integration Guide

This guide shows you how to integrate the `mcpresso-oauth-client` into your applications for seamless OAuth 2.1 PKCE authentication with MCP servers.

## 🚀 Quick Start Summary

The `mcpresso-oauth-client` package provides everything you need to handle OAuth authentication for MCP servers:

1. **Automatic Discovery** - Finds OAuth servers via RFC 9728 standard
2. **PKCE Flow** - Complete OAuth 2.1 authorization code flow with PKCE
3. **Token Management** - Automatic refresh, secure storage, expiry handling
4. **React Integration** - Ready-to-use hooks and components
5. **Type Safety** - Full TypeScript support with Zod validation

## 📁 Package Structure

```
mcpresso-oauth-client/
├── src/
│   ├── index.ts          # Main exports (Node.js/vanilla JS)
│   ├── react/            # React hooks and components
│   ├── types.ts          # TypeScript types and schemas
│   ├── client.ts         # Core OAuth client implementation
│   ├── utils.ts          # PKCE and utility functions
│   └── storage.ts        # Token storage implementations
├── examples/
│   ├── demo.ts           # Node.js CLI demo
│   └── react-demo.tsx    # React components demo
└── README.md             # Full documentation
```

## 🎯 Integration with New Dashboard

### 1. Add to Dependencies

```bash
cd apps/new-dashboard
bun add mcpresso-oauth-client
```

Or add to `package.json`:
```json
{
  "dependencies": {
    "mcpresso-oauth-client": "../../packages/mcpresso-oauth-client"
  }
}
```

### 2. Environment Configuration

Add to your `.env.local`:

```bash
# OAuth Client Configuration
NEXT_PUBLIC_OAUTH_CLIENT_ID=your-dashboard-client-id
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Layout Integration

Wrap your app with the OAuth provider:

```tsx
// app/layout.tsx
import { MCPOAuthProvider } from '@/lib/oauth-integration'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <MCPOAuthProvider>
          {children}
        </MCPOAuthProvider>
      </body>
    </html>
  )
}
```

### 4. OAuth Callback Route

Create callback page at `app/auth/callback/page.tsx`:

```tsx
'use client'
import { OAuthCallbackHandler, useOAuthClient } from 'mcpresso-oauth-client/react'
import { useRouter } from 'next/navigation'

export default function CallbackPage() {
  const router = useRouter()
  const { client } = useOAuthClient({ /* config */ })

  return (
    <OAuthCallbackHandler
      client={client}
      onSuccess={() => router.push('/dashboard')}
      onError={(error) => router.push(`/?error=${error.message}`)}
    />
  )
}
```

### 5. MCP Server Management

Use the pre-built components:

```tsx
// app/mcp-servers/page.tsx
import { MCPServersDashboard } from '@/lib/oauth-integration'

const servers = [
  { id: 'local', name: 'Local Dev', url: 'http://localhost:4000' },
  { id: 'prod', name: 'Production API', url: 'https://api.example.com' },
]

export default function ServersPage() {
  return (
    <MCPServersDashboard 
      servers={servers}
      onServerConnected={(server, token) => {
        console.log(`Connected to ${server.name}!`)
      }}
    />
  )
}
```

## 🔧 Core Usage Patterns

### 1. Basic OAuth Client

```typescript
import { MCPOAuthClient } from 'mcpresso-oauth-client'

const client = new MCPOAuthClient({
  client_id: 'your-client-id',
  redirect_uri: 'http://localhost:3000/callback',
  scope: 'read write',
})

// Start OAuth flow
const authURL = await client.startAuthFlow('http://localhost:4000')
// Redirect user to authURL

// Handle callback
const token = await client.handleCallback(callbackURL)

// Use token for authenticated requests
const accessToken = await client.getAccessToken('http://localhost:4000')
```

### 2. React Hooks

```tsx
import { useOAuthFlow, useOAuthClient, useToken } from 'mcpresso-oauth-client/react'

function MyComponent() {
  const { client } = useOAuthClient({
    client_id: 'your-app',
    redirect_uri: '/callback',
  })

  const { startFlow, state, error } = useOAuthFlow({
    client,
    resourceURL: 'https://api.example.com',
    onSuccess: (token) => console.log('Connected!'),
  })

  const { token, isLoading } = useToken(client, 'https://api.example.com')

  return (
    <div>
      <button onClick={startFlow}>Connect to API</button>
      {token && <p>Connected! Token: {token.substring(0, 10)}...</p>}
    </div>
  )
}
```

### 3. MCP API Requests

```tsx
import { useMCPRequest } from '@/lib/oauth-integration'

function ToolsList({ serverUrl }: { serverUrl: string }) {
  const { makeRequest, isAuthenticated } = useMCPRequest(serverUrl)
  const [tools, setTools] = useState([])

  useEffect(() => {
    if (isAuthenticated) {
      makeRequest('tools/list').then(result => {
        setTools(result.tools)
      })
    }
  }, [isAuthenticated, makeRequest])

  return (
    <div>
      {tools.map(tool => (
        <div key={tool.name}>{tool.name}</div>
      ))}
    </div>
  )
}
```

## 🔐 Security Configuration

### Production Setup

1. **Use HTTPS only**
```typescript
const client = new MCPOAuthClient({
  client_id: 'prod-client',
  redirect_uri: 'https://yourdomain.com/auth/callback', // HTTPS only
  // ...
})
```

2. **Secure token storage**
```typescript
import { LocalStorageTokenStorage } from 'mcpresso-oauth-client'

const client = new MCPOAuthClient({
  // ...
  token_storage: new LocalStorageTokenStorage('secure_prefix_'),
})
```

3. **Environment variables**
```bash
# Production environment
NEXT_PUBLIC_OAUTH_CLIENT_ID=prod-dashboard-client
NEXT_PUBLIC_BASE_URL=https://dashboard.yourdomain.com
OAUTH_CLIENT_SECRET=your-secret-key  # Server-side only
```

### Client Registration

Register your client with the OAuth server:

```bash
# Using mcpresso-oauth-server
curl -X POST http://localhost:4001/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Dashboard App",
    "redirect_uris": ["https://dashboard.yourdomain.com/auth/callback"],
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "client_uri": "https://dashboard.yourdomain.com"
  }'
```

## 🧪 Testing

### 1. Mock OAuth Server

```typescript
// test/mock-oauth-server.ts
const mockServer = express()

mockServer.get('/.well-known/oauth-protected-resource', (req, res) => {
  res.json({
    resource: 'http://localhost:4000',
    authorization_servers: ['http://localhost:4001'],
  })
})

mockServer.get('/.well-known/oauth-authorization-server', (req, res) => {
  res.json({
    issuer: 'http://localhost:4001',
    authorization_endpoint: 'http://localhost:4001/authorize',
    token_endpoint: 'http://localhost:4001/token',
  })
})
```

### 2. Unit Tests

```typescript
import { MCPOAuthClient, MemoryTokenStorage } from 'mcpresso-oauth-client'

describe('OAuth Integration', () => {
  test('generates valid authorization URL', async () => {
    const client = new MCPOAuthClient({
      client_id: 'test',
      redirect_uri: 'http://localhost:3000/callback',
      token_storage: new MemoryTokenStorage(),
    })

    const authURL = await client.startAuthFlow('http://localhost:4000')
    expect(authURL).toContain('code_challenge')
    expect(authURL).toContain('client_id=test')
  })
})
```

## 📋 Checklist for Integration

- [ ] Add `mcpresso-oauth-client` to dependencies
- [ ] Configure environment variables
- [ ] Wrap app with `MCPOAuthProvider`
- [ ] Create OAuth callback route at `/auth/callback`
- [ ] Set up MCP server connection components
- [ ] Configure token storage for production
- [ ] Register OAuth client with server
- [ ] Test authentication flow end-to-end
- [ ] Add error handling and retry logic
- [ ] Configure HTTPS for production

## 🚨 Common Issues

### 1. Discovery Fails
```
MCPDiscoveryError: Failed to fetch protected resource metadata
```
**Solution**: Ensure your MCP server exposes `.well-known/oauth-protected-resource`

### 2. PKCE Validation Fails
```
OAuthError: Invalid code verifier
```
**Solution**: Ensure PKCE challenge/verifier match and use S256 method

### 3. Token Expired
```
OAuthError: Token expired
```
**Solution**: Enable automatic refresh or implement token refresh logic

### 4. Redirect URI Mismatch
```
OAuthError: Invalid redirect URI
```
**Solution**: Ensure redirect_uri matches exactly what's registered

## 📚 Next Steps

1. **Explore Examples**: Check out the `/examples` directory for complete working demos
2. **Read Full Docs**: See the main README.md for comprehensive API documentation
3. **Join Community**: Report issues and contribute to the project
4. **Deploy**: Follow the production deployment checklist

---

Need help? Check the [README](./README.md) or [open an issue](https://github.com/granular-software/mcpresso-oauth-client/issues). 