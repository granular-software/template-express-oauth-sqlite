"use client"

import { useState } from "react"
import { useAgents } from "@/hooks/use-agents"
import { useRoles } from "@/hooks/use-roles"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Props {
  workspaceId: string
}

export function AgentList({ workspaceId }: Props) {
  const { agents, loading, createAgent } = useAgents(workspaceId)
  const { roles } = useRoles(workspaceId)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  const handleSubmit = async () => {
    if (!name.trim()) return
    await createAgent({ name, systemPrompt, roleIds: selectedRoles })
    setName("")
    setSystemPrompt("")
    setSelectedRoles([])
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Agents</h2>
        <Button onClick={() => setShowForm(true)}>New Agent</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading agents…</p>
      ) : agents.length === 0 ? (
        <p className="text-muted-foreground text-sm">No agents yet.</p>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Roles</th>
                <th className="px-4 py-2">Permissions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-t last:border-b">
                  <td className="px-4 py-2 font-medium text-blue-600 underline">
                    <Link href={`/workspaces/${workspaceId}/agents/${agent.id}`}>{agent.name}</Link>
                  </td>
                  <td className="px-4 py-2 space-x-1">
                    {agent.roleIds.map((roleId: string) => {
                      const role = roles.find((r) => r.id === roleId)
                      return role ? (
                        <Badge key={roleId} variant="secondary">
                          {role.name}
                        </Badge>
                      ) : null
                    })}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {agent.permissions.length} custom
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Simple inline form */}
      {showForm && (
        <Card className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-md shadow-lg">
            <CardHeader>
              <CardTitle>New Agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">System Prompt</label>
                <Input value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="Prompt" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <Badge
                      key={role.id}
                      variant={selectedRoles.includes(role.id) ? "default" : "secondary"}
                      onClick={() =>
                        setSelectedRoles((prev) =>
                          prev.includes(role.id) ? prev.filter((id) => id !== role.id) : [...prev, role.id]
                        )
                      }
                      className="cursor-pointer select-none"
                    >
                      {role.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>Create</Button>
              </div>
            </CardContent>
          </div>
        </Card>
      )}
    </div>
  )
} 