"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useAgents } from "@/hooks/use-agents";
import { useRoles } from "@/hooks/use-roles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Users, Settings, Play, Pause, Copy, RefreshCw, Eye, EyeOff, Server, Shield } from "lucide-react";
import Link from "next/link";
import { McpPermissions } from "@/components/mcp-permissions";
// import { toast } from "sonner" // Commented out due to dependency issues

export default function AgentDetailPage() {
	const params = useParams();
	const workspaceId = params.workspaceId as string;
	const agentId = params.agentId as string;
	const { workspaces, loading: workspacesLoading } = useWorkspaces();
	const { agents, loading: agentsLoading, error, refreshAuthenticationToken, assignRoleToAgent, unassignRoleFromAgent, fetchAgents, getAgentRoles, updateAgentStatus } = useAgents(workspaceId);
	const { roles, loading: rolesLoading, fetchRoles } = useRoles(workspaceId);

	const workspace = workspaces.find((w) => w.path === workspaceId);
	const agent = agents.find((a) => a.id === agentId);

	// Authentication state
	const [showToken, setShowToken] = React.useState(false);
	const [isRegenerating, setIsRegenerating] = React.useState(false);
	const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

	// Role assignment state
	const [isAssigningRole, setIsAssigningRole] = React.useState(false);
	const [agentRoles, setAgentRoles] = React.useState<Array<{id: string; name: string; description?: string}>>([]);
	
	// Agent status confirmation
	const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);

	// Get the authentication token from the agent data
	const authToken = agent?.authenticationToken || "";

	// Generate Virtual MCP Server URL
	const virtualMcpUrl = `https://${agentId}.${workspaceId}.mcpresso.dev`;

	// Fetch agent roles when component mounts or agentId changes
	React.useEffect(() => {
		const fetchAgentRoles = async () => {
			if (agentId) {
				try {
					const roles = await getAgentRoles(agentId);
					setAgentRoles(roles);
				} catch (error) {
					console.error("Failed to fetch agent roles:", error);
				}
			}
		};

		fetchAgentRoles();
	}, [agentId]); // eslint-disable-line react-hooks/exhaustive-deps

	const showMessage = (type: "success" | "error", text: string) => {
		setMessage({ type, text });
		setTimeout(() => setMessage(null), 3000);
	};

	const copyToClipboard = async (text: string, label: string) => {
		try {
			await navigator.clipboard.writeText(text);
			showMessage("success", `${label} copied to clipboard`);
		} catch {
			showMessage("error", `Failed to copy ${label}`);
		}
	};

	const handleRefreshToken = async () => {
		if (!agent) return;

		setIsRegenerating(true);
		try {
			await refreshAuthenticationToken(agent.id);
			showMessage("success", "Authentication token regenerated");
		} catch {
			showMessage("error", "Failed to regenerate token");
		} finally {
			setIsRegenerating(false);
		}
	};

	const handleAssignRole = async (event: React.MouseEvent, roleId: string) => {
		event.preventDefault();
		event.stopPropagation();
		
		if (!agent) return;

		setIsAssigningRole(true);
		try {
			console.log("Assigning role", roleId, "to agent", agent.id);
			const result = await assignRoleToAgent(agent.id, roleId);
			console.log("Assignment result:", result);
			
			// Refresh both hooks to keep data in sync
			await Promise.all([fetchAgents(), fetchRoles()]);
			
			// Small delay to ensure backend has processed the assignment
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// Refresh agent roles to update the UI
			console.log("Fetching updated roles for agent:", agent.id);
			const updatedRoles = await getAgentRoles(agent.id);
			console.log("Updated roles:", updatedRoles);
			setAgentRoles(updatedRoles);
			
			showMessage("success", "Role assigned successfully");
		} catch (err) {
			console.error("Failed to assign role:", err);
			showMessage("error", "Failed to assign role");
		} finally {
			setIsAssigningRole(false);
		}
	};

	const handleUnassignRole = async (event: React.MouseEvent, roleId: string) => {
		event.preventDefault();
		event.stopPropagation();
		
		if (!agent) return;

		try {
			await unassignRoleFromAgent(agent.id, roleId);
			// Refresh both hooks to keep data in sync
			await Promise.all([fetchAgents(), fetchRoles()]);
			// Refresh agent roles to update the UI
			const updatedRoles = await getAgentRoles(agent.id);
			setAgentRoles(updatedRoles);
			showMessage("success", "Role unassigned successfully");
		} catch {
			showMessage("error", "Failed to unassign role");
		}
	};

	const handleToggleAgentStatus = () => {
		if (!agent) return;
		setConfirmDialogOpen(true);
	};

	const confirmToggleStatus = async () => {
		if (!agent) return;
		
		const currentStopped = agent.stopped || false;
		
		try {
			await updateAgentStatus(agent.id, !currentStopped);
			showMessage("success", currentStopped ? "Agent started successfully" : "Agent stopped successfully");
			setConfirmDialogOpen(false);
		} catch {
			showMessage("error", "Failed to update agent status");
		}
	};

	// Get roles that are available for assignment (not already assigned)
	const availableRoles = roles.filter((role) => !agentRoles.some((assignedRole) => assignedRole.id === role.id));

	// Get currently assigned roles from state
	const assignedRoles = agentRoles;

	if (workspacesLoading || agentsLoading || rolesLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
					<p className="text-lg font-medium text-muted-foreground">Loading agent...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<Users className="h-16 w-16 text-destructive mx-auto mb-4" />
					<h2 className="text-2xl font-semibold mb-2">Error loading agent</h2>
					<p className="text-muted-foreground mb-6">{error?.message || "An error occurred"}</p>
					<Link href={`/workspaces/${workspaceId}/agents`}>
						<Button>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Agents
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	if (!agent) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
					<h2 className="text-2xl font-semibold mb-2">Agent not found</h2>
					<p className="text-muted-foreground mb-6">The agent you&apos;re looking for doesn&apos;t exist.</p>
					<Link href={`/workspaces/${workspaceId}/agents`}>
						<Button>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Agents
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link href={`/workspaces/${workspaceId}/agents`}>
						<Button variant="ghost" size="sm" className="h-10 w-10 p-0">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<div className="flex items-center gap-3 mb-1">
							<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
								<Users className="h-5 w-5 text-white" />
							</div>
							<div>
								<h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
								<div className="flex items-center gap-2 mt-1">
									<Badge variant="secondary" className="text-xs">
										Agent
									</Badge>
									<Badge variant={(agent.stopped || false) ? "destructive" : "default"} className="text-xs">
										{(agent.stopped || false) ? "Stopped" : "Running"}
									</Badge>
									{workspace && <span className="text-sm text-muted-foreground">in {workspace.name}</span>}
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<Button 
						variant="outline" 
						size="sm"
						onClick={handleToggleAgentStatus}
					>
						{agent.stopped ? (
							<>
								<Play className="h-4 w-4 mr-2 text-green-600" />
								Start
							</>
						) : (
							<>
								<Pause className="h-4 w-4 mr-2 text-orange-600" />
								Stop
							</>
						)}
					</Button>
					<Button variant="outline" size="sm">
						<Settings className="h-4 w-4 mr-2" />
						Settings
					</Button>
					<Button size="sm">
						<Play className="h-4 w-4 mr-2" />
						Start Task
					</Button>
				</div>
			</div>

			{/* Agent Details */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Agent Information</CardTitle>
						<CardDescription>Basic details about this agent</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<label className="text-sm font-medium text-muted-foreground">Name</label>
							<p className="text-sm">{agent.name}</p>
						</div>
						{agent.description && (
							<div>
								<label className="text-sm font-medium text-muted-foreground">Description</label>
								<p className="text-sm">{agent.description}</p>
							</div>
						)}
						<div>
							<label className="text-sm font-medium text-muted-foreground">Status</label>
							<div className="flex items-center gap-2 mt-1">
								<Badge variant="outline">Active</Badge>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Recent Activity</CardTitle>
						<CardDescription>Latest tasks and actions</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">No recent activity to display.</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Quick Stats</CardTitle>
						<CardDescription>Performance metrics</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex justify-between text-sm">
							<span>Tasks Completed</span>
							<span className="font-medium">127</span>
						</div>
						<div className="flex justify-between text-sm">
							<span>Success Rate</span>
							<span className="font-medium">94%</span>
						</div>
						<div className="flex justify-between text-sm">
							<span>Avg Response Time</span>
							<span className="font-medium">1.2s</span>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Tabs Section */}
			<Tabs defaultValue="permissions" className="w-full">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="permissions">Permissions</TabsTrigger>
					<TabsTrigger value="roles">Roles</TabsTrigger>
					<TabsTrigger value="authentication">Authentication</TabsTrigger>
				</TabsList>

				<TabsContent value="permissions" className="space-y-4">
				
					
					{/* MCP Server Permissions */}
					<McpPermissions 
						workspaceId={workspaceId}
						agentId={agentId}
						agentName={agent?.name}
					/>
				</TabsContent>

				<TabsContent value="roles" className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						{/* Assigned Roles */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center justify-between">
									<span>Assigned Roles</span>
									<Badge variant="secondary">{assignedRoles.length}</Badge>
								</CardTitle>
								<CardDescription>Active roles for this agent</CardDescription>
							</CardHeader>
							<CardContent>
								{assignedRoles.length > 0 ? (
									<div className="space-y-2 max-h-96 overflow-y-auto">
										{assignedRoles.map((role) => (
											<div key={role.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
												<div className="space-y-1 flex-1 min-w-0">
													<p className="text-sm font-medium truncate">{role.name}</p>
													{role.description && <p className="text-xs text-muted-foreground line-clamp-2">{role.description}</p>}
												</div>
												<Button type="button" variant="ghost" size="sm" onClick={(e) => handleUnassignRole(e, role.id)} className="text-destructive hover:text-destructive flex-shrink-0 ml-2">
													Remove
												</Button>
											</div>
										))}
									</div>
								) : (
									<div className="text-center py-8">
										<Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
										<p className="text-sm text-muted-foreground">No roles assigned yet</p>
										<p className="text-xs text-muted-foreground mt-1">Assign roles to grant this agent specific permissions</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Available Roles */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center justify-between">
									<span>Available Roles</span>
									<Badge variant="outline">{availableRoles.length}</Badge>
								</CardTitle>
								<CardDescription>Roles that can be assigned to this agent</CardDescription>
							</CardHeader>
							<CardContent>
								{availableRoles.length > 0 ? (
									<div className="space-y-2 max-h-96 overflow-y-auto">
										{availableRoles.map((role) => (
											<div key={role.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
												<div className="space-y-1 flex-1 min-w-0">
													<p className="text-sm font-medium truncate">{role.name}</p>
													{role.description && <p className="text-xs text-muted-foreground line-clamp-2">{role.description}</p>}
												</div>
												<Button type="button" size="sm" onClick={(e) => handleAssignRole(e, role.id)} disabled={isAssigningRole} className="flex-shrink-0 ml-2">
													{isAssigningRole ? "Assigning..." : "Assign"}
												</Button>
											</div>
										))}
									</div>
								) : (
									<div className="text-center py-8">
										<Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
										<p className="text-sm text-muted-foreground">No additional roles available</p>
										<p className="text-xs text-muted-foreground mt-1">All available roles are already assigned</p>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="authentication" className="space-y-4">
					{message && <div className={`p-3 rounded-md text-sm ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>{message.text}</div>}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Server className="h-5 w-5" />
								Virtual MCP Server
							</CardTitle>
							<CardDescription>Authentication credentials for this agent&apos;s virtual MCP server endpoint</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="space-y-2">
								<Label htmlFor="mcp-url">Server URL</Label>
								<div className="flex gap-2">
									<Input id="mcp-url" value={virtualMcpUrl} readOnly className="font-mono text-sm" />
									<Button type="button" variant="outline" size="sm" onClick={() => copyToClipboard(virtualMcpUrl, "Server URL")}>
										<Copy className="h-4 w-4" />
									</Button>
								</div>
								<p className="text-xs text-muted-foreground">This URL provides access to this agent&apos;s capabilities via the MCP protocol</p>
							</div>

							{authToken ? (
								<>
									<div className="space-y-2">
										<Label htmlFor="auth-token">Authentication Token</Label>
										<div className="flex gap-2">
											<div className="relative flex-1">
												<Input id="auth-token" type={showToken ? "text" : "password"} value={authToken} readOnly className="font-mono text-sm pr-10" />
												<Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowToken(!showToken)}>
													{showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
												</Button>
											</div>
											<Button type="button" variant="outline" size="sm" onClick={() => copyToClipboard(authToken, "Authentication token")}>
												<Copy className="h-4 w-4" />
											</Button>
										</div>
										<p className="text-xs text-muted-foreground">Keep this token secure. It provides full access to this agent&apos;s capabilities.</p>
									</div>

									<div className="pt-4 border-t">
										<Button type="button" variant="outline" onClick={handleRefreshToken} disabled={isRegenerating} className="w-full">
											{isRegenerating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
											{isRegenerating ? "Regenerating..." : "Regenerate Token"}
										</Button>
										<p className="text-xs text-muted-foreground mt-2 text-center">This will invalidate the current token and generate a new one</p>
									</div>
								</>
							) : (
								<div className="text-center py-8">
									<div className="space-y-4">
										<div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
											<Server className="h-8 w-8 text-muted-foreground" />
										</div>
										<div className="space-y-2">
											<h3 className="text-lg font-medium">No Authentication Token</h3>
											<p className="text-sm text-muted-foreground max-w-sm mx-auto">Generate an authentication token to enable MCP server access for this agent.</p>
										</div>
										<Button type="button" onClick={handleRefreshToken} disabled={isRegenerating} className="mt-4">
											{isRegenerating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
											{isRegenerating ? "Generating..." : "Generate Token"}
										</Button>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Confirmation Dialog */}
			<Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>
							{agent?.stopped ? "Start Agent" : "Stop Agent"}
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to {agent?.stopped ? "start" : "stop"} the agent &ldquo;{agent?.name}&rdquo;?
							{!agent?.stopped && " This will halt all ongoing tasks."}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
							Cancel
						</Button>
						<Button 
							onClick={confirmToggleStatus}
							variant={agent?.stopped ? "default" : "destructive"}
						>
							{agent?.stopped ? "Start Agent" : "Stop Agent"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
