"use client"

import { useParams } from "next/navigation"
import { useWorkspaces } from "@/hooks/use-workspaces"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  FolderOpen,
  ArrowLeft,
  Settings,
  Users,
  Server,
  Shield
} from "lucide-react"
import Link from "next/link"

export default function WorkspacePage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { workspaces, loading, error } = useWorkspaces()
  
  const workspace = workspaces.find((w) => w.path === workspaceId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FolderOpen className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Error loading workspace</h2>
          <p className="text-muted-foreground mb-6">{error?.message || "An error occurred"}</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Workspace not found</h2>
          <p className="text-muted-foreground mb-6">The workspace you&rsquo;re looking for doesn&rsquo;t exist.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {workspace.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                  <span className="text-sm text-muted-foreground">{workspace.path}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${workspaceId}/agents`}>
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Agents
            </Button>
          </Link>
          <Link href={`/workspaces/${workspaceId}/roles`}>
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Roles
            </Button>
          </Link>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Description */}
      {workspace.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{workspace.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href={`/workspaces/${workspaceId}/mcp-servers`}>
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                MCP Servers
              </CardTitle>
              <CardDescription>
                Manage and configure your MCP server connections
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`/workspaces/${workspaceId}/agents`}>
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Agents
              </CardTitle>
              <CardDescription>
                View and manage your AI agents and their configurations
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`/workspaces/${workspaceId}/roles`}>
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles
              </CardTitle>
              <CardDescription>
                Manage permissions and access control for your workspace
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
} 