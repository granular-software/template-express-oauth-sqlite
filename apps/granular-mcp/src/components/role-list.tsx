"use client"

import { useState } from "react"
import { useRoles } from "@/hooks/use-roles"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface Props {
  workspaceId: string
}

export function RoleList({ workspaceId }: Props) {
  const { roles, loading, createRole } = useRoles(workspaceId)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")

  const handleSubmit = async () => {
    if (!name.trim()) return
    await createRole({ name })
    setName("")
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Roles</h2>
        <Button onClick={() => setShowForm(true)}>New Role</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading roles…</p>
      ) : roles.length === 0 ? (
        <p className="text-muted-foreground text-sm">No roles yet.</p>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Members</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-t last:border-b">
                  <td className="px-4 py-2 font-medium text-blue-600 underline">
                    <Link href={`/workspaces/${workspaceId}/roles/${role.id}`}>{role.name}</Link>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{role.agentIds.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Card className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-md shadow-lg">
            <CardHeader>
              <CardTitle>New Role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Role name" />
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