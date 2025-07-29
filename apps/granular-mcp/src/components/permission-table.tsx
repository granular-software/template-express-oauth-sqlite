"use client"

import { useMemo } from "react"
import { listResources } from "@/lib/mock-db"
import { useRoles } from "@/hooks/use-roles"
import { useAgents } from "@/hooks/use-agents"
import type { PermissionEntry, PermissionLevel } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Props {
  workspaceId: string
  subjectType: "agent" | "role"
  subjectId: string
}

export function PermissionTable({ workspaceId, subjectType, subjectId }: Props) {
  // get resources
  const resources = listResources(workspaceId)

  // hooks for subject
  const { agents, setPermission: setAgentPerm, removePermission: removeAgentPerm } = useAgents(workspaceId)
  const { roles, setPermission: setRolePerm, removePermission: removeRolePerm } = useRoles(workspaceId)

  const subject = subjectType === "agent" ? agents.find((a) => a.id === subjectId) : roles.find((r) => r.id === subjectId)

  const inheritedMap: Record<string, PermissionEntry | undefined> = {}
  if (subjectType === "agent" && subject && "roleIds" in subject) {
    // gather permissions from roles
    const agentRoles = roles.filter((r) => subject.roleIds.includes(r.id))
    agentRoles.forEach((role) => {
      role.permissions.forEach((perm) => {
        const key = perm.serverId + "|" + perm.resourceId
        if (!inheritedMap[key]) inheritedMap[key] = { ...perm, inherited: true }
      })
    })
  }

  const customMap: Record<string, PermissionEntry> = {}
  subject?.permissions.forEach((perm) => {
    const key = perm.serverId + "|" + perm.resourceId
    customMap[key] = perm
  })

  // group resources by server
  const grouped = useMemo(() => {
    const m: Record<string, typeof resources> = {}
    resources.forEach((res) => {
      if (!m[res.serverId]) m[res.serverId] = []
      m[res.serverId].push(res)
    })
    return m
  }, [resources])

  const handleChange = (serverId: string, resourceId: string, value: PermissionLevel) => {
    const entry: PermissionEntry = { serverId, resourceId, permission: value }
    if (value === "human") {
      // remove custom if exists
      if (subjectType === "agent") removeAgentPerm(subjectId, serverId, resourceId)
      else removeRolePerm(subjectId, serverId, resourceId)
    } else {
      if (subjectType === "agent") setAgentPerm(subjectId, entry)
      else setRolePerm(subjectId, entry)
    }
  }

  const setAllForServer = (serverId: string, value: PermissionLevel) => {
    const resList = grouped[serverId] || []
    resList.forEach((res) => handleChange(serverId, res.id, value))
  }

  if (!subject) return <p className="text-sm text-muted-foreground">Subject not found.</p>

  return (
    <div className="border rounded-md overflow-x-auto">
      {Object.entries(grouped).map(([serverId, resList]) => (
        <div key={serverId} className="border-t first:border-t-0">
          {/* Server header */}
          <div className="flex items-center justify-between bg-muted/50 px-4 py-2">
            <span className="font-medium text-sm">Server: {serverId}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setAllForServer(serverId, "allowed")}>Allow All</Button>
              <Button variant="outline" size="sm" onClick={() => setAllForServer(serverId, "forbidden")}>Forbid All</Button>
              <Button variant="outline" size="sm" onClick={() => setAllForServer(serverId, "human")}>Human All</Button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-2">Resource</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Permission</th>
              </tr>
            </thead>
            <tbody>
              {resList.map((res) => {
                const key = serverId + "|" + res.id
                const inherited = inheritedMap[key]
                const custom = customMap[key]
                const effective = custom?.permission || inherited?.permission || "human"
                return (
                  <tr key={res.id} className="border-t last:border-b">
                    <td className="px-4 py-2">{res.name}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{res.type}</td>
                    <td className="px-4 py-2">
                      {inherited && !custom ? (
                        <Badge variant="secondary">{effective} (role)</Badge>
                      ) : (
                        <select
                          value={effective}
                          onChange={(e) => handleChange(serverId, res.id, e.target.value as PermissionLevel)}
                          className="border px-2 py-1 rounded text-sm"
                        >
                          <option value="allowed">Allowed</option>
                          <option value="forbidden">Forbidden</option>
                          <option value="human">Human</option>
                          <option value="ask_if_unsure">Ask if Unsure</option>
                        </select>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
} 