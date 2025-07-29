"use client";

import { useQuery, useMutation, useLazyQuery, gql } from "@apollo/client";

export interface McpTool {
	id: string;
	name: string;
	description?: string;
}

export interface McpResource {
	id: string;
	name: string;
	description?: string;
}

interface McpServerResponse {
	connectionStatus: 'connected' | 'error';
	tools: Array<{
		name: string;
		description: string;
		inputSchema?: unknown;
	}>;
	resources: Array<{
		uri: string;
		name: string;
		description: string;
		mimeType: string;
	}>;
	resourceTemplates: Array<{
		uri: string;
		name: string;
		description: string;
		mimeType: string;
	}>;
	metadata?: {
		error?: string;
	};
}

export interface McpServer {
	id: string;
	name: string;
	url: string;
	tools: McpTool[];
	workspaceId: string;
}

export interface McpServerContent {
	tools: McpTool[];
	resources: McpResource[];
}

const GET_MCP_SERVERS = gql`
	query GetMCPServers($workspace_id: String!) {
		model(path: $workspace_id) {
			path
			label
			mcp_servers: features(category: "application") {
				category
				model {
					path
					label
					description
					url: string_value(path: "url")
				}
			}
		}
	}
`;

const CREATE_MCP_SERVER = gql`
	mutation CreateMCPServer($workspace_id: String!, $label: String!, $url: String!) {
		at(path: $workspace_id) {
			use_feature(feature: "mcp_server") {
				model {
					path
				}
				set_label(label: $label) {
					done
				}
				url: at(submodel: "url") {
					set_string_value(value: $url) {
						done
					}
				}
			}
		}
	}
`;

const GET_MCP_SERVER_CONTENT = gql`
	query GetMCPServer($mcp_server_path: String!) {
		model(path: $mcp_server_path) {
			tools: at(submodel: "tools") {
				submodels {
					reference {
						path
						label
						description
					}
				}
			}
			resources: at(submodel: "resources") {
				submodels {
					reference {
						path
						label
						description
					}
				}
			}
		}
	}
`;

const ADD_TOOL_TO_MCP_SERVER = gql`
	mutation AddToolToMCPServer($mcp_server_path: String!, $tool_name: String!, $tool_description: String) {
		at(path: $mcp_server_path) {
			at(submodel: "tools") {
				create_submodel_from_prototype(as_reference: true, label: $tool_name, instantiate: true, prototype: "mcp_tool") {
					model {
						path
					}

					set_label(label: $tool_name) {
						done
					}
					set_description(description: $tool_description) {
						done
					}
				}
			}
		}
	}
`;

const ADD_RESOURCE_TO_MCP_SERVER = gql`
	mutation AddResourceToMCPServer($mcp_server_path: String!, $resource_name: String!, $resource_description: String) {
		at(path: $mcp_server_path) {
			at(submodel: "resources") {
				create_submodel_from_prototype(as_reference: true, label: $resource_name, instantiate: true, prototype: "mcp_resource") {
					model {
						path
					}

					set_label(label: $resource_name) {
						done
					}
					set_description(description: $resource_description) {
						done
					}
				}
			}
		}
	}
`;

