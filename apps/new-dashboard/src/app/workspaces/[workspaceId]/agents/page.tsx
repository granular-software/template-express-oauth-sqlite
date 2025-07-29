"use client"

import { useParams } from "next/navigation"
import { useWorkspaces } from "@/hooks/use-workspaces"
import { useAgents } from "@/hooks/use-agents"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeft,
  Users,
  Plus,
  Settings,
  Play,
  Pause
} from "lucide-react"
import Link from "next/link"
import * as React from "react"

export default function AgentsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { workspaces, loading: workspacesLoading } = useWorkspaces()
  const { agents, loading: agentsLoading, error, createAgent, updateAgentStatus } = useAgents(workspaceId)
  
  const workspace = workspaces.find((w) => w.path === workspaceId)
  
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false)
  const [agentToToggle, setAgentToToggle] = React.useState<{id: string, name: string, stopped: boolean} | null>(null)
  const [formData, setFormData] = React.useState({
    name: "",
    description: ""
  })

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      await createAgent(formData.name)
      setFormData({ name: "", description: "" })
      setIsCreateOpen(false)
    } catch (error) {
      console.error("Failed to create agent:", error)
    }
  }

  const handleToggleAgentStatus = (e: React.MouseEvent, agentId: string, agentName: string, currentStopped: boolean) => {
    e.preventDefault()
    e.stopPropagation()
    
    setAgentToToggle({ id: agentId, name: agentName, stopped: currentStopped })
    setConfirmDialogOpen(true)
  }

  const confirmToggleStatus = async () => {
    if (!agentToToggle) return
    
    try {
      await updateAgentStatus(agentToToggle.id, !agentToToggle.stopped)
      setConfirmDialogOpen(false)
      setAgentToToggle(null)
    } catch (error) {
      console.error("Failed to update agent status:", error)
    }
  }

  if (workspacesLoading || agentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-muted-foreground">Loading agents...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Users className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Error loading agents</h2>
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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Agents
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">{agents.length} agents</Badge>
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
                Add Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreateAgent}>
                <DialogHeader>
                  <DialogTitle>Create Agent</DialogTitle>
                  <DialogDescription>
                    Add a new AI agent to automate tasks and provide assistance.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="agent-name">Name</Label>
                    <Input
                      id="agent-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter agent name"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="agent-description">Description</Label>
                    <Textarea
                      id="agent-description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter agent description (optional)"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Agent</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {agentToToggle?.stopped ? "Start Agent" : "Stop Agent"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {agentToToggle?.stopped ? "start" : "stop"} the agent &quot;{agentToToggle?.name}&quot;?
              {!agentToToggle?.stopped && " This will halt all ongoing tasks."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmToggleStatus}
              variant={agentToToggle?.stopped ? "default" : "destructive"}
            >
              {agentToToggle?.stopped ? "Start Agent" : "Stop Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agents Grid */}
      {agents.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No agents yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first agent to start automating tasks and providing AI assistance.
            </p>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleCreateAgent}>
                  <DialogHeader>
                    <DialogTitle>Create Agent</DialogTitle>
                    <DialogDescription>
                      Add a new AI agent to automate tasks and provide assistance.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="empty-agent-name">Name</Label>
                      <Input
                        id="empty-agent-name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter agent name"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="empty-agent-description">Description</Label>
                      <Textarea
                        id="empty-agent-description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter agent description (optional)"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Create Agent</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/workspaces/${workspaceId}/agents/${agent.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {agent.name}
                  </CardTitle>
                  {agent.description && (
                    <CardDescription>
                      {agent.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={agent.stopped ? "destructive" : "default"}>
                        {agent.stopped ? "Stopped" : "Running"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => handleToggleAgentStatus(e, agent.id, agent.name, agent.stopped || false)}
                        title={agent.stopped ? "Start agent" : "Stop agent"}
                      >
                        {agent.stopped ? (
                          <Play className="h-4 w-4 text-green-600" />
                        ) : (
                          <Pause className="h-4 w-4 text-orange-600" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
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