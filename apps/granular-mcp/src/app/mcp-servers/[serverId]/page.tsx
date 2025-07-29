"use client"

import { PageLayout } from "@/components/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Server, 
  ArrowLeft,
  Activity,
  Globe,
  Zap,
  Database,
  FileText,
  Code,
  Settings,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  Info,
  Wifi,
  WifiOff
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useMcpServers } from "@/hooks/use-mcp-servers"
import { useMcpServerDetails } from "@/hooks/use-mcp-server-details"

export default function McpServerPage() {
  const params = useParams()
  const serverId = params.serverId as string
  const { servers, loading } = useMcpServers()
  const { serverDetails, loading: detailsLoading, error } = useMcpServerDetails(serverId)
  
  // Decode the serverId from URL and find the server
  const decodedServerId = decodeURIComponent(serverId)
  const server = servers.find(s => s.path === decodedServerId)

  // Debug logging
  console.log("MCP Server Page Debug:", {
    serverId,
    decodedServerId,
    serversCount: servers.length,
    serverPaths: servers.map(s => s.path),
    foundServer: server,
    loading
  })

  if (loading) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium text-muted-foreground">Loading MCP server...</p>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!server) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Server className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">MCP Server not found</h2>
              <p className="text-muted-foreground mb-6">
                The MCP server with path "{decodedServerId}" doesn't exist.
              </p>
              <div className="text-sm text-muted-foreground mb-6">
                <p>Available servers ({servers.length}):</p>
                <ul className="mt-2 space-y-1">
                  {servers.map((s, index) => (
                    <li key={index} className="font-mono text-xs">
                      {s.path} - {s.label}
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/mcp-servers">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to MCP Servers
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  const getConnectionStatusIcon = () => {
    if (!serverDetails) return <WifiOff className="h-4 w-4 text-gray-400" />
    
    switch (serverDetails.connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />
    }
  }

  const getConnectionStatusText = () => {
    if (!serverDetails) return "Unknown"
    
    switch (serverDetails.connectionStatus) {
      case 'connected':
        return "Connected"
      case 'error':
        return "Connection Error"
      default:
        return "Disconnected"
    }
  }

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/mcp-servers">
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Server className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      {server.label || "Unnamed Server"}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {getConnectionStatusText()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{server.path}</span>
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
              {serverDetails?.url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={serverDetails.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Server
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Server Status */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700">Tools</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {detailsLoading ? "..." : serverDetails?.tools?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <Database className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700">Resources</p>
                    <p className="text-2xl font-bold text-green-900">
                      {detailsLoading ? "..." : serverDetails?.resources?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-700">Templates</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {detailsLoading ? "..." : serverDetails?.resourceTemplates?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    {getConnectionStatusIcon()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-700">Status</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {getConnectionStatusText()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-indigo-700">Protocol</p>
                    <p className="text-2xl font-bold text-indigo-900">MCP</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="tools" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Tools
              </TabsTrigger>
              <TabsTrigger value="resources" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Resources
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="metadata" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Metadata
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Server Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Name</p>
                        <p className="text-sm mt-1">{server.label || "Unnamed Server"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getConnectionStatusIcon()}
                          <span className="text-sm">{getConnectionStatusText()}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">URL</p>
                        <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded mt-1 break-all">
                          {serverDetails?.url || "Not configured"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Path</p>
                        <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded mt-1">{server.path}</p>
                      </div>
                    </div>
                    {server.description && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Description</p>
                        <p className="text-sm mt-1">{server.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Zap className="h-4 w-4 mr-2" />
                      Test Connection
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Code className="h-4 w-4 mr-2" />
                      View Logs
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure Server
                    </Button>
                    {serverDetails?.url && (
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a href={serverDetails.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in Inspector
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tools" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Available Tools
                      </CardTitle>
                      <CardDescription>
                        Tools and functions provided by this MCP server
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {detailsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Loading tools...</p>
                    </div>
                  ) : serverDetails?.tools?.length === 0 ? (
                    <div className="text-center py-12">
                      <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No tools available</h3>
                      <p className="text-muted-foreground mb-6">
                        This MCP server doesn't provide any tools
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {serverDetails?.tools?.map((tool, index) => (
                        <Card key={index} className="border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{tool.name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                                {tool.inputSchema && (
                                  <div className="mt-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Parameters:</p>
                                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                      {JSON.stringify(tool.inputSchema, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                              <Button size="sm" variant="outline">
                                Test
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resources" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Available Resources
                      </CardTitle>
                      <CardDescription>
                        Resources and data provided by this MCP server
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {detailsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Loading resources...</p>
                    </div>
                  ) : serverDetails?.resources?.length === 0 ? (
                    <div className="text-center py-12">
                      <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No resources available</h3>
                      <p className="text-muted-foreground mb-6">
                        This MCP server doesn't provide any resources
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {serverDetails?.resources?.map((resource, index) => (
                        <Card key={index} className="border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{resource.name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span>URI: {resource.uri}</span>
                                  <span>Type: {resource.mimeType}</span>
                                </div>
                              </div>
                              <Button size="sm" variant="outline">
                                View
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Resource Templates
                      </CardTitle>
                      <CardDescription>
                        Resource templates provided by this MCP server
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {detailsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Loading templates...</p>
                    </div>
                  ) : serverDetails?.resourceTemplates?.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No templates available</h3>
                      <p className="text-muted-foreground mb-6">
                        This MCP server doesn't provide any resource templates
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {serverDetails?.resourceTemplates?.map((template, index) => (
                        <Card key={index} className="border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{template.name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span>URI: {template.uri}</span>
                                  <span>Type: {template.mimeType}</span>
                                </div>
                              </div>
                              <Button size="sm" variant="outline">
                                Use Template
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metadata" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Server Metadata
                  </CardTitle>
                  <CardDescription>
                    Detailed information about this MCP server
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {detailsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Loading metadata...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Server Information</h4>
                        <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                          {JSON.stringify(serverDetails?.metadata || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageLayout>
  )
} 