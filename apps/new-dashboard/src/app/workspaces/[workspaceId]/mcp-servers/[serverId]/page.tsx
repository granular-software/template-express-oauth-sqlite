"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useWorkspaces } from "@/hooks/use-workspaces"
import { useMcpServers, type McpServer, type McpServerContent } from "@/hooks/use-mcp-servers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { 
  ArrowLeft,
  Server,
  Settings,
  Activity,
  ExternalLink,
  Play,
  Pause,
  Download,
  CheckCircle,
  Loader2,
  Wrench,
  Database
} from "lucide-react"
import Link from "next/link"

export default function MCPServerDetailPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const serverId = params.serverId as string
  const { workspaces, loading: workspacesLoading } = useWorkspaces()
  const { mcpServers, loading: serversLoading, error, getMcpServerContent, importMcpServer } = useMcpServers(workspaceId)
  
  const workspace = workspaces.find((w) => w.path === workspaceId)
  const server = mcpServers.find((s: McpServer) => s.id === serverId)

  // State for tools and resources
  const [serverContent, setServerContent] = React.useState<McpServerContent>({ tools: [], resources: [] })
  const [isLoading, setIsLoading] = React.useState(false)
  const [isImporting, setIsImporting] = React.useState(false)
  const [importProgress, setImportProgress] = React.useState({ current: 0, total: 0, currentItem: '' })
  const [message, setMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Fetch server content when component mounts
  React.useEffect(() => {
    const fetchContent = async () => {
      if (workspaceId && serverId) {
        setIsLoading(true)
        try {
          const content = await getMcpServerContent(serverId)
          setServerContent(content)
        } catch (error) {
          console.error("Failed to fetch server content:", error)
          setMessage({ type: 'error', text: 'Failed to load server content' })
        } finally {
          setIsLoading(false)
        }
      }
    }
    
    fetchContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, serverId])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleImportServer = async () => {
    if (!server) return
    
    setIsImporting(true)
    setImportProgress({ current: 0, total: 0, currentItem: '' })
    
    try {
      const result = await importMcpServer(
        server.id,
        server.url,
        (type, name, index, total) => {
          setImportProgress({ current: index, total, currentItem: `${type}: ${name}` })
        }
      )
      
      // Refresh server content after import
      const updatedContent = await getMcpServerContent(serverId)
      setServerContent(updatedContent)
      
      const messages = [
        result.toolsImported > 0 ? `${result.toolsImported} tools` : null,
        result.resourcesImported > 0 ? `${result.resourcesImported} resources` : null,
        result.resourceTemplatesImported > 0 ? `${result.resourceTemplatesImported} resource templates` : null
      ].filter(Boolean)
      
      showMessage('success', `Successfully imported ${messages.join(', ')}`)
    } catch (error) {
      showMessage('error', 'Failed to import server content')
      console.error("Import failed:", error)
    } finally {
      setIsImporting(false)
    }
  }

  const hasContent = serverContent.tools.length > 0 || serverContent.resources.length > 0

  // Don't render if required parameters are missing
  if (!workspaceId || !serverId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (workspacesLoading || serversLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-muted-foreground">Loading MCP server...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Server className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Error loading MCP server</h2>
          <p className="text-muted-foreground mb-6">{error?.message || "An error occurred"}</p>
          <Link href={`/workspaces/${workspaceId}/mcp-servers`}>
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to MCP Servers
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!server) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Server className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">MCP server not found</h2>
          <p className="text-muted-foreground mb-6">The MCP server you&apos;re looking for doesn&apos;t exist.</p>
          <Link href={`/workspaces/${workspaceId}/mcp-servers`}>
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to MCP Servers
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
          <Link href={`/workspaces/${workspaceId}/mcp-servers`}>
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
                  {server.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">MCP Server</Badge>
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
            <Pause className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
            <Play className="h-4 w-4 mr-2" />
            Connect
          </Button>
        </div>
      </div>

      {/* Server Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Server Information</CardTitle>
            <CardDescription>Basic details about this MCP server</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-sm">{server.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">URL</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  {server.url}
                </span>
                <ExternalLink className="h-3 w-3" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">Connected</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Connection Status
            </CardTitle>
            <CardDescription>Current connection and health information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Connection:</span>
                <Badge variant="outline" className="text-green-600">Active</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Last Ping:</span>
                <span className="text-muted-foreground">2 seconds ago</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Response Time:</span>
                <span className="text-muted-foreground">45ms</span>
              </div>
            </div>
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

      {/* Import Progress */}
      {isImporting && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Importing Server Content
            </CardTitle>
            <CardDescription>Connecting to MCP server and importing tools and resources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{importProgress.current} / {importProgress.total}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                />
              </div>
              {importProgress.currentItem && (
                <p className="text-sm text-muted-foreground">Importing: {importProgress.currentItem}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Button - Show when no content and not importing */}
      {!hasContent && !isImporting && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Import Server Content</CardTitle>
            <CardDescription>Connect to the MCP server and import all available tools and resources</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleImportServer} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Import Tools and Resources
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tools and Resources */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                <span>Available Tools</span>
              </div>
              <Badge variant="secondary">{serverContent.tools.length}</Badge>
            </CardTitle>
            <CardDescription>Tools provided by this MCP server</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading tools...
              </div>
            ) : serverContent.tools.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {serverContent.tools.map((tool) => (
                  <div key={tool.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tool.name}</p>
                      {tool.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tools available. Import server content to see available tools.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <span>Available Resources</span>
              </div>
              <Badge variant="secondary">{serverContent.resources.length}</Badge>
            </CardTitle>
            <CardDescription>Resources exposed by this MCP server</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading resources...
              </div>
            ) : serverContent.resources.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {serverContent.resources.map((resource) => (
                  <div key={resource.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{resource.name}</p>
                      {resource.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No resources available. Import server content to see available resources.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 