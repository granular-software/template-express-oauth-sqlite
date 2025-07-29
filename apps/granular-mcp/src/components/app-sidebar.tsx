"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Server,
  Users,
  Shield,
} from "lucide-react"

import { TeamSwitcher } from "@/components/team-switcher"
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useWorkspaces } from "@/hooks/use-workspaces"
import { useWorkspaceMcpServers } from "@/hooks/use-workspace-mcp-servers"
import { useAgents } from "@/hooks/use-agents"
import { useRoles } from "@/hooks/use-roles"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { CreateWorkspaceForm } from "@/components/create-workspace-form"
import { CreateMcpServerForm } from "@/components/create-mcp-server-form"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// helper
function getWorkspaceId(pathname:string){
  const m=pathname.match(/^\/workspaces\/([^/]+)/);return m?decodeURIComponent(m[1]):null;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname=usePathname();
  const { workspaces, createWorkspace }=useWorkspaces();
  const currentId=getWorkspaceId(pathname);

  const { attachedServers, attachMcpServer, loading:serversLoading }=useWorkspaceMcpServers(currentId??"");
  const { agents, createAgent }=useAgents(currentId??"");
  const { roles, createRole }=useRoles(currentId??"");

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* Workspace switcher using TeamSwitcher component api */}
        <TeamSwitcher teams={workspaces.map(w=>({name:w.label||"Workspace", logo:GalleryVerticalEnd, plan:""}))} />
      </SidebarHeader>
      <SidebarContent className="space-y-6">
        {/* MCP Servers section */}
        <section>
          <h4 className="px-2 mb-1 text-xs font-semibold uppercase text-muted-foreground">MCP Servers</h4>
          <div className="space-y-1">
            {attachedServers.map(s=>(
              <Link key={s.path} href={`/mcp-servers/${encodeURIComponent(s.path)}`} className="flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-accent">
                <Server className="h-3 w-3"/>{s.label||"Server"}
              </Link>
            ))}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2"><Plus className="h-3 w-3"/>New server</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <CreateMcpServerForm onCreateMcpServer={attachMcpServer as any}/>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Agents section */}
        <section>
          <h4 className="px-2 mb-1 text-xs font-semibold uppercase text-muted-foreground">Agents</h4>
          <div className="space-y-1">
            {agents.map(a=>(
              <Link key={a.id} href={`/workspaces/${currentId}/agents/${a.id}`} className="flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-accent"><Users className="h-3 w-3"/>{a.name}</Link>
            ))}
            <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-2"><Link href={`/workspaces/${currentId}#create-agent`}><Plus className="h-3 w-3"/>New agent</Link></Button>
          </div>
        </section>

        {/* Roles section */}
        <section>
          <h4 className="px-2 mb-1 text-xs font-semibold uppercase text-muted-foreground">Roles</h4>
          <div className="space-y-1">
            {roles.map(r=>(
              <Link key={r.id} href={`/workspaces/${currentId}/roles/${r.id}`} className="flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-accent"><Shield className="h-3 w-3"/>{r.name}</Link>
            ))}
            <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-2"><Link href={`/workspaces/${currentId}#create-role`}><Plus className="h-3 w-3"/>New role</Link></Button>
          </div>
        </section>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
