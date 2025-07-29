"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Label } from "./ui/label"
import { Alert, AlertDescription } from "./ui/alert"
import { Loader2, Plus, Sparkles } from "lucide-react"

interface CreateWorkspaceFormProps {
  onCreateWorkspace: (name: string) => Promise<void>
  loading?: boolean
  error?: string | null
}

export function CreateWorkspaceForm({ onCreateWorkspace, loading, error }: CreateWorkspaceFormProps) {
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!name.trim()) {
      return
    }

    try {
      setIsSubmitting(true)
      await onCreateWorkspace(name.trim())
      setName("") // Clear form on success
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
            <Plus className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">Create Workspace</CardTitle>
            <CardDescription className="text-sm">
              Start organizing your projects
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name" className="text-sm font-medium">
              Workspace Name
            </Label>
            <Input
              id="workspace-name"
              type="text"
              placeholder="e.g., AI Research Lab"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="text-xs text-muted-foreground">
              Choose a descriptive name for your workspace
            </p>
          </div>
          
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            disabled={isLoading || !name.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Workspace
              </>
            )}
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              You can add MCP servers and databases later
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 