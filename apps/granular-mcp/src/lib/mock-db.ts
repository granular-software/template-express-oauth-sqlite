/*
  In-memory mock database for granular-mcp development.
  Replace with real API/database calls later.
*/

"use client"

import { Agent, Role, Resource, AgentLog, PermissionEntry } from "./types"

interface DB {
  agents: Agent[]
  roles: Role[]
  resources: Record<string /* workspaceId */, Resource[]>
  logs: AgentLog[]
}

const db: DB = {
  agents: [],
  roles: [],
  resources: {},
  logs: [],
}

const genId = () => Math.random().toString(36).slice(2, 10)

/* ------------------------------ Agent CRUD ------------------------------ */
export function listAgents(workspaceId: string): Agent[] {
  return db.agents.filter((a) => a.workspaceId === workspaceId)
}

export function createAgent(
  workspaceId: string,
  data: Omit<Agent, "id" | "workspaceId" | "permissions"> & { permissions?: PermissionEntry[] }
): Agent {
  const agent: Agent = {
    id: genId(),
    workspaceId,
    name: data.name,
    systemPrompt: data.systemPrompt,
    roleIds: data.roleIds ?? [],
    permissions: data.permissions ?? [],
  }
  db.agents.push(agent)
  return agent
}

export function updateAgent(agentId: string, data: Partial<Omit<Agent, "id" | "workspaceId">>): Agent | undefined {
  const idx = db.agents.findIndex((a) => a.id === agentId)
  if (idx === -1) return undefined
  db.agents[idx] = { ...db.agents[idx], ...data }
  return db.agents[idx]
}

export function deleteAgent(agentId: string): boolean {
  const before = db.agents.length
  db.agents = db.agents.filter((a) => a.id !== agentId)
  return db.agents.length < before
}

/* ------------------------------ Role CRUD ------------------------------- */
export function listRoles(workspaceId: string): Role[] {
  return db.roles.filter((r) => r.workspaceId === workspaceId)
}

export function createRole(
  workspaceId: string,
  data: Omit<Role, "id" | "workspaceId" | "permissions" | "agentIds"> & {
    permissions?: PermissionEntry[]
    agentIds?: string[]
  }
): Role {
  const role: Role = {
    id: genId(),
    workspaceId,
    name: data.name,
    permissions: data.permissions ?? [],
    agentIds: data.agentIds ?? [],
  }
  db.roles.push(role)
  return role
}

export function updateRole(roleId: string, data: Partial<Omit<Role, "id" | "workspaceId">>): Role | undefined {
  const idx = db.roles.findIndex((r) => r.id === roleId)
  if (idx === -1) return undefined
  db.roles[idx] = { ...db.roles[idx], ...data }
  return db.roles[idx]
}

export function deleteRole(roleId: string): boolean {
  const before = db.roles.length
  db.roles = db.roles.filter((r) => r.id !== roleId)
  // remove role from agents
  db.agents.forEach((a) => (a.roleIds = a.roleIds.filter((rid) => rid !== roleId)))
  return db.roles.length < before
}

/* ----------------------------- Resources ------------------------------- */
export function saveResources(workspaceId: string, serverId: string, resources: Resource[]) {
  if (!db.resources[workspaceId]) db.resources[workspaceId] = []
  db.resources[workspaceId] = db.resources[workspaceId].filter((r) => r.serverId !== serverId)
  db.resources[workspaceId].push(...resources)
}

export function listResources(workspaceId: string): Resource[] {
  return db.resources[workspaceId] ?? []
}

/* ------------------------------- Logs ---------------------------------- */
export function addLog(agentId: string, workspaceId: string, message: string): AgentLog {
  const log: AgentLog = { agentId, workspaceId, message, timestamp: new Date().toISOString() }
  db.logs.push(log)
  return log
}

export function listLogs(agentId: string): AgentLog[] {
  return db.logs.filter((l) => l.agentId === agentId)
}

/* --------------------------- Permissions ------------------------------- */
export function setPermission(target: { type: "agent" | "role"; id: string }, entry: PermissionEntry) {
  if (target.type === "agent") {
    const agent = db.agents.find((a) => a.id === target.id)
    if (!agent) return
    const idx = agent.permissions.findIndex((p) => p.serverId === entry.serverId && p.resourceId === entry.resourceId)
    if (idx === -1) agent.permissions.push(entry)
    else agent.permissions[idx] = entry
  } else {
    const role = db.roles.find((r) => r.id === target.id)
    if (!role) return
    const idx = role.permissions.findIndex((p) => p.serverId === entry.serverId && p.resourceId === entry.resourceId)
    if (idx === -1) role.permissions.push(entry)
    else role.permissions[idx] = entry
  }
}

export function removePermission(target: { type: "agent" | "role"; id: string }, serverId: string, resourceId: string) {
  if (target.type === "agent") {
    const agent = db.agents.find((a) => a.id === target.id)
    if (!agent) return
    agent.permissions = agent.permissions.filter((p) => !(p.serverId === serverId && p.resourceId === resourceId))
  } else {
    const role = db.roles.find((r) => r.id === target.id)
    if (!role) return
    role.permissions = role.permissions.filter((p) => !(p.serverId === serverId && p.resourceId === resourceId))
  }
} 