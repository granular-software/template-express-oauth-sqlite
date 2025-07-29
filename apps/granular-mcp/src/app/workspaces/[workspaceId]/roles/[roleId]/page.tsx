"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Shield, Users } from "lucide-react"
import { PageLayout } from "@/components/page-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PermissionTable } from "@/components/permission-table"
import { useRoles } from "@/hooks/use-roles"
import { useAgents } from "@/hooks/use-agents"

export default function RoleDetailsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const roleId = params.roleId as string

  const { roles } = useRoles(workspaceId)
  const { agents } = useAgents(workspaceId)

  const role = roles.find((r) => r.id === roleId)

  if (!role) {
    return (
      <PageLayout>
        <div className="max-w-3xl mx-auto px-6 py-12 text-center">
          <h1 className="text-xl font-semibold mb-4">Role not found</h1>
          <Link href={`/workspaces/${workspaceId}`}>Back to workspace</Link>
        </div>
      </PageLayout>
    )
  }

  const memberAgents = agents.filter((a) => a.roleIds.includes(roleId))

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${workspaceId}`}> <ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-5 w-5" /> {role.name}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="permissions">
              <TabsList>
                <TabsTrigger value="permissions" className="flex items-center gap-1 text-sm">
                  <Shield className="h-4 w-4" /> Permissions
                </TabsTrigger>
                <TabsTrigger value="members" className="flex items-center gap-1 text-sm">
                  <Users className="h-4 w-4" /> Members
                </TabsTrigger>
              </TabsList>

              <TabsContent value="permissions" className="mt-6">
                <PermissionTable workspaceId={workspaceId} subjectType="role" subjectId={roleId} />
              </TabsContent>

              <TabsContent value="members" className="mt-6 text-sm">
                {memberAgents.length === 0 ? (
                  <p className="text-muted-foreground">No agents in this role.</p>
                ) : (
                  <ul className="list-disc pl-4">
                    {memberAgents.map((a) => (
                      <li key={a.id}>{a.name}</li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
} 