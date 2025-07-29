"use client"

import { useState, useEffect, useCallback } from "react"
import type { Agent, PermissionEntry, AgentLog } from "@/lib/types"
import {
  listAgents as dbList,
  createAgent as dbCreate,
  updateAgent as dbUpdate,
  deleteAgent as dbDelete,
  listLogs as dbListLogs,
  addLog as dbAddLog,
  setPermission as dbSetPerm,
  removePermission as dbRemovePerm,
} from "@/lib/mock-db"

interface UseAgentsResult {
  agents: Agent[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createAgent: (data: { name: string; systemPrompt: string; roleIds?: string[]; permissions?: PermissionEntry[] }) => Promise<Agent>
  updateAgent: (agentId: string, data: Partial<Omit<Agent, "id" | "workspaceId">>) => Promise<Agent | undefined>
  deleteAgent: (agentId: string) => Promise<boolean>
  logsFor: (agentId: string) => AgentLog[]
  addLog: (agentId: string, message: string) => void
  setPermission: (agentId: string, entry: PermissionEntry) => void
  removePermission: (agentId: string, serverId: string, resourceId: string) => void
}

export function useAgents(workspaceId: string | undefined): UseAgentsResult {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!workspaceId) return
    try {
      setLoading(true)
      const data = await Promise.resolve(dbList(workspaceId))
      setAgents(data)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Failed to fetch agents")
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // CRUD wrappers -----------------------------------------------------------

  const createAgent = async (data: { name: string; systemPrompt: string; roleIds?: string[]; permissions?: PermissionEntry[] }) => {
    if (!workspaceId) throw new Error("workspaceId is required")
    const agent = await Promise.resolve(dbCreate(workspaceId, { ...data, roleIds: data.roleIds ?? [] }))
    setAgents((prev) => [...prev, agent])
    return agent
  }

  const updateAgent = async (agentId: string, data: Partial<Omit<Agent, "id" | "workspaceId">>) => {
    const updated = await Promise.resolve(dbUpdate(agentId, data))
    if (updated) {
      setAgents((prev) => prev.map((a) => (a.id === agentId ? updated : a)))
    }
    return updated
  }

  const deleteAgent = async (agentId: string) => {
    const removed = await Promise.resolve(dbDelete(agentId))
    if (removed) setAgents((prev) => prev.filter((a) => a.id !== agentId))
    return removed
  }

  // Logs --------------------------------------------------------------------
  const logsFor = (agentId: string) => {
    return dbListLogs(agentId)
  }

  const addLog = (agentId: string, message: string) => {
    dbAddLog(agentId, workspaceId ?? "", message)
    // no need to update state; consumer can refetch logs if needed
  }

  // Permissions -------------------------------------------------------------
  const setPermission = (agentId: string, entry: PermissionEntry) => {
    dbSetPerm({ type: "agent", id: agentId }, entry)
    refresh()
  }

  const removePermission = (agentId: string, serverId: string, resourceId: string) => {
    dbRemovePerm({ type: "agent", id: agentId }, serverId, resourceId)
    refresh()
  }

  return {
    agents,
    loading,
    error,
    refresh,
    createAgent,
    updateAgent,
    deleteAgent,
    logsFor,
    addLog,
    setPermission,
    removePermission,
  }
} 