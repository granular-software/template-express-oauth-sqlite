"use client"

import { listResources } from "@/lib/mock-db"
import { useEffect, useState, useMemo } from "react"

interface Props {
  workspaceId: string
}

export function ResourceList({ workspaceId }: Props) {
  const [_, force] = useState(0)

  // Force re-render when resources change (mock DB has no subscription; simple interval)
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 2000)
    return () => clearInterval(id)
  }, [])

  const resources = listResources(workspaceId)

  const grouped = useMemo(() => {
    const m: Record<string, typeof resources> = {}
    resources.forEach((r) => {
      if (!m[r.serverId]) m[r.serverId] = []
      m[r.serverId].push(r)
    })
    return m
  }, [resources])

  if (resources.length === 0) {
    return <p className="text-muted-foreground text-sm">No resources yet. Attach an MCP server.</p>
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([serverId, resList]) => (
        <div key={serverId} className="border rounded-md">
          <div className="bg-muted/50 px-4 py-2 font-medium text-sm">Server: {serverId}</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {resList.map((r) => (
                <tr key={r.id} className="border-t last:border-b">
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
} 