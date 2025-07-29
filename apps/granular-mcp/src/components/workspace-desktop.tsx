"use client"

import { useDroppable } from "@dnd-kit/core"
import { Card, CardContent } from "./ui/card"
import { Monitor, Grid3X3, Layout, Plus, Server } from "lucide-react"

interface AttachedServer {
  path: string
  label: string | null
}

interface WorkspaceDesktopProps {
  id: string
  workspaceName: string
  attachedServers: AttachedServer[]
  droppedItems?: Array<{
    id: string
    type: 'mcp-server' | 'database' | 'resource'
    name: string
    description?: string
    position?: { x: number; y: number }
    isAttached?: boolean
  }>
  onItemDropped?: (item: any) => void
}

export function WorkspaceDesktop({ id, workspaceName, attachedServers, droppedItems = [], onItemDropped }: WorkspaceDesktopProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  // Deduplicate attached servers by path
  const uniqueServers = Array.from(
    new Map(attachedServers.map(s => [s.path, s])).values()
  )

  // Get the middleware URL for this workspace
  const middlewareUrl = typeof window !== 'undefined' ? `http://localhost:3099/mcp/${id}` : `/mcp/${id}`;

  return (
    <Card 
      ref={setNodeRef}
      className={`min-h-[400px] bg-gradient-to-br from-gray-50 to-gray-100/50 border-2 border-dashed transition-all duration-200 ${
        isOver 
          ? 'border-blue-400 bg-blue-50/50 shadow-lg' 
          : 'border-gray-300'
      }`}
    >
      <CardContent className="p-8">
        {/* Middleware URL display */}
        <div className="mb-6">
          <span className="text-xs font-semibold text-muted-foreground">Middleware URL:</span>
          <span className="ml-2 px-2 py-1 bg-gray-100 rounded font-mono text-xs text-blue-700 select-all">
            {middlewareUrl}
          </span>
        </div>
        {/* Attached Servers Only */}
        {uniqueServers.length > 0 ? (
          <div className="flex flex-wrap gap-6">
            {uniqueServers.map((server) => (
              <div
                key={server.path}
                className="bg-white rounded-lg shadow-md border border-green-200 bg-green-50 p-3 min-w-[200px] max-w-xs flex-1"
              >
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-green-600" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{server.label || 'Unnamed Server'}</h4>
                    <p className="text-xs text-muted-foreground">Attached to workspace</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Monitor className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">{workspaceName} Desktop</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Drag and drop MCP servers and other resources from the sidebar to get started.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Grid3X3 className="h-4 w-4" />
                <span>Drag & drop</span>
              </div>
              <div className="flex items-center gap-1">
                <Layout className="h-4 w-4" />
                <span>Organize</span>
              </div>
            </div>
            
            {/* Drop Zone Indicator */}
            {isOver && (
              <div className="mt-8 p-4 bg-blue-100/50 rounded-lg border-2 border-dashed border-blue-400">
                <div className="flex items-center justify-center gap-2 text-blue-700">
                  <Plus className="h-5 w-5" />
                  <span className="font-medium">Drop here to add to workspace</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 