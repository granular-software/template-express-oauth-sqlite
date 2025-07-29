"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  AudioWaveform,
  BookOpen,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { WorkspaceContent } from "@/components/workspace-content"
import { useWorkspaces } from "@/hooks/use-workspaces"
import { useAgents } from "@/hooks/use-agents"
import { useRoles } from "@/hooks/use-roles"
import { useMcpServers } from "@/hooks/use-mcp-servers"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Overview",
      url: "/",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "All Workspaces",
          url: "/",
        },
        {
          title: "Recent Activity",
          url: "#",
        },
        {
          title: "System Status",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Getting Started",
          url: "#",
        },
        {
          title: "API Reference",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Preferences",
          url: "#",
        },
        {
          title: "Account",
          url: "#",
        },
        {
          title: "Security",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Quick Actions",
      url: "/",
      icon: Frame,
    },
    {
      name: "System Health",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Help Center",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { workspaces } = useWorkspaces()
  
  // Extract workspace ID from pathname like /workspaces/workspace-id
  const currentWorkspaceId = pathname.startsWith('/workspaces/') 
    ? pathname.split('/workspaces/')[1]?.split('/')[0] 
    : null

  // Get workspace name for display
  const currentWorkspace = workspaces.find(w => w.path === currentWorkspaceId)
  
  // Determine if we should show workspace content
  // Show workspace content if we have a workspace ID from the path, even if data isn't loaded yet
  const isWorkspacePage = Boolean(currentWorkspaceId)
  const workspaceName = currentWorkspace?.name || "Loading..."

  // Only fetch workspace data when we're on a workspace page
  // This prevents unnecessary re-fetching on every navigation
  const { 
    agents, 
    loading: agentsLoading, 
    error: agentsError, 
    createAgent 
  } = useAgents(currentWorkspaceId || "")
  
  const { 
    roles, 
    loading: rolesLoading, 
    error: rolesError, 
    createRole 
  } = useRoles(currentWorkspaceId || "")
  
  const { 
    mcpServers, 
    loading: serversLoading, 
    error: serversError, 
    createMCPServer 
  } = useMcpServers(currentWorkspaceId || "")

  // Memoize workspace data to prevent unnecessary re-renders
  const workspaceData = React.useMemo(() => ({
    agents: isWorkspacePage ? agents : [],
    roles: isWorkspacePage ? roles : [],
    mcpServers: isWorkspacePage ? mcpServers : [],
    loading: {
      agents: agentsLoading,
      roles: rolesLoading,
      servers: serversLoading,
    },
    errors: {
      agents: agentsError?.message || null,
      roles: rolesError?.message || null,
      servers: serversError?.message || null,
    }
  }), [
    isWorkspacePage, 
    agents, roles, mcpServers,
    agentsLoading, rolesLoading, serversLoading,
    agentsError, rolesError, serversError
  ])

  // Memoize creation functions to prevent unnecessary re-renders
  const workspaceActions = React.useMemo(() => ({
    createAgent: isWorkspacePage ? async (name: string, description?: string) => {
      await createAgent(name);
      console.log("createAgent called with name:", name, "description:", description);
    } : async () => {},
    createRole: isWorkspacePage ? async (name: string, description?: string) => {
      await createRole(name, description);
    } : async () => {},
    createMCPServer: isWorkspacePage ? async (name: string, url: string) => {
      await createMCPServer(name, url);
    } : async () => {},
  }), [isWorkspacePage, createAgent, createRole, createMCPServer])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {isWorkspacePage ? (
          <WorkspaceContent 
            workspaceId={currentWorkspaceId!} 
            workspaceName={workspaceName}
            data={workspaceData}
            actions={workspaceActions}
          />
        ) : (
          <>
            <NavMain items={data.navMain} />
            <NavProjects projects={data.projects} />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
