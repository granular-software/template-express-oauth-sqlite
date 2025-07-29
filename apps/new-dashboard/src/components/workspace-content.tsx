"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Shield, Server, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// Define types for the data structure
interface Agent {
  id: string
  name: string
  description?: string
  workspaceId: string
  stopped?: boolean
}

interface Role {
  id: string
  name: string
  description?: string
  workspaceId: string
}

interface MCPServer {
  id: string
  name: string
  url: string
  workspaceId: string
}

interface WorkspaceData {
  agents: Agent[]
  roles: Role[]
  mcpServers: MCPServer[]
  loading: {
    agents: boolean
    roles: boolean
    servers: boolean
  }
  errors: {
    agents: string | null
    roles: string | null
    servers: string | null
  }
}

interface WorkspaceActions {
  createAgent: (name: string, description?: string) => Promise<void>
  createRole: (name: string, description?: string) => Promise<void>
  createMCPServer: (name: string, url: string) => Promise<void>
}

interface WorkspaceContentProps {
  workspaceId: string
  workspaceName: string
  data: WorkspaceData
  actions: WorkspaceActions
}

export function WorkspaceContent({ workspaceId, data, actions }: WorkspaceContentProps) {
  const pathname = usePathname()

  // Form states for dialogs
  const [agentDialogOpen, setAgentDialogOpen] = React.useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false)
  const [serverDialogOpen, setServerDialogOpen] = React.useState(false)

  // Form values
  const [agentForm, setAgentForm] = React.useState({ name: "", description: "" })
  const [roleForm, setRoleForm] = React.useState({ name: "", description: "" })
  const [serverForm, setServerForm] = React.useState({ name: "", url: "" })

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await actions.createAgent(agentForm.name, agentForm.description)
      setAgentForm({ name: "", description: "" })
      setAgentDialogOpen(false)
    } catch (error) {
      console.error("Failed to create agent:", error)
    }
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await actions.createRole(roleForm.name, roleForm.description)
      setRoleForm({ name: "", description: "" })
      setRoleDialogOpen(false)
    } catch (error) {
      console.error("Failed to create role:", error)
    }
  }

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await actions.createMCPServer(serverForm.name, serverForm.url)
      setServerForm({ name: "", url: "" })
      setServerDialogOpen(false)
    } catch (error) {
      console.error("Failed to create MCP server:", error)
    }
  }

  return (
    <>
      {/* Agents Section */}
      <SidebarGroup>
        <SidebarGroupLabel>Agents</SidebarGroupLabel>
        <SidebarMenu>
          {data.agents.map((agent) => (
            <SidebarMenuItem key={agent.id}>
              <SidebarMenuButton 
                asChild 
                isActive={pathname === `/workspaces/${workspaceId}/agents/${agent.id}`}
              >
                <Link href={`/workspaces/${workspaceId}/agents/${agent.id}`}>
                  <div className={`size-3 rounded-full ${agent.stopped ? 'bg-red-500' : 'bg-green-500'}`} />
                  <span>{agent.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
              <DialogTrigger asChild>
                <SidebarMenuButton>
                  <Plus className="size-4" />
                  <span>Add Agent</span>
                </SidebarMenuButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Agent</DialogTitle>
                  <DialogDescription>
                    Add a new agent to your workspace. Agents help automate tasks and provide AI assistance.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAgent}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="agent-name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="agent-name"
                        value={agentForm.name}
                        onChange={(e) => setAgentForm(prev => ({ ...prev, name: e.target.value }))}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="agent-description" className="text-right">
                        Description
                      </Label>
                      <Textarea
                        id="agent-description"
                        value={agentForm.description}
                        onChange={(e) => setAgentForm(prev => ({ ...prev, description: e.target.value }))}
                        className="col-span-3"
                        placeholder="Optional description..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Create Agent</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      {/* Roles Section */}
      <SidebarGroup>
        <SidebarGroupLabel>Roles</SidebarGroupLabel>
        <SidebarMenu>
          {data.roles.map((role) => (
            <SidebarMenuItem key={role.id}>
              <SidebarMenuButton 
                asChild 
                isActive={pathname === `/workspaces/${workspaceId}/roles/${role.id}`}
              >
                <Link href={`/workspaces/${workspaceId}/roles/${role.id}`}>
                  <Shield className="size-4" />
                  <span>{role.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
              <DialogTrigger asChild>
                <SidebarMenuButton>
                  <Plus className="size-4" />
                  <span>Add Role</span>
                </SidebarMenuButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                  <DialogDescription>
                    Add a new role to manage permissions and access control in your workspace.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateRole}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role-name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="role-name"
                        value={roleForm.name}
                        onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role-description" className="text-right">
                        Description
                      </Label>
                      <Textarea
                        id="role-description"
                        value={roleForm.description}
                        onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                        className="col-span-3"
                        placeholder="Optional description..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Create Role</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      {/* MCP Servers Section */}
      <SidebarGroup>
        <SidebarGroupLabel>MCP Servers</SidebarGroupLabel>
        <SidebarMenu>
          {data.mcpServers.map((server) => (
            <SidebarMenuItem key={server.id}>
              <SidebarMenuButton 
                asChild 
                isActive={pathname === `/workspaces/${workspaceId}/mcp-servers/${server.id}`}
              >
                <Link href={`/workspaces/${workspaceId}/mcp-servers/${server.id}`}>
                  <Server className="size-4" />
                  <span>{server.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <Dialog open={serverDialogOpen} onOpenChange={setServerDialogOpen}>
              <DialogTrigger asChild>
                <SidebarMenuButton>
                  <Plus className="size-4" />
                  <span>Add MCP Server</span>
                </SidebarMenuButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New MCP Server</DialogTitle>
                  <DialogDescription>
                    Add a new MCP server connection to extend your workspace capabilities.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateServer}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="server-name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="server-name"
                        value={serverForm.name}
                        onChange={(e) => setServerForm(prev => ({ ...prev, name: e.target.value }))}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="server-url" className="text-right">
                        URL
                      </Label>
                      <Input
                        id="server-url"
                        value={serverForm.url}
                        onChange={(e) => setServerForm(prev => ({ ...prev, url: e.target.value }))}
                        className="col-span-3"
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  )
} 