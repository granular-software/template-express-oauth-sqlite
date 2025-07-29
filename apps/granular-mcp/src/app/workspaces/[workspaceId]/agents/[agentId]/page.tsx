"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Shield, List, ScrollText } from "lucide-react"
import { PageLayout } from "@/components/page-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useAgents } from "@/hooks/use-agents"
import { useRoles } from "@/hooks/use-roles"
import { PermissionTable } from "@/components/permission-table"

export default function AgentDetailsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const agentId = params.agentId as string

  const { agents, logsFor } = useAgents(workspaceId)
  const { roles } = useRoles(workspaceId)

  const agent = agents.find((a) => a.id === agentId)

  if (!agent) {
    return (
      <PageLayout>
        <div className="max-w-3xl mx-auto px-6 py-12 text-center">
          <h1 className="text-xl font-semibold mb-4">Agent not found</h1>
          <Link href={`/workspaces/${workspaceId}`}>Back to workspace</Link>
        </div>
      </PageLayout>
    )
  }

  const agentRoles = roles.filter((r) => agent.roleIds.includes(r.id))
  const logs = logsFor(agentId)

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${workspaceId}`}> 
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          {agentRoles.map((r) => (
            <Badge key={r.id} variant="secondary">{r.name}</Badge>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="info">
              <TabsList>
                <TabsTrigger value="info" className="flex items-center gap-1 text-sm">
                  <List className="h-4 w-4" /> Info
                </TabsTrigger>
                <TabsTrigger value="permissions" className="flex items-center gap-1 text-sm">
                  <Shield className="h-4 w-4" /> Permissions
                </TabsTrigger>
                <TabsTrigger value="logs" className="flex items-center gap-1 text-sm">
                  <ScrollText className="h-4 w-4" /> Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-6 space-y-3">
                <p><span className="font-medium">System prompt:</span> {agent.systemPrompt || <em className="text-muted-foreground">None</em>}</p>
                <p><span className="font-medium">Roles:</span> {agentRoles.map((r) => r.name).join(", ") || "None"}</p>
              </TabsContent>

              <TabsContent value="permissions" className="mt-6">
                <PermissionTable workspaceId={workspaceId} subjectType="agent" subjectId={agentId} />
              </TabsContent>

              <TabsContent value="logs" className="mt-6 space-y-2 text-sm">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground">No logs yet.</p>
                ) : (
                  logs.map((l, idx) => (
                    <div key={idx} className="border-b py-1 flex gap-3">
                      <span className="text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</span>
                      <span>{l.message}</span>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
} 