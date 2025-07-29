"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Label } from "./ui/label"
import { Alert, AlertDescription } from "./ui/alert"
import { Loader2, Plus, Server, Globe } from "lucide-react"

interface CreateMcpServerFormProps {
  onCreateMcpServer: (name: string, url: string) => Promise<void>
  loading?: boolean
  error?: string | null
}

export function CreateMcpServerForm({ onCreateMcpServer, loading, error }: CreateMcpServerFormProps) {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!name.trim() || !url.trim()) {
      return
    }

    try {
      setIsSubmitting(true)
      await onCreateMcpServer(name.trim(), url.trim())
      setName("") // Clear form on success
      setUrl("")
    } catch (err) {
      // Error is handled by the parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = loading || isSubmitting

  return (
    <Card className="bg-gradient-to-br from-white to-blue-50/30 border-blue-200/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Server className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">Add MCP Server</CardTitle>
            <CardDescription className="text-sm">
              Connect a new Model Context Protocol server
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="server-name" className="text-sm font-medium">
              Server Name
            </Label>
            <Input
              id="server-name"
              type="text"
              placeholder="e.g., File System Server"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="text-xs text-muted-foreground">
              Choose a descriptive name for your MCP server
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="server-url" className="text-sm font-medium">
              Server URL
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="server-url"
                type="url"
                placeholder="http://localhost:3000/mcp"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                required
                className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The URL where your MCP server is running
            </p>
          </div>
          
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            disabled={isLoading || !name.trim() || !url.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add MCP Server
              </>
            )}
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              The server will be tested for connectivity
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 