export function useMcpServers(workspaceId: string) {
	const { data, loading, error, refetch } = useQuery<{
		model: {
			path: string;
			label: string;
			mcp_servers: {
				category: string;
				model: {
					path: string;
					label: string;
					description: string;
					url: string;
				};
			}[];
		};
	}>(GET_MCP_SERVERS, {
		variables: { workspace_id: workspaceId },
		skip: !workspaceId,
	});

	const [createMcpServerMutation] = useMutation<{
		at: {
			use_feature: {
				model: { path: string };
				set_label: { done: boolean };
				url: {
					set_string_value: { done: boolean };
				};
			};
		};
	}>(CREATE_MCP_SERVER);

	const [getMcpServerContentQuery] = useLazyQuery<{
		model: {
			tools: {
				submodels: {
					reference: {
						path: string;
						label: string;
						description: string;
					};
				}[];
			};
			resources: {
				submodels: {
					reference: {
						path: string;
						label: string;
						description: string;
					};
				}[];
			};
		};
	}>(GET_MCP_SERVER_CONTENT);

	const [addToolMutation] = useMutation<{
		at: {
			at: {
				create_submodel_from_prototype: {
					model: {
						path: string;
						set_label: { done: boolean };
						set_description: { done: boolean };
					};
				};
			};
		};
	}>(ADD_TOOL_TO_MCP_SERVER);

	const [addResourceMutation] = useMutation<{
		at: {
			at: {
				create_submodel_from_prototype: {
					model: {
						path: string;
						set_label: { done: boolean };
						set_description: { done: boolean };
					};
				};
			};
		};
	}>(ADD_RESOURCE_TO_MCP_SERVER);

	const mcpServers: McpServer[] =
		data?.model?.mcp_servers?.map((server) => ({
			id: server.model?.path || "",
			name: server.model?.label || "Unnamed MCP Server",
			url: server.model?.url || "",
			description: server.model?.description || undefined,
			tools: [], // TODO: Get tools from submodel
			workspaceId: workspaceId,
		})) || [];

	const createMcpServer = async (name: string, url: string) => {
		if (!workspaceId) {
			throw new Error("Workspace ID is required");
		}

		const { data } = await createMcpServerMutation({
			variables: {
				workspace_id: workspaceId,
				label: name,
				url: url,
			},
		});

		// Refresh the data to show the new MCP server
		if (data?.at?.use_feature?.model?.path) {
			await refetch();
		}

		return data?.at?.use_feature?.model;
	};

	const createMCPServer = async (name: string, url: string) => {
		return createMcpServer(name, url);
	};

	const getMcpServerContent = async (serverPath: string): Promise<McpServerContent> => {
		if (!workspaceId) {
			throw new Error("Workspace ID is required");
		}
		if (!serverPath) {
			throw new Error("Server path is required");
		}

		const { data } = await getMcpServerContentQuery({
			variables: { mcp_server_path: serverPath },
			fetchPolicy: "network-only",
		});

		const tools: McpTool[] =
			data?.model?.tools?.submodels?.map((item) => ({
				id: item.reference.path,
				name: item.reference.label,
				description: item.reference.description,
			})) || [];

		const resources: McpResource[] =
			data?.model?.resources?.submodels?.map((item) => ({
				id: item.reference.path,
				name: item.reference.label,
				description: item.reference.description,
			})) || [];

		return { tools, resources };
	};

	const addToolToServer = async (serverPath: string, toolName: string, toolDescription?: string) => {
		if (!workspaceId) {
			throw new Error("Workspace ID is required");
		}

		const { data } = await addToolMutation({
			variables: {
				mcp_server_path: serverPath,
				tool_name: toolName,
				tool_description: toolDescription || "",
			},
		});
		return data?.at?.at?.create_submodel_from_prototype?.model?.set_label?.done;
	};

	const addResourceToServer = async (serverPath: string, resourceName: string, resourceDescription?: string) => {
		if (!workspaceId) {
			throw new Error("Workspace ID is required");
		}

		const { data } = await addResourceMutation({
			variables: {
				mcp_server_path: serverPath,
				resource_name: resourceName,
				resource_description: resourceDescription || "",
			},
		});
		return data?.at?.at?.create_submodel_from_prototype?.model?.set_label?.done;
	};

	// Function to get tools/resources from actual MCP server
	const fetchMcpServerCapabilities = async (serverUrl: string) => {
		try {
			// Call the API route to connect to MCP server and get capabilities
			const response = await fetch(`/api/mcp-servers/connect?url=${encodeURIComponent(serverUrl)}`);

			if (!response.ok) {
				throw new Error(`Failed to connect to MCP server: ${response.statusText}`);
			}

			const serverData: McpServerResponse = await response.json();

			if (serverData.connectionStatus === "error") {
				throw new Error(serverData.metadata?.error || "Failed to connect to MCP server");
			}

			return {
				tools: serverData.tools.map((tool) => ({
					name: tool.name,
					description: tool.description || "",
				})),
				resources: serverData.resources.map((resource) => ({
					name: resource.name,
					description: resource.description || "",
				})),
				resourceTemplates:
					serverData.resourceTemplates?.map((template) => ({
						name: template.name,
						description: template.description || "",
					})) || [],
			};
		} catch (error) {
			console.error("Error fetching MCP server capabilities:", error);
			throw error;
		}
	};

	const importMcpServer = async (serverPath: string, serverUrl: string, onProgress?: (type: "tool" | "resource" | "template", name: string, index: number, total: number) => void) => {
		if (!workspaceId) {
			throw new Error("Workspace ID is required");
		}

		// Fetch capabilities from the MCP server
		const capabilities = await fetchMcpServerCapabilities(serverUrl);

		const totalItems = capabilities.tools.length + capabilities.resources.length + (capabilities.resourceTemplates?.length || 0);
		let currentIndex = 0;

		// Import tools
		for (const tool of capabilities.tools) {
			await addToolToServer(serverPath, tool.name, tool.description);
			currentIndex++;
			onProgress?.("tool", tool.name, currentIndex, totalItems);

			// Small delay between imports
			await new Promise((resolve) => setTimeout(resolve, 200));
		}

		// Import resources
		for (const resource of capabilities.resources) {
			await addResourceToServer(serverPath, resource.name, resource.description);
			currentIndex++;
			onProgress?.("resource", resource.name, currentIndex, totalItems);

			// Small delay between imports
			await new Promise((resolve) => setTimeout(resolve, 200));
		}

		// Import resource templates
		for (const template of capabilities.resourceTemplates || []) {
		// 	await addResourceToServer(serverPath, template.name, template.description);
			currentIndex++;
			onProgress?.("template", template.name, currentIndex, totalItems);

		// 	// Small delay between imports
			await new Promise((resolve) => setTimeout(resolve, 200));
		}

		return {
			success: true,
			toolsImported: capabilities.tools.length,
			resourcesImported: capabilities.resources.length,
			resourceTemplatesImported: capabilities.resourceTemplates?.length || 0,
		};
	};

	return {
		mcpServers,
		loading,
		error,
		refetch,
		createMcpServer,
		createMCPServer,
		getMcpServerContent,
		addToolToServer,
		addResourceToServer,
		importMcpServer,
	};
}
