import { gql } from '@apollo/client';

// Fragments for reusable parts
export const MODEL_FRAGMENT = gql`
  fragment ModelFragment on Model {
    path
    label
    description
  }
`;

export const WORKSPACE_FRAGMENT = gql`
  fragment WorkspaceFragment on Model {
    path
    label
    description
  }
`;

export const AGENT_FRAGMENT = gql`
  fragment AgentFragment on Model {
    path
    label
    description
    at(submodel: "authentication_token") {
      string_value
    }
  }
`;

export const ROLE_FRAGMENT = gql`
  fragment RoleFragment on Model {
    path
    label
    description
  }
`;

export const MCP_SERVER_FRAGMENT = gql`
  fragment MCPServerFragment on Model {
    path
    label
    description
    at(submodel: "url") {
      string_value
    }
  }
`;

// Workspace operations
export const GET_WORKSPACES = gql`
  ${WORKSPACE_FRAGMENT}
  query GetWorkspaces {
    model(path: "workspace") {
      path
      label
      description
      instances {
        ...WorkspaceFragment
      }
    }
  }
`;

export const GET_WORKSPACE = gql`
  ${WORKSPACE_FRAGMENT}
  query GetWorkspace($path: String!) {
    model(path: $path) {
      ...WorkspaceFragment
    }
  }
`;

export const CREATE_WORKSPACE = gql`
  ${WORKSPACE_FRAGMENT}
  mutation CreateWorkspace($label: String!) {
    at(path: "workspace") {
      instantiate(label: $label) {
        model {
          ...WorkspaceFragment
        }
      }
    }
  }
`;

// Agent operations  
export const GET_AGENTS = gql`
  ${AGENT_FRAGMENT}
  query GetAgents {
    model(path: "agent") {
      path
      label
      description
      instances {
        ...AgentFragment
      }
    }
  }
`;

export const CREATE_AGENT = gql`
  ${AGENT_FRAGMENT}
  mutation CreateAgent($label: String!) {
    at(path: "agent") {
      instantiate(label: $label) {
        model {
          ...AgentFragment
        }
      }
    }
  }
`;

export const REFRESH_AGENT_TOKEN = gql`
  mutation RefreshAgentToken($agentPath: String!, $token: String!) {
    at(path: $agentPath) {
      at(submodel: "authentication_token") {
        set_string_value(value: $token) {
          model {
            string_value
          }
        }
      }
    }
  }
`;

export const ASSIGN_ROLE_TO_AGENT = gql`
  mutation AssignRoleToAgent($agentPath: String!, $roleId: String!) {
    at(path: $agentPath) {
      add_prototype(prototype: $roleId) {
        done
      }
    }
  }
`;

// Role operations
export const GET_ROLES = gql`
  ${ROLE_FRAGMENT}
  query GetRoles {
    model(path: "role") {
      path
      label
      description
      instances {
        ...RoleFragment
      }
    }
  }
`;

export const CREATE_ROLE = gql`
  ${ROLE_FRAGMENT}
  mutation CreateRole($label: String!) {
    at(path: "role") {
      instantiate(label: $label) {
        model {
          ...RoleFragment
        }
      }
    }
  }
`;

export const GET_ROLE_AGENTS = gql`
  ${MODEL_FRAGMENT}
  query GetRoleAgents($roleId: String!) {
    model(path: $roleId) {
      direct_instances {
        ...ModelFragment
      }
    }
  }
`;

// MCP Server operations
export const GET_MCP_SERVERS = gql`
  ${MCP_SERVER_FRAGMENT}
  query GetMCPServers($workspaceId: String!) {
    model(path: $workspaceId) {
      path
      label
      features(category: "application") {
        model {
          ...MCPServerFragment
        }
      }
    }
  }
`;

export const CREATE_MCP_SERVER = gql`
  ${MCP_SERVER_FRAGMENT}
  mutation CreateMCPServer($label: String!) {
    at(path: "mcp_server") {
      instantiate(label: $label) {
        model {
          ...MCPServerFragment
        }
      }
    }
  }
`;

export const SET_MCP_SERVER_URL = gql`
  mutation SetMCPServerUrl($serverPath: String!, $url: String!) {
    at(path: $serverPath) {
      at(submodel: "url") {
        set_string_value(value: $url) {
          model {
            path
          }
        }
      }
    }
  }
`;

export const GET_MCP_TOOLS = gql`
  ${MODEL_FRAGMENT}
  query GetMCPTools($serverId: String!) {
    model(path: $serverId) {
      at(submodel: "tools") {
        submodels {
          ...ModelFragment
        }
      }
    }
  }
`;

// Permission operations
export const GET_RESOURCE_PERMISSIONS = gql`
  ${MODEL_FRAGMENT}
  query GetResourcePermissions($resourceId: String!) {
    model(path: $resourceId) {
      reverse_references {
        ...ModelFragment
      }
    }
  }
`;

export const CREATE_PERMISSION = gql`
  mutation CreatePermission($targetId: String!, $feature: String!, $resourceId: String!) {
    at(path: $targetId) {
      use_feature(feature: $feature) {
        at(submodel: "of") {
          set_reference(reference: $resourceId) {
            model {
              path
              label
            }
          }
        }
      }
    }
  }
`;

export const GET_AGENT_PERMISSIONS = gql`
  ${MODEL_FRAGMENT}
  query GetAgentPermissions($agentId: String!) {
    model(path: $agentId) {
      features(category: "permission") {
        model {
          ...ModelFragment
          prototypes {
            path
            label
          }
          at(submodel: "of") {
            reference {
              path
              label
            }
          }
        }
      }
    }
  }
`; 