import { z } from 'zod'

// ===== OAuth 2.1 PKCE Types =====

export const PKCEMethodSchema = z.enum(['S256', 'plain'])
export type PKCEMethod = z.infer<typeof PKCEMethodSchema>

export const GrantTypeSchema = z.enum(['authorization_code', 'refresh_token'])
export type GrantType = z.infer<typeof GrantTypeSchema>

// ===== OAuth Discovery Types (RFC 8414) =====

export const AuthorizationServerMetadataSchema = z.object({
  issuer: z.string().url(),
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  jwks_uri: z.string().url().optional(),
  userinfo_endpoint: z.string().url().optional(),
  registration_endpoint: z.string().url().optional(), // For Dynamic Client Registration
  scopes_supported: z.array(z.string()).optional(),
  response_types_supported: z.array(z.string()),
  grant_types_supported: z.array(z.string()).optional(),
  code_challenge_methods_supported: z.array(PKCEMethodSchema).optional(),
  token_endpoint_auth_methods_supported: z.array(z.string()).optional(),
})

export type AuthorizationServerMetadata = z.infer<typeof AuthorizationServerMetadataSchema>

// ===== Protected Resource Metadata (RFC 9728) =====

export const ProtectedResourceMetadataSchema = z.object({
  resource: z.string().url(),
  authorization_servers: z.array(z.string().url()),
  scopes_supported: z.array(z.string()).optional(),
  bearer_methods_supported: z.array(z.string()).optional(),
})

export type ProtectedResourceMetadata = z.infer<typeof ProtectedResourceMetadataSchema>

// ===== Token Types =====

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default('Bearer'),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
})

export type TokenResponse = z.infer<typeof TokenResponseSchema>

export const StoredTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_at: z.number().optional(), // Unix timestamp
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  resource: z.string().url(),
  created_at: z.number(), // Unix timestamp
})

export type StoredToken = z.infer<typeof StoredTokenSchema>

// ===== PKCE Code Challenge/Verifier =====

export interface PKCEChallenge {
  code_verifier: string
  code_challenge: string
  code_challenge_method: PKCEMethod
}

// ===== Authorization Request Types =====

export interface AuthorizationRequest {
  response_type: 'code'
  client_id: string
  redirect_uri: string
  scope?: string
  state?: string
  resource?: string // MCP resource URL
  code_challenge: string
  code_challenge_method: PKCEMethod
}

export interface TokenRequest {
  grant_type: 'authorization_code'
  client_id: string
  client_secret?: string
  code: string
  redirect_uri: string
  code_verifier: string
  resource?: string
}

export interface RefreshTokenRequest {
  grant_type: 'refresh_token'
  client_id: string
  client_secret?: string
  refresh_token: string
  scope?: string
  resource?: string
}

// ===== Client Configuration =====

export interface OAuthClientConfig {
  // Required: OAuth flow configuration
  redirect_uri: string
  scope?: string
  
  // Required: Client registration details for DCR
  client_name: string
  client_uri?: string
  
  // Optional: Fixed client credentials (for serverless deployments)
  client_id?: string
  client_secret?: string
  
  // Optional: Technical configuration
  pkce_method?: PKCEMethod
  discovery_timeout?: number
  token_storage?: TokenStorage
}

// ===== Dynamic Client Registration =====

export interface ClientRegistrationRequest {
  redirect_uris: string[]
  token_endpoint_auth_method: 'none' | 'client_secret_basic' | 'client_secret_post'
  grant_types: string[]
  response_types: string[]
  client_name: string
  client_uri?: string
  scope?: string
}

export const ClientRegistrationResponseSchema = z.object({
  client_id: z.string(),
  client_secret: z.string().optional(),
  client_id_issued_at: z.number().optional(),
  client_secret_expires_at: z.number().optional(),
  redirect_uris: z.array(z.string()).optional(),
  token_endpoint_auth_method: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  client_name: z.string().optional(),
  client_uri: z.string().optional(),
  scope: z.string().optional(),
})

export type ClientRegistrationResponse = z.infer<typeof ClientRegistrationResponseSchema>

export interface TokenStorage {
  getToken(resource: string): Promise<StoredToken | null>
  setToken(resource: string, token: StoredToken): Promise<void>
  removeToken(resource: string): Promise<void>
  clear(): Promise<void>
}

// ===== OAuth Flow State =====

export const OAuthFlowStateSchema = z.enum([
  'idle',
  'discovering_metadata',
  'registering_client',
  'preparing_authorization',
  'awaiting_authorization',
  'exchanging_code',
  'completed',
  'error'
])

export type OAuthFlowState = z.infer<typeof OAuthFlowStateSchema>

export interface AuthFlowContext {
  resource_url: string
  state: OAuthFlowState
  error?: string
  authorization_server?: string
  authorization_url?: string
  registered_client?: ClientRegistrationResponse
  pkce?: PKCEChallenge
  code?: string
  token?: StoredToken
}

// ===== Error Types =====

export class OAuthError extends Error {
  constructor(
    public error: string,
    public error_description?: string,
    public error_uri?: string,
    public state?: string
  ) {
    super(error_description || error)
    this.name = 'OAuthError'
  }
}

export class MCPDiscoveryError extends Error {
  constructor(message: string, public resource_url: string) {
    super(`MCP Discovery failed for ${resource_url}: ${message}`)
    this.name = 'MCPDiscoveryError'
  }
}

// ===== Event Types for React Integration =====

export interface AuthEventMap {
  'state_change': { state: OAuthFlowState; context: AuthFlowContext }
  'token_updated': { resource: string; token: StoredToken }
  'token_removed': { resource: string }
  'error': { error: OAuthError | MCPDiscoveryError }
}

export type AuthEventListener<T extends keyof AuthEventMap> = (event: AuthEventMap[T]) => void 