"use client"

import * as React from "react"
import { ChevronsUpDown, FolderOpen, Plus } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useWorkspaces } from "@/hooks/use-workspaces"

export function WorkspaceSwitcher() {
  const { isMobile } = useSidebar()
  const { workspaces, loading, createWorkspace } = useWorkspaces()
  const router = useRouter()
  const pathname = usePathname()
  
  // Extract workspace ID from pathname like /workspaces/workspace-id
  const currentWorkspaceId = pathname.startsWith('/workspaces/') 
    ? pathname.split('/workspaces/')[1]?.split('/')[0] 
    : null
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({
    name: "",
    description: ""
  })

  const handleWorkspaceSelect = (workspacePath: string) => {
    router.push(`/workspaces/${workspacePath}`)
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    await createWorkspace(formData.name, formData.description)
    setFormData({ name: "", description: "" })
    setIsCreateOpen(false)
  }

  const currentWorkspace = workspaces.find(w => w.path === currentWorkspaceId)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <FolderOpen className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {loading ? "Loading..." : (currentWorkspace?.name || "Select Workspace")}
                </span>
                <span className="truncate text-xs">
                  {currentWorkspace?.description || "Choose a workspace to get started"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleWorkspaceSelect(workspace.path)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <FolderOpen className="size-4 shrink-0" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{workspace.name}</span>
                  {workspace.description && (
                    <span className="text-xs text-muted-foreground">
                      {workspace.description}
                    </span>
                  )}
                </div>
                <DropdownMenuShortcut>⌘{workspace.id.slice(-1)}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <DropdownMenuItem 
                  onSelect={(e: Event) => {
                    e.preventDefault()
                    setIsCreateOpen(true)
                  }}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border border-dashed">
                    <Plus className="size-4" />
                  </div>
                  <div className="font-medium text-muted-foreground">Add workspace</div>
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleCreateWorkspace}>
                  <DialogHeader>
                    <DialogTitle>Create workspace</DialogTitle>
                    <DialogDescription>
                      Add a new workspace to organize your projects and resources.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter workspace name"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter workspace description (optional)"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Create workspace</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
} 