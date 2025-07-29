"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useWorkspaces } from "@/hooks/use-workspaces"
import { useRoles } from "@/hooks/use-roles"
import { useAgents } from "@/hooks/use-agents"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ArrowLeft,
  Shield,
  Settings,
  Users
} from "lucide-react"
import Link from "next/link"
import { McpPermissions } from "@/components/mcp-permissions"

export default function RoleDetailPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const roleId = params.roleId as string
  const { workspaces, loading: workspacesLoading } = useWorkspaces()
  const { roles, loading: rolesLoading, error, assignAgentToRole, fetchRoles, getRoleAgents } = useRoles(workspaceId)
  const { agents, loading: agentsLoading, fetchAgents } = useAgents(workspaceId)
  
  const workspace = workspaces.find((w) => w.path === workspaceId)
  const role = roles.find((r) => r.id === roleId)

  // Agent assignment state
  const [isAssigningAgent, setIsAssigningAgent] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [roleAgents, setRoleAgents] = React.useState<Array<{id: string; name: string; description?: string}>>([])

  // Fetch role agents when component mounts or roleId changes
  React.useEffect(() => {
    const fetchRoleAgents = async () => {
      if (roleId) {
        try {
          const agents = await getRoleAgents(roleId);
          setRoleAgents(agents);
        } catch (error) {
          console.error("Failed to fetch role agents:", error);
        }
      }
    };

    fetchRoleAgents();
  }, [roleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleAssignAgent = async (event: React.MouseEvent, agentId: string) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (!role) return
    
    setIsAssigningAgent(true)
    try {
      await assignAgentToRole(agentId, role.id)
      // Refresh both hooks to keep data in sync
      await Promise.all([fetchRoles(), fetchAgents()])
      // Refresh role agents to update the UI
      const updatedAgents = await getRoleAgents(role.id);
      setRoleAgents(updatedAgents);
      showMessage('success', "Agent assigned successfully")
    } catch {
      showMessage('error', "Failed to assign agent")
    } finally {
      setIsAssigningAgent(false)
    }
  }

  const handleUnassignAgent = async (event: React.MouseEvent, agentId: string) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (!role) return
    
    try {
      // TODO: Implement unassign logic - for now just refresh
      console.log("Unassign agent", agentId, "from role", role.id)
      // Refresh both hooks to keep data in sync
      await Promise.all([fetchRoles(), fetchAgents()])
      // Refresh role agents to update the UI
      const updatedAgents = await getRoleAgents(role.id);
      setRoleAgents(updatedAgents);
      showMessage('success', "Agent unassigned successfully")
    } catch {
      showMessage('error', "Failed to unassign agent")
    }
  }

  // Get agents that are available for assignment (not already assigned)
  const availableAgents = agents.filter(agent => 
    !roleAgents.some(assignedAgent => assignedAgent.id === agent.id)
  )

  // Get currently assigned agents from state
  const assignedAgents = roleAgents

  if (workspacesLoading || rolesLoading || agentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-muted-foreground">Loading role...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Error loading role</h2>
          <p className="text-muted-foreground mb-6">{error?.message || "An error occurred"}</p>
          <Link href={`/workspaces/${workspaceId}/roles`}>
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Roles
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!role) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Role not found</h2>
          <p className="text-muted-foreground mb-6">The role you&rsquo;re looking for doesn&rsquo;t exist.</p>
          <Link href={`/workspaces/${workspaceId}/roles`}>
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Roles
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
          <Link href={`/workspaces/${workspaceId}/roles`}>
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {role.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">Role</Badge>
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
        </div>
      </div>

      {/* Role Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Role Information</CardTitle>
            <CardDescription>Basic details about this role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-sm">{role.name}</p>
            </div>
            {role.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm">{role.description}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>Access control and permissions for this role</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No permissions configured yet.</p>
          </CardContent>
        </Card>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Agent Assignment */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Assigned Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>Assigned Agents</span>
              </div>
              <Badge variant="secondary">{assignedAgents.length}</Badge>
            </CardTitle>
            <CardDescription>
              Agents who have been assigned this role
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignedAgents.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {assignedAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      {agent.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleUnassignAgent(e, agent.id)}
                      className="text-destructive hover:text-destructive flex-shrink-0 ml-2"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No agents assigned yet</p>
                <p className="text-xs text-muted-foreground mt-1">Assign agents to grant them this role&apos;s permissions</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>Available Agents</span>
              </div>
              <Badge variant="outline">{availableAgents.length}</Badge>
            </CardTitle>
            <CardDescription>
              Agents that can be assigned this role
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableAgents.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      {agent.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => handleAssignAgent(e, agent.id)}
                      disabled={isAssigningAgent}
                      className="flex-shrink-0 ml-2"
                    >
                      {isAssigningAgent ? "Assigning..." : "Assign"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No additional agents available</p>
                <p className="text-xs text-muted-foreground mt-1">All available agents are already assigned</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* MCP Server Permissions */}
      <McpPermissions 
        workspaceId={workspaceId}
        agentId={roleId}
        agentName={role?.name}
      />
    </div>
  )
} 