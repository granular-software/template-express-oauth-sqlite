"use client"

export type PermissionLevel = "allowed" | "forbidden" | "human" | "ask_if_unsure"

export interface PermissionEntry {
  serverId: string // MCP server path / id
  resourceId: string // resource or tool identifier
  permission: PermissionLevel
  /** If true, this permission comes from a role rather than being set directly on the agent */
  inherited?: boolean
}

export interface Agent {
  id: string
  workspaceId: string
  name: string
  systemPrompt: string
  roleIds: string[]
  permissions: PermissionEntry[]
}

export interface Role {
  id: string
  workspaceId: string
  name: string
  permissions: PermissionEntry[]
  /** cached list of agents having this role (convenience) */
  agentIds: string[]
}

export interface Resource {
  serverId: string
  id: string
  name: string
  type: string
  description?: string
}

export interface AgentLog {
  agentId: string
  workspaceId: string
  timestamp: string // ISO string
  message: string
} 