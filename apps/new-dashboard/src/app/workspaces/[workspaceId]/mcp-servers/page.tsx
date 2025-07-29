"use client"

import { useParams } from "next/navigation"
import { useWorkspaces } from "@/hooks/use-workspaces"
import { useMcpServers } from "@/hooks/use-mcp-servers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft,
  Server,
  Plus,
  Settings,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import * as React from "react"

export default function MCPServersPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { workspaces, loading: workspacesLoading } = useWorkspaces()
  const { mcpServers, loading: serversLoading, error, createMCPServer } = useMcpServers(workspaceId)
  
  const workspace = workspaces.find((w) => w.path === workspaceId)
  
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({
    name: "",
    url: ""
  })

  const handleCreateMCPServer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.url.trim()) return

    try {
      await createMCPServer(formData.name, formData.url)
      setFormData({ name: "", url: "" })
      setIsCreateOpen(false)
    } catch (error) {
      console.error("Failed to create MCP server:", error)
    }
  }

  if (workspacesLoading || serversLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-muted-foreground">Loading MCP servers...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Server className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Error loading MCP servers</h2>
          <p className="text-muted-foreground mb-6">{error?.message || "An error occurred"}</p>
          <Link href={`/workspaces/${workspaceId}`}>
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workspace
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
          <Link href={`/workspaces/${workspaceId}`}>
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Server className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  MCP Servers
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">{mcpServers.length} servers</Badge>
                  {workspace && (
                    <span className="text-sm text-muted-foreground">in {workspace.name}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add MCP Server
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreateMCPServer}>
                <DialogHeader>
                  <DialogTitle>Create MCP Server</DialogTitle>
                  <DialogDescription>
                    Connect a new Model Context Protocol server to extend your workspace capabilities.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="server-name">Name</Label>
                    <Input
                      id="server-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter server name"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="server-url">URL</Label>
                    <Input
                      id="server-url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="mcp://localhost:3000"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create MCP Server</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* MCP Servers Grid */}
      {mcpServers.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Server className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No MCP servers yet</h3>
            <p className="text-muted-foreground mb-6">
              Connect your first MCP server to extend your workspace capabilities with external tools and resources.
            </p>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First MCP Server
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleCreateMCPServer}>
                  <DialogHeader>
                    <DialogTitle>Create MCP Server</DialogTitle>
                    <DialogDescription>
                      Connect a new Model Context Protocol server to extend your workspace capabilities.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="empty-server-name">Name</Label>
                      <Input
                        id="empty-server-name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter server name"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="empty-server-url">URL</Label>
                      <Input
                        id="empty-server-url"
                        value={formData.url}
                        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="mcp://localhost:3000"
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Create MCP Server</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mcpServers.map((server) => (
            <Link key={server.id} href={`/workspaces/${workspaceId}/mcp-servers/${server.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    {server.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {server.url}
                    </span>
                    <ExternalLink className="h-3 w-3" />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Connected</Badge>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
} 