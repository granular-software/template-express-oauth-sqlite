"use client"

import { useState } from "react"
import { PageLayout } from "@/components/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FolderOpen, 
  Plus, 
  Settings, 
  Users, 
  Database, 
  Server, 
  ArrowLeft,
  Activity,
  Calendar,
  Globe,
  Shield,
  Zap,
  BarChart3,
  FileText,
  GitBranch,
  Clock,
  Monitor,
  Grid3X3,
  Layout
} from "lucide-react"
import { AgentList } from "@/components/agent-list"
import { RoleList } from "@/components/role-list"
import { ResourceList } from "@/components/resource-list"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useWorkspaces } from "../../../hooks/use-workspaces"
import { useMcpServers } from "../../../hooks/use-mcp-servers"
import { useWorkspaceMcpServers } from "../../../hooks/use-workspace-mcp-servers"
import { DraggableMcpServer } from "@/components/draggable-mcp-server"
import { saveResources } from "@/lib/mock-db"
import { WorkspaceDesktop } from "@/components/workspace-desktop"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

interface DroppedItem {
  id: string
  type: 'mcp-server' | 'database' | 'resource'
  name: string
  description?: string
  position?: { x: number; y: number }
  serverData?: any
}

export default function WorkspacePage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { workspaces, loading } = useWorkspaces()
  const { servers, loading: serversLoading } = useMcpServers()
  const { attachedServers, loading: attachedServersLoading, attachMcpServer } = useWorkspaceMcpServers(workspaceId)
  
  const workspace = workspaces.find((w: { path: string | null }) => w.path === workspaceId)

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null)

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && over.id === workspace?.path) {
      const activeId = active.id as string
      const draggedServer = servers.find((s: typeof servers[number], index: number) => (s.path || `server-${index}`) === activeId)
      if (draggedServer && draggedServer.path) {
        try {
          await attachMcpServer(draggedServer.path)
          // Simulate fetching server resources/tools and save them
          const dummyResources = [
            { serverId: draggedServer.path, id: "tool_1", name: "Tool 1", type: "tool" },
            { serverId: draggedServer.path, id: "resource_1", name: "Resource 1", type: "resource" },
          ]
          saveResources(workspaceId, draggedServer.path, dummyResources as any)
          handleItemDropped(draggedServer)
        } catch (error) {
          console.error('Failed to attach MCP server to workspace:', error)
        }
      }
    }
  }

  // Callback for when an item is dropped
  const handleItemDropped = (item: any) => {
    console.log('Item dropped and attached:', item)
    console.log(`Added ${item.label || item.name} to workspace ${workspace?.label}`)
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium text-muted-foreground">Loading workspace...</p>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!workspace) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Workspace not found</h2>
              <p className="text-muted-foreground mb-6">The workspace you're looking for doesn't exist.</p>
              <Link href="/workspaces">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Workspaces
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/workspaces">
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <FolderOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">
                        {workspace.label || "Unnamed Workspace"}
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
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>

            {/* Desktop-like Interface */}
            <div className="grid gap-6 lg:grid-cols-4">
              {/* Main Content Area (Desktop) */}
              <div className="lg:col-span-3">
                {workspace.path && <WorkspaceDesktop
                  id={workspace.path}
                  workspaceName={workspace.label || "Workspace"}
                  attachedServers={attachedServers}
                  onItemDropped={handleItemDropped}
                />}
              </div>

              {/* Sidebar with Tabs */}
              <div className="lg:col-span-1">
                <Card className="sticky top-6">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add to Workspace
                    </CardTitle>
                    <CardDescription>
                      Available resources you can add
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Additional functional tabs */}
                    <Tabs defaultValue="mcp_servers" className="w-full">
                      <TabsList className="grid w-full grid-cols-1 mb-4">
                        <TabsTrigger value="mcp_servers" className="flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          MCP Servers
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="mcp_servers" className="space-y-4">
                        {serversLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-sm text-muted-foreground">Loading servers...</p>
                          </div>
                        ) : servers.length === 0 ? (
                          <div className="text-center py-8">
                            <Server className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No MCP servers available</p>
                          </div>
                        ) : (
                          <SortableContext items={servers.map((s: typeof servers[number], index: number) => s.path || `server-${index}`)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                              {servers.map((server: typeof servers[number], index: number) => {
                                const serverId = server.path || `server-${index}`
                                const isAttached = attachedServers.some((attached: { path: string }) => attached.path === server.path)
                                return (
                                  <DraggableMcpServer
                                    key={serverId}
                                    id={serverId}
                                    server={server}
                                    isDragging={activeId === serverId}
                                    isAttached={isAttached}
                                  />
                                )
                              })}
                            </div>
                          </SortableContext>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Workspace management tabs */}
            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="agents">
                  <TabsList>
                    <TabsTrigger value="agents" className="flex items-center gap-1 text-sm">
                      <Users className="h-4 w-4" /> Agents
                    </TabsTrigger>
                    <TabsTrigger value="roles" className="flex items-center gap-1 text-sm">
                      <Shield className="h-4 w-4" /> Roles
                    </TabsTrigger>
                    <TabsTrigger value="resources" className="flex items-center gap-1 text-sm">
                      <Database className="h-4 w-4" /> Resources
                    </TabsTrigger>
                    <TabsTrigger value="workflows" className="flex items-center gap-1 text-sm">
                      <GitBranch className="h-4 w-4" /> Workflows
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="agents" className="mt-6">
                    {workspace.path && <AgentList workspaceId={workspace.path} />}
                  </TabsContent>

                  <TabsContent value="roles" className="mt-6">
                    {workspace.path && <RoleList workspaceId={workspace.path} />}
                  </TabsContent>

                  <TabsContent value="resources" className="mt-6">
                    {workspace.path && <ResourceList workspaceId={workspace.path} />}
                  </TabsContent>

                  <TabsContent value="workflows" className="mt-6 text-muted-foreground text-sm">
                    Workflows feature coming soon.
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Workspace Info Footer */}
            <Card className="bg-gradient-to-r from-gray-50 to-blue-50/30 border-gray-200">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Server className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">{attachedServers.length}</p>
                    <p className="text-xs text-muted-foreground">MCP Servers</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Database className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">0</p>
                    <p className="text-xs text-muted-foreground">Databases</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">1</p>
                    <p className="text-xs text-muted-foreground">Members</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Activity className="h-6 w-6 text-orange-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">Active</p>
                    <p className="text-xs text-muted-foreground">Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId ? (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[200px]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Server className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {servers.find((s: { path: string | null }) => s.path === activeId)?.label || "Server"}
                  </h4>
                  <p className="text-xs text-muted-foreground">Dragging...</p>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </PageLayout>
  )
} 