"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Server, Check } from "lucide-react"

interface DraggableMcpServerProps {
  id: string
  server: {
    path: string | null
    label: string | null
    description: string | null
  }
  isDragging?: boolean
  isAttached?: boolean
}

export function DraggableMcpServer({ id, server, isDragging = false, isAttached = false }: DraggableMcpServerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className={`group hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing border-gray-200 hover:border-blue-300 ${
        isAttached ? 'bg-green-50 border-green-200' : ''
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isAttached 
                ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
            }`}>
              {isAttached ? (
                <Check className="h-4 w-4 text-white" />
              ) : (
                <Server className="h-4 w-4 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {server.label || "Unnamed Server"}
              </h4>
              <p className="text-xs text-muted-foreground truncate">
                {server.description || "No description"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Badge variant={isAttached ? "default" : "outline"} className={`text-xs ${
              isAttached ? 'bg-green-100 text-green-800 border-green-200' : ''
            }`}>
              {isAttached ? 'Attached' : 'Available'}
            </Badge>
            {!isAttached && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                Add
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 