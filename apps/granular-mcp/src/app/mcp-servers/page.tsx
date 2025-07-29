"use client"

import { PageLayout } from "@/components/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreateMcpServerForm } from "@/components/create-mcp-server-form"
import { useMcpServers } from "@/hooks/use-mcp-servers"
import { Server, Plus, Settings, ArrowRight, Calendar, Activity, Globe, Zap, Database } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog"

export default function McpServersPage() {
  const { servers, loading, error, createMcpServer, fetchServers } = useMcpServers()

  const handleCreateMcpServer = async (name: string, url: string) => {
    await createMcpServer(name, url)
  }

  // Debug logging
  console.log("MCP Servers List Debug:", {
    serversCount: servers.length,
    servers: servers.map(s => ({ path: s.path, label: s.label })),
    loading,
    error
  })

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                MCP Servers
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Manage your Model Context Protocol servers and their capabilities
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchServers}
                disabled={loading}
              >
                <Activity className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Badge variant="secondary" className="px-3 py-1">
                <Activity className="w-3 h-3 mr-1" />
                {servers.length} Connected
              </Badge>

              {/* Modal trigger */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" /> New MCP Server
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <CreateMcpServerForm onCreateMcpServer={handleCreateMcpServer} loading={loading} error={error} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-4">
            {/* Create MCP Server Form column hidden (replaced by modal) */}
            <div className="hidden">
              <div className="sticky top-6">
                <CreateMcpServerForm
                  onCreateMcpServer={handleCreateMcpServer}
                  loading={loading}
                  error={error}
                />
              </div>
            </div>

            {/* MCP Servers List */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">Loading MCP servers...</p>
                  </div>
                </div>
              ) : error ? (
                <Card className="border-destructive/50">
                  <CardContent className="pt-6">
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              ) : servers.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="pt-12 pb-12">
                    <div className="text-center">
                      <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full flex items-center justify-center mb-6">
                        <Server className="h-12 w-12 text-blue-600" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-3">No MCP servers yet</h3>
                      <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                        Connect your first MCP server to start building AI applications with external tools and resources.
                      </p>
                      <Button size="lg" className="px-8">
                        <Plus className="h-5 w-5 mr-2" />
                        Connect Your First Server
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">Your MCP Servers</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{servers.length} server{servers.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    {servers.map((server) => (
                      <Card key={server.path} className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-0 shadow-sm bg-gradient-to-br from-white to-gray-50/50">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                <Server className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                  {server.label || "Unnamed Server"}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    Connected
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {server.path}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <p className="text-muted-foreground mb-6 line-clamp-2">
                            {server.description || "No description provided for this MCP server."}
                          </p>
                          
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <Zap className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                              <div className="text-sm font-medium text-gray-900">0</div>
                              <div className="text-xs text-muted-foreground">Tools</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <Database className="h-5 w-5 text-green-600 mx-auto mb-1" />
                              <div className="text-sm font-medium text-gray-900">0</div>
                              <div className="text-xs text-muted-foreground">Resources</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <Globe className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                              <div className="text-sm font-medium text-gray-900">HTTP</div>
                              <div className="text-xs text-muted-foreground">Protocol</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Connected recently</span>
                            </div>
                            <Link href={`/mcp-servers/${encodeURIComponent(server.path || '')}`}>
                              <Button size="sm" className="group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                View Server
                                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
} 