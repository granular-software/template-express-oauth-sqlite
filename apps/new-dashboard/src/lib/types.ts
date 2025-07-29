export interface Workspace {
  id: string
  name: string
  description?: string
  path: string
}

export interface User {
  name: string
  email: string
  avatar: string
}

export interface Agent {
  id: string
  name: string
  description?: string
  workspaceId: string
  stopped?: boolean
}

export interface Role {
  id: string
  name: string
  description?: string
  workspaceId: string
}

export interface MCPServer {
  id: string
  name: string
  url: string
  workspaceId: string
} 