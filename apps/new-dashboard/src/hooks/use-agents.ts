"use client";

import { useQuery, useMutation, useLazyQuery, gql } from "@apollo/client";

export interface Agent {
	id: string;
	name: string;
  type: string;
	description?: string;
  roles: string[];
	workspaceId: string;
	authenticationToken?: string;
	stopped?: boolean;
  assignedRoles?: Array<{
	id: string;
	name: string;
	description?: string;
  }>;
}

const GET_AGENTS = gql`
  query GetAgents($workspace_id: String!) {
    model(path: $workspace_id) {
      path
      label
      agents: features(category: "agent") {
        category
        model {
          path
          label
          description
          stopped: boolean_value(path: "stopped")
          authentication_token: at(submodel: "authentication_token") {
            string_value
          }
        }
      }
    }
  }
`;

const CREATE_AGENT = gql`
  mutation CreateAgent($workspace_id: String!, $label: String!) {
    at(path: $workspace_id) {
      use_feature(feature: "agent") {
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

const SET_AGENT_TOKEN = gql`
  mutation SetAgentToken($agent_path: String!, $new_token: String!) {
    at(path: $agent_path) {
      token: at(submodel: "authentication_token") {
        set_string_value(value: $new_token) {
          done
        }
      }
    }
  }
`;

const UPDATE_AGENT = gql`
  mutation UpdateAgent($agent_id: String!, $value: Boolean!) {
    at(path: $agent_id) {
      at(submodel: "stopped") {
        set_boolean_value(value: $value) {
          done
        }
      }
    }
  }
`;

const GET_AGENT_ROLES = gql`
  query GetAgentRoles($agent_id: String!) {
    agent: model(path: $agent_id) {
      path
      label
      direct_superclasses {
        path
        label
        prototypes {
          path
        }
      }
    }
  }
`;

const generateToken = (agentName: string): string => {
  const trimmedName = agentName.trim();
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomChars = '';
  for (let i = 0; i < 36; i++) {
    randomChars += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return trimmedName + "_" + randomChars;
};

export function useAgents(workspaceId: string) {
  const { data, loading, error, refetch } = useQuery<{
    model: {
      path: string;
      label: string;
      agents: {
        category: string;
        model: {
          path: string;
          label: string;
          description: string;
          stopped?: boolean;
          authentication_token?: { string_value?: string };
        };
      }[];
    };
  }>(GET_AGENTS, {
    variables: { workspace_id: workspaceId },
    skip: !workspaceId,
  });

  const [createAgentMutation] = useMutation<{
    at: {
      use_feature: {
        model: { path: string };
        set_label: { done: boolean };
      };
    };
  }>(CREATE_AGENT);
  const [assignRoleMutation] = useMutation<{
    at: {
      add_superclass: { done: boolean };
    };
  }>(ASSIGN_ROLE_TO_AGENT);
  const [setTokenMutation] = useMutation<{
    at: {
      token: {
        set_string_value: { done: boolean };
      };
    };
  }>(SET_AGENT_TOKEN);
  
  const [updateAgentMutation] = useMutation<{
    at: {
      at: {
        set_boolean_value: { done: boolean };
      };
    };
  }>(UPDATE_AGENT);

  const [getAgentRolesQuery] = useLazyQuery<{
    agent: {
      path: string;
      label: string;
      direct_superclasses: {
        path: string;
        label: string;
        prototypes: { path: string }[];
      }[];
    };
  }>(GET_AGENT_ROLES);

  const agents: Agent[] = data?.model?.agents?.map((agent) => ({
    id: agent.model?.path || "",
    name: agent.model?.label || "Unnamed Agent",
    type: "agent", // Default type
    description: agent.model?.description || undefined,
    roles: [], // TODO: Get actual roles
    workspaceId: workspaceId,
    authenticationToken: agent.model?.authentication_token?.string_value || undefined,
    stopped: agent.model?.stopped || false,
    assignedRoles: [], // TODO: Get actual assigned roles
  })) || [];

  const createAgent = async (name: string) => {
    const { data } = await createAgentMutation({
      variables: { 
        workspace_id: workspaceId,
        label: name 
      }
    });
    
    // Refresh the data to show the new agent
    if (data?.at?.use_feature?.model?.path) {
      await refetch();
    }
    
    return data?.at?.use_feature?.model;
  };

      const assignRole = async (agentId: string, roleId: string) => {
    console.log("assignRole called with:", { agentId, roleId });
    const { data } = await assignRoleMutation({
      variables: { 
        agent_id: agentId, 
        role_id: roleId 
      }
    });

    console.log("assignRole mutation result:", data);

    return data?.at?.add_superclass?.done;
  };

	const refreshAuthenticationToken = async (agentId: string) => {
    // Find the agent to get its name
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Generate new token
    const newToken = generateToken(agent.name);

    // Set the token using the mutation
    const { data } = await setTokenMutation({
      variables: { 
        agent_path: agentId, 
        new_token: newToken 
      }
    });

    // Refresh the agent data to display the updated token
    if (data?.at?.token?.set_string_value?.done) {
      await refetch();
    }

    return {
      token: newToken,
      success: data?.at?.token?.set_string_value?.done
    };
  };

  const assignRoleToAgent = async (agentId: string, roleId: string) => {
    return assignRole(agentId, roleId);
  };

  const unassignRoleFromAgent = async (agentId: string, roleId: string) => {
    // TODO: Implement role unassignment logic
    throw new Error("Role unassignment not implemented yet (TODO)" + agentId + " " + roleId);
  };

  const fetchAgents = async () => {
    return refetch();
  };

  const getAgentRoles = async (agentId: string) => {
    console.log("getAgentRoles called with agentId:", agentId);
    const { data } = await getAgentRolesQuery({
      variables: { agent_id: agentId },
      fetchPolicy: 'network-only' // Force fresh data from server
    });
    
    console.log("getAgentRoles raw data:", data);
    
    // Filter only roles (direct_superclasses that have "role" prototype)
    const roles = data?.agent?.direct_superclasses?.filter(superclass => 
      superclass.prototypes.some(prototype => prototype.path === "role")
    ).map(role => ({
      id: role.path,
      name: role.label,
      description: undefined,
      agents: [],
      workspaceId: workspaceId
    })) || [];
    
    console.log("getAgentRoles filtered roles:", roles);
    return roles;
  };

  const updateAgentStatus = async (agentId: string, stopped: boolean) => {
    const { data } = await updateAgentMutation({
      variables: { 
        agent_id: agentId,
        value: stopped 
      }
    });
    
    // Refresh the data to show the updated status
    if (data?.at?.at?.set_boolean_value?.done) {
      await refetch();
    }

    return data?.at?.at?.set_boolean_value?.done;
  };

	return {
		agents,
		loading,
		error,
    refetch,
		createAgent,
    assignRole,
		refreshAuthenticationToken,
		assignRoleToAgent,
		unassignRoleFromAgent,
    fetchAgents,
    getAgentRoles,
    updateAgentStatus
	};
}