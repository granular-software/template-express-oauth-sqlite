"use client";

import { useQuery, useMutation, useLazyQuery, gql } from "@apollo/client";

export interface Role {
	id: string;
	name: string;
	description?: string;
	agents: string[];
	workspaceId: string;
}

const GET_ROLES = gql`
	query GetRoles($workspace_id: String!) {
		model(path: $workspace_id) {
			path
			label
			roles: features(category: "role") {
				category
				model {
					path
					label
					description
				}
			}
		}
	}
`;

const CREATE_ROLE = gql`
	mutation CreateRole($workspace_id: String!, $label: String!) {
		at(path: $workspace_id) {
			use_feature(feature: "role") {
				model {
					path
				}
				set_label(label: $label) {
					done
				}
			}
		}
	}
`;

const ASSIGN_ROLE_TO_AGENT = gql`
	mutation AssignRole($agent_id: String!, $role_id: String!) {
		at(path: $agent_id) {
			add_superclass(superclass: $role_id) {
				done
			}
		}
	}
`;

const GET_ROLE_AGENTS = gql`
	query GetRoleAgents($role_id: String!) {
		model(path: $role_id) {
			path
			label
			direct_subclasses {
				path
				label
				direct_prototypes {
					path
				}
			}
		}
	}
`;

export function useRoles(workspaceId: string) {
	const { data, loading, error, refetch } = useQuery<{
		model: {
			path: string;
			label: string;
			roles: {
				category: string;
				model: {
					path: string;
					label: string;
					description: string;
				};
			}[];
		};
	}>(GET_ROLES, {
		variables: { workspace_id: workspaceId },
		skip: !workspaceId,
	});

	const [createRoleMutation] = useMutation<{
		at: {
			use_feature: {
				model: { path: string };
				set_label: { done: boolean };
			};
		};
	}>(CREATE_ROLE);
	const [assignRoleMutation] = useMutation<{
		at: {
			add_superclass: { done: boolean };
		};
	}>(ASSIGN_ROLE_TO_AGENT);

	const [getRoleAgentsQuery] = useLazyQuery<{
		model: {
			path: string;
			label: string;
			direct_subclasses: {
				path: string;
				label: string;
				direct_prototypes: { path: string }[];
			}[];
		};
	}>(GET_ROLE_AGENTS);

	const roles: Role[] =
		data?.model?.roles?.map((role) => ({
			id: role.model?.path || "",
			name: role.model?.label || "Unnamed Role",
			description: role.model?.description || undefined,
			agents: [], // TODO: Get actual agents assigned to this role
			workspaceId: workspaceId,
		})) || [];

	const createRole = async (name: string, description?: string) => {
		const { data } = await createRoleMutation({
			variables: {
				workspace_id: workspaceId,
				label: name,
			},
		});

		console.log("createRole called with name:", name, "description:", description);

		// Refresh the data to show the new role
		if (data?.at?.use_feature?.model?.path) {
			await refetch();
		}

		return data?.at?.use_feature?.model;
	};

	const assignAgentToRole = async (agentId: string, roleId: string) => {
		const { data } = await assignRoleMutation({
			variables: {
				agent_id: agentId,
				role_id: roleId,
			},
		});
		return data?.at?.add_superclass?.done;
	};

	const fetchRoles = async () => {
		return refetch();
	};

	const getRoleAgents = async (roleId: string) => {
		const { data } = await getRoleAgentsQuery({
			variables: { role_id: roleId },
			fetchPolicy: 'network-only' // Force fresh data from server
		});
		
		// Filter only agents (direct_subclasses that have "agent" direct_prototype)
		const agents = data?.model?.direct_subclasses?.filter((subclass: {
			path: string;
			label: string;
			direct_prototypes: { path: string }[];
		}) => 
			subclass.direct_prototypes.some((prototype: { path: string }) => prototype.path === "agent")
		).map((agent: {
			path: string;
			label: string;
			direct_prototypes: { path: string }[];
		}) => ({
			id: agent.path,
			name: agent.label,
			type: "agent" as const,
			description: undefined,
			roles: [],
			workspaceId: workspaceId,
			authenticationToken: undefined,
			assignedRoles: []
		})) || [];
		
		return agents;
	};

	return {
		roles,
		loading,
		error,
		refetch,
		createRole,
		assignAgentToRole,
		fetchRoles,
		getRoleAgents,
	};
}
