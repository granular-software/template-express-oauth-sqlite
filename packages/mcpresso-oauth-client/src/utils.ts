import CryptoJS from 'crypto-js'
import { PKCEChallenge, PKCEMethod } from './types'

// ===== PKCE Challenge Generation =====

/**
 * Generates a cryptographically secure random string for PKCE code verifier
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    window.crypto.getRandomValues(array)
  } else {
    // Node.js environment
    const crypto = require('crypto')
    crypto.randomFillSync(array)
  }
  
  return base64URLEncode(array)
}

/**
 * Generates code challenge from verifier using specified method
 */
export function generateCodeChallenge(verifier: string, method: PKCEMethod = 'S256'): string {
  if (method === 'plain') {
    return verifier
  }
  
  // S256 method
  const hash = CryptoJS.SHA256(verifier)
  const base64 = hash.toString(CryptoJS.enc.Base64)
  return base64URLFromBase64(base64)
}

/**
 * Creates a complete PKCE challenge object
 */
export function createPKCEChallenge(method: PKCEMethod = 'S256'): PKCEChallenge {
  const code_verifier = generateCodeVerifier()
  const code_challenge = generateCodeChallenge(code_verifier, method)
  
  return {
    code_verifier,
    code_challenge,
    code_challenge_method: method
  }
}

// ===== Base64 URL Encoding Utilities =====

function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64URLFromBase64(base64)
}

function base64URLFromBase64(base64: string): string {
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// ===== URL Building Utilities =====

/**
 * Builds authorization URL with proper query parameters
 */
export function buildAuthorizationURL(
  baseURL: string,
  params: Record<string, string | undefined>
): string {
  const url = new URL(baseURL)
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, value)
    }
  })
  
  return url.toString()
}

/**
 * Parses callback URL to extract code and state
 */
export function parseCallbackURL(callbackURL: string): { code?: string; state?: string; error?: string; error_description?: string } {
  const url = new URL(callbackURL)

  // Prefer parameters from the query string ("?")
  const searchParams = new URLSearchParams(url.search)

  // Some OAuth servers (or certain response modes) return parameters in the
  // URL fragment ("#") instead of the query string. Example:
  //   http://localhost:3000/callback#code=abc&state=xyz
  // If we didn't get the expected parameters from the query string, try to
  // parse them from the fragment as well.
  const hashParams = url.hash ? new URLSearchParams(url.hash.substring(1)) : undefined

  const getParam = (key: string): string | undefined => {
    return (
      searchParams.get(key) ||
      hashParams?.get(key) ||
      undefined
    )
  }

  return {
    code: getParam('code'),
    state: getParam('state'),
    error: getParam('error'),
    error_description: getParam('error_description'),
  }
}

// ===== Random State Generation =====

/**
 * Generates a random state parameter for OAuth requests
 */
export function generateState(): string {
  const array = new Uint8Array(16)
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array)
  } else {
    const crypto = require('crypto')
    crypto.randomFillSync(array)
  }
  
  return base64URLEncode(array)
}

// ===== Token Expiry Utilities =====

/**
 * Calculates expiry timestamp from expires_in seconds
 */
export function calculateExpiryTime(expiresIn?: number): number | undefined {
  if (!expiresIn) return undefined
  return Math.floor(Date.now() / 1000) + expiresIn
}

/**
 * Checks if a token is expired (with 30 second buffer)
 */
export function isTokenExpired(expiresAt?: number, bufferSeconds = 30): boolean {
  if (!expiresAt) return false
  const now = Math.floor(Date.now() / 1000)
  return expiresAt <= (now + bufferSeconds)
}

// ===== HTTP Utilities =====

/**
 * Makes HTTP request with proper error handling
 */
export async function makeHTTPRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': 'mcpresso-oauth-client/0.1.0',
      ...options.headers,
    },
  })

  const contentType = response.headers.get('content-type')
  const isJSON = contentType?.includes('application/json')

  if (!response.ok) {
    if (isJSON) {
      const errorData = await response.json()
      throw new Error(`HTTP ${response.status}: ${errorData.error_description || errorData.error || response.statusText}`)
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  if (isJSON) {
    return await response.json()
  } else {
    return await response.text() as unknown as T
  }
}

/**
 * Builds form-encoded request body
 */
export function buildFormBody(params: Record<string, string | undefined>): string {
  const formParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      formParams.set(key, value)
    }
  })
  
  return formParams.toString()
}

// ===== Discovery Utilities =====

/**
 * Constructs well-known OAuth discovery URL
 */
export function getOAuthDiscoveryURL(issuer: string): string {
  const url = new URL(issuer)
  url.pathname = '/.well-known/oauth-authorization-server'
  return url.toString()
}

/**
 * Constructs well-known protected resource metadata URL
 */
export function getProtectedResourceMetadataURL(resourceURL: string): string {
  const url = new URL(resourceURL)
  url.pathname = '/.well-known/oauth-protected-resource'
  return url.toString()
}

// ===== Validation Utilities =====

/**
 * Validates OAuth state parameter matches
 */
export function validateState(expectedState: string, receivedState?: string): boolean {
  return expectedState === receivedState
}

/**
 * Validates redirect URI matches exactly
 */
export function validateRedirectURI(expectedURI: string, receivedURI: string): boolean {
  return expectedURI === receivedURI
} 