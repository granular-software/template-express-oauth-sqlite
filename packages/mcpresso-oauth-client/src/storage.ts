import { TokenStorage, StoredToken } from './types'

// ===== Memory Storage (Development) =====

export class MemoryTokenStorage implements TokenStorage {
  private tokens = new Map<string, StoredToken>()

  async getToken(resource: string): Promise<StoredToken | null> {
    return this.tokens.get(resource) || null
  }

  async setToken(resource: string, token: StoredToken): Promise<void> {
    this.tokens.set(resource, token)
  }

  async removeToken(resource: string): Promise<void> {
    this.tokens.delete(resource)
  }

  async clear(): Promise<void> {
    this.tokens.clear()
  }
}

// ===== LocalStorage Storage (Browser) =====

export class LocalStorageTokenStorage implements TokenStorage {
  private prefix: string

  constructor(prefix = 'mcpresso_oauth_') {
    this.prefix = prefix
  }

  async getToken(resource: string): Promise<StoredToken | null> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available')
    }

    const key = this.getKey(resource)
    const data = localStorage.getItem(key)
    
    if (!data) return null

    try {
      return JSON.parse(data) as StoredToken
    } catch {
      // Invalid data, remove it
      localStorage.removeItem(key)
      return null
    }
  }

  async setToken(resource: string, token: StoredToken): Promise<void> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available')
    }

    const key = this.getKey(resource)
    localStorage.setItem(key, JSON.stringify(token))
  }

  async removeToken(resource: string): Promise<void> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available')
    }

    const key = this.getKey(resource)
    localStorage.removeItem(key)
  }

  async clear(): Promise<void> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available')
    }

    // Find all keys with our prefix and remove them
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  private getKey(resource: string): string {
    // Create a safe key from the resource URL
    const urlHash = this.hashCode(resource)
    return `${this.prefix}${urlHash}`
  }

  private hashCode(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}

// ===== SessionStorage Storage (Browser) =====

export class SessionStorageTokenStorage implements TokenStorage {
  private prefix: string

  constructor(prefix = 'mcpresso_oauth_') {
    this.prefix = prefix
  }

  async getToken(resource: string): Promise<StoredToken | null> {
    if (typeof sessionStorage === 'undefined') {
      throw new Error('sessionStorage is not available')
    }

    const key = this.getKey(resource)
    const data = sessionStorage.getItem(key)
    
    if (!data) return null

    try {
      return JSON.parse(data) as StoredToken
    } catch {
      // Invalid data, remove it
      sessionStorage.removeItem(key)
      return null
    }
  }

  async setToken(resource: string, token: StoredToken): Promise<void> {
    if (typeof sessionStorage === 'undefined') {
      throw new Error('sessionStorage is not available')
    }

    const key = this.getKey(resource)
    sessionStorage.setItem(key, JSON.stringify(token))
  }

  async removeToken(resource: string): Promise<void> {
    if (typeof sessionStorage === 'undefined') {
      throw new Error('sessionStorage is not available')
    }

    const key = this.getKey(resource)
    sessionStorage.removeItem(key)
  }

  async clear(): Promise<void> {
    if (typeof sessionStorage === 'undefined') {
      throw new Error('sessionStorage is not available')
    }

    // Find all keys with our prefix and remove them
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => sessionStorage.removeItem(key))
  }

  private getKey(resource: string): string {
    // Create a safe key from the resource URL
    const urlHash = this.hashCode(resource)
    return `${this.prefix}${urlHash}`
  }

  private hashCode(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}

// ===== Default Storage Factory =====

export function createDefaultTokenStorage(): TokenStorage {
  // Use localStorage in browser, memory in Node.js
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return new LocalStorageTokenStorage()
  }
  
  return new MemoryTokenStorage()
} 