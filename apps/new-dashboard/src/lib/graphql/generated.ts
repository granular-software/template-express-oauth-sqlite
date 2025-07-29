import { gql } from "graphql-tag";
import * as ApolloReactCommon from "@apollo/client";
import * as ApolloReactHooks from "@apollo/client";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never;
    };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
};

export type BooleanFilter = {
  at: Scalars["String"]["input"];
  equal_to?: InputMaybe<Scalars["Boolean"]["input"]>;
  not_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  null?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type DateFilter = {
  after_date?: InputMaybe<Scalars["Float"]["input"]>;
  at: Scalars["String"]["input"];
  before_date?: InputMaybe<Scalars["Float"]["input"]>;
  newer_than_seconds?: InputMaybe<Scalars["Int"]["input"]>;
  not_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  null?: InputMaybe<Scalars["Boolean"]["input"]>;
  older_than_seconds?: InputMaybe<Scalars["Int"]["input"]>;
};

export enum ExtractionStatus {
  Ambiguity = "AMBIGUITY",
  Created = "CREATED",
  Found = "FOUND",
}

export enum FactKind {
  HasProperty = "HAS_PROPERTY",
  InstanceOf = "INSTANCE_OF",
  Model = "MODEL",
  Reference = "REFERENCE",
  SubclassOf = "SUBCLASS_OF",
}

export type ModelFilter = {
  path?: InputMaybe<Scalars["String"]["input"]>;
};

export type NumberFilter = {
  at: Scalars["String"]["input"];
  equal_to?: InputMaybe<Scalars["Float"]["input"]>;
  greater_than?: InputMaybe<Scalars["Float"]["input"]>;
  less_than?: InputMaybe<Scalars["Float"]["input"]>;
  not_null?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ReferenceFilter = {
  at: Scalars["String"]["input"];
  is?: InputMaybe<Scalars["String"]["input"]>;
  not_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  null?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type StringFilter = {
  at: Scalars["String"]["input"];
  contains?: InputMaybe<Scalars["String"]["input"]>;
  ends_with?: InputMaybe<Scalars["String"]["input"]>;
  equal_to?: InputMaybe<Scalars["String"]["input"]>;
  length_greater_than?: InputMaybe<Scalars["Int"]["input"]>;
  length_less_than?: InputMaybe<Scalars["Int"]["input"]>;
  not_contains?: InputMaybe<Scalars["String"]["input"]>;
  not_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  starts_with?: InputMaybe<Scalars["String"]["input"]>;
};

export type ModelFragmentFragment = {
  __typename?: "Model";
  path: string | null;
  label: string | null;
  description: string | null;
};

export type WorkspaceFragmentFragment = {
  __typename?: "Model";
  path: string | null;
  label: string | null;
  description: string | null;
};

export type AgentFragmentFragment = {
  __typename?: "Model";
  path: string | null;
  label: string | null;
  description: string | null;
  at: { __typename?: "Model"; string_value: string | null } | null;
};

export type RoleFragmentFragment = {
  __typename?: "Model";
  path: string | null;
  label: string | null;
  description: string | null;
};

export type McpServerFragmentFragment = {
  __typename?: "Model";
  path: string | null;
  label: string | null;
  description: string | null;
  at: { __typename?: "Model"; string_value: string | null } | null;
};

export type GetWorkspacesQueryVariables = Exact<{ [key: string]: never }>;

export type GetWorkspacesQuery = {
  __typename?: "Query";
  model: {
    __typename?: "Model";
    path: string | null;
    label: string | null;
    description: string | null;
    instances: Array<{
      __typename?: "Model";
      path: string | null;
      label: string | null;
      description: string | null;
    }>;
  } | null;
};

export type GetWorkspaceQueryVariables = Exact<{
  path: Scalars["String"]["input"];
}>;

export type GetWorkspaceQuery = {
  __typename?: "Query";
  model: {
    __typename?: "Model";
    path: string | null;
    label: string | null;
    description: string | null;
  } | null;
};

export type CreateWorkspaceMutationVariables = Exact<{
  label: Scalars["String"]["input"];
}>;

export type CreateWorkspaceMutation = {
  __typename?: "Mutation";
  at: {
    __typename?: "ModelMutation";
    instantiate: {
      __typename?: "ModelMutation";
      model: {
        __typename?: "Model";
        path: string | null;
        label: string | null;
        description: string | null;
      } | null;
    } | null;
  } | null;
};

export type GetAgentsQueryVariables = Exact<{ [key: string]: never }>;

export type GetAgentsQuery = {
  __typename?: "Query";
  model: {
    __typename?: "Model";
    path: string | null;
    label: string | null;
    description: string | null;
    instances: Array<{
      __typename?: "Model";
      path: string | null;
      label: string | null;
      description: string | null;
      at: { __typename?: "Model"; string_value: string | null } | null;
    }>;
  } | null;
};

export type CreateAgentMutationVariables = Exact<{
  label: Scalars["String"]["input"];
}>;

export type CreateAgentMutation = {
  __typename?: "Mutation";
  at: {
    __typename?: "ModelMutation";
    instantiate: {
      __typename?: "ModelMutation";
      model: {
        __typename?: "Model";
        path: string | null;
        label: string | null;
        description: string | null;
        at: { __typename?: "Model"; string_value: string | null } | null;
      } | null;
    } | null;
  } | null;
};

export type RefreshAgentTokenMutationVariables = Exact<{
  agentPath: Scalars["String"]["input"];
  token: Scalars["String"]["input"];
}>;

export type RefreshAgentTokenMutation = {
  __typename?: "Mutation";
  at: {
    __typename?: "ModelMutation";
    at: {
      __typename?: "ModelMutation";
      set_string_value: {
        __typename?: "ModelMutation";
        model: { __typename?: "Model"; string_value: string | null } | null;
      } | null;
    } | null;
  } | null;
};

export type AssignRoleToAgentMutationVariables = Exact<{
  agentPath: Scalars["String"]["input"];
  roleId: Scalars["String"]["input"];
}>;

export type AssignRoleToAgentMutation = {
  __typename?: "Mutation";
  at: {
    __typename?: "ModelMutation";
    add_prototype: {
      __typename?: "ModelMutation";
      done: boolean | null;
    } | null;
  } | null;
};

export type GetRolesQueryVariables = Exact<{ [key: string]: never }>;

export type GetRolesQuery = {
  __typename?: "Query";
  model: {
    __typename?: "Model";
    path: string | null;
    label: string | null;
    description: string | null;
    instances: Array<{
      __typename?: "Model";
      path: string | null;
      label: string | null;
      description: string | null;
    }>;
  } | null;
};

export type CreateRoleMutationVariables = Exact<{
  label: Scalars["String"]["input"];
}>;

export type CreateRoleMutation = {
  __typename?: "Mutation";
  at: {
    __typename?: "ModelMutation";
    instantiate: {
      __typename?: "ModelMutation";
      model: {
        __typename?: "Model";
        path: string | null;
        label: string | null;
        description: string | null;
      } | null;
    } | null;
  } | null;
};

export type GetRoleAgentsQueryVariables = Exact<{
  roleId: Scalars["String"]["input"];
}>;

export type GetRoleAgentsQuery = {
  __typename?: "Query";
  model: {
    __typename?: "Model";
    direct_instances: Array<{
      __typename?: "Model";
      path: string | null;
      label: string | null;
      description: string | null;
    }>;
  } | null;
};

export type GetMcpServersQueryVariables = Exact<{
  workspaceId: Scalars["String"]["input"];
}>;

export type GetMcpServersQuery = {
  __typename?: "Query";
  model: {
    __typename?: "Model";
    path: string | null;
    label: string | null;
    features: Array<{
      __typename?: "Feature";
      model: {
        __typename?: "Model";
        path: string | null;
        label: string | null;
        description: string | null;
        at: { __typename?: "Model"; string_value: string | null } | null;
      } | null;
    }>;
  } | null;
};

export type CreateMcpServerMutationVariables = Exact<{
  label: Scalars["String"]["input"];
}>;

export type CreateMcpServerMutation = {
  __typename?: "Mutation";
  at: {
    __typename?: "ModelMutation";
    instantiate: {
      __typename?: "ModelMutation";
      model: {
        __typename?: "Model";
        path: string | null;
        label: string | null;
        description: string | null;
        at: { __typename?: "Model"; string_value: string | null } | null;
      } | null;
    } | null;
  } | null;
};

export type SetMcpServerUrlMutationVariables = Exact<{
  serverPath: Scalars["String"]["input"];
  url: Scalars["String"]["input"];
}>;

export type SetMcpServerUrlMutation = {
  __typename?: "Mutation";
  at: {
    __typename?: "ModelMutation";
    at: {
      __typename?: "ModelMutation";
      set_string_value: {
        __typename?: "ModelMutation";
        model: { __typename?: "Model"; path: string | null } | null;
      } | null;
    } | null;
  } | null;
};

export type GetMcpToolsQueryVariables = Exact<{
  serverId: Scalars["String"]["input"];
}>;

export type GetMcpToolsQuery = {
  __typename?: "Query";
  model: {
    __typename?: "Model";
    at: {
      __typename?: "Model";
      submodels: Array<{
        __typename?: "Model";
        path: string | null;
        label: string | null;
        description: string | null;
      }>;
    } | null;
  } | null;
};

export type GetResourcePermissionsQueryVariables = Exact<{
  resourceId: Scalars["String"]["input"];
}>;

export type GetResourcePermissionsQuery = {
  __typename?: "Query";
  model: {
    __typename?: "Model";
    reverse_references: Array<{
      __typename?: "Model";
      path: string | null;
      label: string | null;
      description: string | null;
    }>;
  } | null;
};

export type CreatePermissionMutationVariables = Exact<{
  targetId: Scalars["String"]["input"];
  feature: Scalars["String"]["input"];
  resourceId: Scalars["String"]["input"];
}>;

export type CreatePermissionMutation = {
  __typename?: "Mutation";
  at: {
    __typename?: "ModelMutation";
    use_feature: {
      __typename?: "ModelMutation";
      at: {
        __typename?: "ModelMutation";
        set_reference: {
          __typename?: "ModelMutation";
          model: {
            __typename?: "Model";
            path: string | null;
            label: string | null;
          } | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type GetAgentPermissionsQueryVariables = Exact<{
  agentId: Scalars["String"]["input"];
}>;

export type GetAgentPermissionsQuery = {
  __typename?: "Query";
  model: {
    __typename?: "Model";
    features: Array<{
      __typename?: "Feature";
      model: {
        __typename?: "Model";
        path: string | null;
        label: string | null;
        description: string | null;
        prototypes: Array<{
          __typename?: "Model";
          path: string | null;
          label: string | null;
        }>;
        at: {
          __typename?: "Model";
          reference: {
            __typename?: "Model";
            path: string | null;
            label: string | null;
          } | null;
        } | null;
      } | null;
    }>;
  } | null;
};

export const ModelFragmentFragmentDoc = gql`
  fragment ModelFragment on Model {
    path
    label
    description
  }
`;
export const WorkspaceFragmentFragmentDoc = gql`
  fragment WorkspaceFragment on Model {
    path
    label
    description
  }
`;
export const AgentFragmentFragmentDoc = gql`
  fragment AgentFragment on Model {
    path
    label
    description
    at(submodel: "authentication_token") {
      string_value
    }
  }
`;
export const RoleFragmentFragmentDoc = gql`
  fragment RoleFragment on Model {
    path
    label
    description
  }
`;
export const McpServerFragmentFragmentDoc = gql`
  fragment MCPServerFragment on Model {
    path
    label
    description
    at(submodel: "url") {
      string_value
    }
  }
`;
export const GetWorkspacesDocument = gql`
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
  ${WorkspaceFragmentFragmentDoc}
`;

/**
 * __useGetWorkspacesQuery__
 *
 * To run a query within a React component, call `useGetWorkspacesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetWorkspacesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetWorkspacesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetWorkspacesQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<
    GetWorkspacesQuery,
    GetWorkspacesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useQuery<
    GetWorkspacesQuery,
    GetWorkspacesQueryVariables
  >(GetWorkspacesDocument, options);
}
export function useGetWorkspacesLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    GetWorkspacesQuery,
    GetWorkspacesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useLazyQuery<
    GetWorkspacesQuery,
    GetWorkspacesQueryVariables
  >(GetWorkspacesDocument, options);
}
export function useGetWorkspacesSuspenseQuery(
  baseOptions?:
    | ApolloReactHooks.SkipToken
    | ApolloReactHooks.SuspenseQueryHookOptions<
        GetWorkspacesQuery,
        GetWorkspacesQueryVariables
      >,
) {
  const options =
    baseOptions === ApolloReactHooks.skipToken
      ? baseOptions
      : { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useSuspenseQuery<
    GetWorkspacesQuery,
    GetWorkspacesQueryVariables
  >(GetWorkspacesDocument, options);
}
export type GetWorkspacesQueryHookResult = ReturnType<
  typeof useGetWorkspacesQuery
>;
export type GetWorkspacesLazyQueryHookResult = ReturnType<
  typeof useGetWorkspacesLazyQuery
>;
export type GetWorkspacesSuspenseQueryHookResult = ReturnType<
  typeof useGetWorkspacesSuspenseQuery
>;
export type GetWorkspacesQueryResult = ApolloReactCommon.QueryResult<
  GetWorkspacesQuery,
  GetWorkspacesQueryVariables
>;
export const GetWorkspaceDocument = gql`
  query GetWorkspace($path: String!) {
    model(path: $path) {
      ...WorkspaceFragment
    }
  }
  ${WorkspaceFragmentFragmentDoc}
`;

/**
 * __useGetWorkspaceQuery__
 *
 * To run a query within a React component, call `useGetWorkspaceQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetWorkspaceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetWorkspaceQuery({
 *   variables: {
 *      path: // value for 'path'
 *   },
 * });
 */
export function useGetWorkspaceQuery(
  baseOptions: ApolloReactHooks.QueryHookOptions<
    GetWorkspaceQuery,
    GetWorkspaceQueryVariables
  > &
    (
      | { variables: GetWorkspaceQueryVariables; skip?: boolean }
      | { skip: boolean }
    ),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useQuery<
    GetWorkspaceQuery,
    GetWorkspaceQueryVariables
  >(GetWorkspaceDocument, options);
}
export function useGetWorkspaceLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    GetWorkspaceQuery,
    GetWorkspaceQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useLazyQuery<
    GetWorkspaceQuery,
    GetWorkspaceQueryVariables
  >(GetWorkspaceDocument, options);
}
export function useGetWorkspaceSuspenseQuery(
  baseOptions?:
    | ApolloReactHooks.SkipToken
    | ApolloReactHooks.SuspenseQueryHookOptions<
        GetWorkspaceQuery,
        GetWorkspaceQueryVariables
      >,
) {
  const options =
    baseOptions === ApolloReactHooks.skipToken
      ? baseOptions
      : { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useSuspenseQuery<
    GetWorkspaceQuery,
    GetWorkspaceQueryVariables
  >(GetWorkspaceDocument, options);
}
export type GetWorkspaceQueryHookResult = ReturnType<
  typeof useGetWorkspaceQuery
>;
export type GetWorkspaceLazyQueryHookResult = ReturnType<
  typeof useGetWorkspaceLazyQuery
>;
export type GetWorkspaceSuspenseQueryHookResult = ReturnType<
  typeof useGetWorkspaceSuspenseQuery
>;
export type GetWorkspaceQueryResult = ApolloReactCommon.QueryResult<
  GetWorkspaceQuery,
  GetWorkspaceQueryVariables
>;
export const CreateWorkspaceDocument = gql`
  mutation CreateWorkspace($label: String!) {
    at(path: "workspace") {
      instantiate(label: $label) {
        model {
          ...WorkspaceFragment
        }
      }
    }
  }
  ${WorkspaceFragmentFragmentDoc}
`;
export type CreateWorkspaceMutationFn = ApolloReactCommon.MutationFunction<
  CreateWorkspaceMutation,
  CreateWorkspaceMutationVariables
>;

/**
 * __useCreateWorkspaceMutation__
 *
 * To run a mutation, you first call `useCreateWorkspaceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateWorkspaceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createWorkspaceMutation, { data, loading, error }] = useCreateWorkspaceMutation({
 *   variables: {
 *      label: // value for 'label'
 *   },
 * });
 */
export function useCreateWorkspaceMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    CreateWorkspaceMutation,
    CreateWorkspaceMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useMutation<
    CreateWorkspaceMutation,
    CreateWorkspaceMutationVariables
  >(CreateWorkspaceDocument, options);
}
export type CreateWorkspaceMutationHookResult = ReturnType<
  typeof useCreateWorkspaceMutation
>;
export type CreateWorkspaceMutationResult =
  ApolloReactCommon.MutationResult<CreateWorkspaceMutation>;
export type CreateWorkspaceMutationOptions =
  ApolloReactCommon.BaseMutationOptions<
    CreateWorkspaceMutation,
    CreateWorkspaceMutationVariables
  >;
export const GetAgentsDocument = gql`
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
  ${AgentFragmentFragmentDoc}
`;

/**
 * __useGetAgentsQuery__
 *
 * To run a query within a React component, call `useGetAgentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAgentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAgentsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAgentsQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<
    GetAgentsQuery,
    GetAgentsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useQuery<GetAgentsQuery, GetAgentsQueryVariables>(
    GetAgentsDocument,
    options,
  );
}
export function useGetAgentsLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    GetAgentsQuery,
    GetAgentsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useLazyQuery<GetAgentsQuery, GetAgentsQueryVariables>(
    GetAgentsDocument,
    options,
  );
}
export function useGetAgentsSuspenseQuery(
  baseOptions?:
    | ApolloReactHooks.SkipToken
    | ApolloReactHooks.SuspenseQueryHookOptions<
        GetAgentsQuery,
        GetAgentsQueryVariables
      >,
) {
  const options =
    baseOptions === ApolloReactHooks.skipToken
      ? baseOptions
      : { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useSuspenseQuery<
    GetAgentsQuery,
    GetAgentsQueryVariables
  >(GetAgentsDocument, options);
}
export type GetAgentsQueryHookResult = ReturnType<typeof useGetAgentsQuery>;
export type GetAgentsLazyQueryHookResult = ReturnType<
  typeof useGetAgentsLazyQuery
>;
export type GetAgentsSuspenseQueryHookResult = ReturnType<
  typeof useGetAgentsSuspenseQuery
>;
export type GetAgentsQueryResult = ApolloReactCommon.QueryResult<
  GetAgentsQuery,
  GetAgentsQueryVariables
>;
export const CreateAgentDocument = gql`
  mutation CreateAgent($label: String!) {
    at(path: "agent") {
      instantiate(label: $label) {
        model {
          ...AgentFragment
        }
      }
    }
  }
  ${AgentFragmentFragmentDoc}
`;
export type CreateAgentMutationFn = ApolloReactCommon.MutationFunction<
  CreateAgentMutation,
  CreateAgentMutationVariables
>;

/**
 * __useCreateAgentMutation__
 *
 * To run a mutation, you first call `useCreateAgentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateAgentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createAgentMutation, { data, loading, error }] = useCreateAgentMutation({
 *   variables: {
 *      label: // value for 'label'
 *   },
 * });
 */
export function useCreateAgentMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    CreateAgentMutation,
    CreateAgentMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useMutation<
    CreateAgentMutation,
    CreateAgentMutationVariables
  >(CreateAgentDocument, options);
}
export type CreateAgentMutationHookResult = ReturnType<
  typeof useCreateAgentMutation
>;
export type CreateAgentMutationResult =
  ApolloReactCommon.MutationResult<CreateAgentMutation>;
export type CreateAgentMutationOptions = ApolloReactCommon.BaseMutationOptions<
  CreateAgentMutation,
  CreateAgentMutationVariables
>;
export const RefreshAgentTokenDocument = gql`
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
export type RefreshAgentTokenMutationFn = ApolloReactCommon.MutationFunction<
  RefreshAgentTokenMutation,
  RefreshAgentTokenMutationVariables
>;

/**
 * __useRefreshAgentTokenMutation__
 *
 * To run a mutation, you first call `useRefreshAgentTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRefreshAgentTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [refreshAgentTokenMutation, { data, loading, error }] = useRefreshAgentTokenMutation({
 *   variables: {
 *      agentPath: // value for 'agentPath'
 *      token: // value for 'token'
 *   },
 * });
 */
export function useRefreshAgentTokenMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    RefreshAgentTokenMutation,
    RefreshAgentTokenMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useMutation<
    RefreshAgentTokenMutation,
    RefreshAgentTokenMutationVariables
  >(RefreshAgentTokenDocument, options);
}
export type RefreshAgentTokenMutationHookResult = ReturnType<
  typeof useRefreshAgentTokenMutation
>;
export type RefreshAgentTokenMutationResult =
  ApolloReactCommon.MutationResult<RefreshAgentTokenMutation>;
export type RefreshAgentTokenMutationOptions =
  ApolloReactCommon.BaseMutationOptions<
    RefreshAgentTokenMutation,
    RefreshAgentTokenMutationVariables
  >;
export const AssignRoleToAgentDocument = gql`
  mutation AssignRoleToAgent($agentPath: String!, $roleId: String!) {
    at(path: $agentPath) {
      add_prototype(prototype: $roleId) {
        done
      }
    }
  }
`;
export type AssignRoleToAgentMutationFn = ApolloReactCommon.MutationFunction<
  AssignRoleToAgentMutation,
  AssignRoleToAgentMutationVariables
>;

/**
 * __useAssignRoleToAgentMutation__
 *
 * To run a mutation, you first call `useAssignRoleToAgentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAssignRoleToAgentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [assignRoleToAgentMutation, { data, loading, error }] = useAssignRoleToAgentMutation({
 *   variables: {
 *      agentPath: // value for 'agentPath'
 *      roleId: // value for 'roleId'
 *   },
 * });
 */
export function useAssignRoleToAgentMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    AssignRoleToAgentMutation,
    AssignRoleToAgentMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useMutation<
    AssignRoleToAgentMutation,
    AssignRoleToAgentMutationVariables
  >(AssignRoleToAgentDocument, options);
}
export type AssignRoleToAgentMutationHookResult = ReturnType<
  typeof useAssignRoleToAgentMutation
>;
export type AssignRoleToAgentMutationResult =
  ApolloReactCommon.MutationResult<AssignRoleToAgentMutation>;
export type AssignRoleToAgentMutationOptions =
  ApolloReactCommon.BaseMutationOptions<
    AssignRoleToAgentMutation,
    AssignRoleToAgentMutationVariables
  >;
export const GetRolesDocument = gql`
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
  ${RoleFragmentFragmentDoc}
`;

/**
 * __useGetRolesQuery__
 *
 * To run a query within a React component, call `useGetRolesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRolesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRolesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetRolesQuery(
  baseOptions?: ApolloReactHooks.QueryHookOptions<
    GetRolesQuery,
    GetRolesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useQuery<GetRolesQuery, GetRolesQueryVariables>(
    GetRolesDocument,
    options,
  );
}
export function useGetRolesLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    GetRolesQuery,
    GetRolesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useLazyQuery<GetRolesQuery, GetRolesQueryVariables>(
    GetRolesDocument,
    options,
  );
}
export function useGetRolesSuspenseQuery(
  baseOptions?:
    | ApolloReactHooks.SkipToken
    | ApolloReactHooks.SuspenseQueryHookOptions<
        GetRolesQuery,
        GetRolesQueryVariables
      >,
) {
  const options =
    baseOptions === ApolloReactHooks.skipToken
      ? baseOptions
      : { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useSuspenseQuery<
    GetRolesQuery,
    GetRolesQueryVariables
  >(GetRolesDocument, options);
}
export type GetRolesQueryHookResult = ReturnType<typeof useGetRolesQuery>;
export type GetRolesLazyQueryHookResult = ReturnType<
  typeof useGetRolesLazyQuery
>;
export type GetRolesSuspenseQueryHookResult = ReturnType<
  typeof useGetRolesSuspenseQuery
>;
export type GetRolesQueryResult = ApolloReactCommon.QueryResult<
  GetRolesQuery,
  GetRolesQueryVariables
>;
export const CreateRoleDocument = gql`
  mutation CreateRole($label: String!) {
    at(path: "role") {
      instantiate(label: $label) {
        model {
          ...RoleFragment
        }
      }
    }
  }
  ${RoleFragmentFragmentDoc}
`;
export type CreateRoleMutationFn = ApolloReactCommon.MutationFunction<
  CreateRoleMutation,
  CreateRoleMutationVariables
>;

/**
 * __useCreateRoleMutation__
 *
 * To run a mutation, you first call `useCreateRoleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateRoleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createRoleMutation, { data, loading, error }] = useCreateRoleMutation({
 *   variables: {
 *      label: // value for 'label'
 *   },
 * });
 */
export function useCreateRoleMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    CreateRoleMutation,
    CreateRoleMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useMutation<
    CreateRoleMutation,
    CreateRoleMutationVariables
  >(CreateRoleDocument, options);
}
export type CreateRoleMutationHookResult = ReturnType<
  typeof useCreateRoleMutation
>;
export type CreateRoleMutationResult =
  ApolloReactCommon.MutationResult<CreateRoleMutation>;
export type CreateRoleMutationOptions = ApolloReactCommon.BaseMutationOptions<
  CreateRoleMutation,
  CreateRoleMutationVariables
>;
export const GetRoleAgentsDocument = gql`
  query GetRoleAgents($roleId: String!) {
    model(path: $roleId) {
      direct_instances {
        ...ModelFragment
      }
    }
  }
  ${ModelFragmentFragmentDoc}
`;

/**
 * __useGetRoleAgentsQuery__
 *
 * To run a query within a React component, call `useGetRoleAgentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRoleAgentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRoleAgentsQuery({
 *   variables: {
 *      roleId: // value for 'roleId'
 *   },
 * });
 */
export function useGetRoleAgentsQuery(
  baseOptions: ApolloReactHooks.QueryHookOptions<
    GetRoleAgentsQuery,
    GetRoleAgentsQueryVariables
  > &
    (
      | { variables: GetRoleAgentsQueryVariables; skip?: boolean }
      | { skip: boolean }
    ),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useQuery<
    GetRoleAgentsQuery,
    GetRoleAgentsQueryVariables
  >(GetRoleAgentsDocument, options);
}
export function useGetRoleAgentsLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    GetRoleAgentsQuery,
    GetRoleAgentsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useLazyQuery<
    GetRoleAgentsQuery,
    GetRoleAgentsQueryVariables
  >(GetRoleAgentsDocument, options);
}
export function useGetRoleAgentsSuspenseQuery(
  baseOptions?:
    | ApolloReactHooks.SkipToken
    | ApolloReactHooks.SuspenseQueryHookOptions<
        GetRoleAgentsQuery,
        GetRoleAgentsQueryVariables
      >,
) {
  const options =
    baseOptions === ApolloReactHooks.skipToken
      ? baseOptions
      : { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useSuspenseQuery<
    GetRoleAgentsQuery,
    GetRoleAgentsQueryVariables
  >(GetRoleAgentsDocument, options);
}
export type GetRoleAgentsQueryHookResult = ReturnType<
  typeof useGetRoleAgentsQuery
>;
export type GetRoleAgentsLazyQueryHookResult = ReturnType<
  typeof useGetRoleAgentsLazyQuery
>;
export type GetRoleAgentsSuspenseQueryHookResult = ReturnType<
  typeof useGetRoleAgentsSuspenseQuery
>;
export type GetRoleAgentsQueryResult = ApolloReactCommon.QueryResult<
  GetRoleAgentsQuery,
  GetRoleAgentsQueryVariables
>;
export const GetMcpServersDocument = gql`
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
  ${McpServerFragmentFragmentDoc}
`;

/**
 * __useGetMcpServersQuery__
 *
 * To run a query within a React component, call `useGetMcpServersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMcpServersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMcpServersQuery({
 *   variables: {
 *      workspaceId: // value for 'workspaceId'
 *   },
 * });
 */
export function useGetMcpServersQuery(
  baseOptions: ApolloReactHooks.QueryHookOptions<
    GetMcpServersQuery,
    GetMcpServersQueryVariables
  > &
    (
      | { variables: GetMcpServersQueryVariables; skip?: boolean }
      | { skip: boolean }
    ),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useQuery<
    GetMcpServersQuery,
    GetMcpServersQueryVariables
  >(GetMcpServersDocument, options);
}
export function useGetMcpServersLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    GetMcpServersQuery,
    GetMcpServersQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useLazyQuery<
    GetMcpServersQuery,
    GetMcpServersQueryVariables
  >(GetMcpServersDocument, options);
}
export function useGetMcpServersSuspenseQuery(
  baseOptions?:
    | ApolloReactHooks.SkipToken
    | ApolloReactHooks.SuspenseQueryHookOptions<
        GetMcpServersQuery,
        GetMcpServersQueryVariables
      >,
) {
  const options =
    baseOptions === ApolloReactHooks.skipToken
      ? baseOptions
      : { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useSuspenseQuery<
    GetMcpServersQuery,
    GetMcpServersQueryVariables
  >(GetMcpServersDocument, options);
}
export type GetMcpServersQueryHookResult = ReturnType<
  typeof useGetMcpServersQuery
>;
export type GetMcpServersLazyQueryHookResult = ReturnType<
  typeof useGetMcpServersLazyQuery
>;
export type GetMcpServersSuspenseQueryHookResult = ReturnType<
  typeof useGetMcpServersSuspenseQuery
>;
export type GetMcpServersQueryResult = ApolloReactCommon.QueryResult<
  GetMcpServersQuery,
  GetMcpServersQueryVariables
>;
export const CreateMcpServerDocument = gql`
  mutation CreateMCPServer($label: String!) {
    at(path: "mcp_server") {
      instantiate(label: $label) {
        model {
          ...MCPServerFragment
        }
      }
    }
  }
  ${McpServerFragmentFragmentDoc}
`;
export type CreateMcpServerMutationFn = ApolloReactCommon.MutationFunction<
  CreateMcpServerMutation,
  CreateMcpServerMutationVariables
>;

/**
 * __useCreateMcpServerMutation__
 *
 * To run a mutation, you first call `useCreateMcpServerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMcpServerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMcpServerMutation, { data, loading, error }] = useCreateMcpServerMutation({
 *   variables: {
 *      label: // value for 'label'
 *   },
 * });
 */
export function useCreateMcpServerMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    CreateMcpServerMutation,
    CreateMcpServerMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useMutation<
    CreateMcpServerMutation,
    CreateMcpServerMutationVariables
  >(CreateMcpServerDocument, options);
}
export type CreateMcpServerMutationHookResult = ReturnType<
  typeof useCreateMcpServerMutation
>;
export type CreateMcpServerMutationResult =
  ApolloReactCommon.MutationResult<CreateMcpServerMutation>;
export type CreateMcpServerMutationOptions =
  ApolloReactCommon.BaseMutationOptions<
    CreateMcpServerMutation,
    CreateMcpServerMutationVariables
  >;
export const SetMcpServerUrlDocument = gql`
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
export type SetMcpServerUrlMutationFn = ApolloReactCommon.MutationFunction<
  SetMcpServerUrlMutation,
  SetMcpServerUrlMutationVariables
>;

/**
 * __useSetMcpServerUrlMutation__
 *
 * To run a mutation, you first call `useSetMcpServerUrlMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetMcpServerUrlMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setMcpServerUrlMutation, { data, loading, error }] = useSetMcpServerUrlMutation({
 *   variables: {
 *      serverPath: // value for 'serverPath'
 *      url: // value for 'url'
 *   },
 * });
 */
export function useSetMcpServerUrlMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    SetMcpServerUrlMutation,
    SetMcpServerUrlMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useMutation<
    SetMcpServerUrlMutation,
    SetMcpServerUrlMutationVariables
  >(SetMcpServerUrlDocument, options);
}
export type SetMcpServerUrlMutationHookResult = ReturnType<
  typeof useSetMcpServerUrlMutation
>;
export type SetMcpServerUrlMutationResult =
  ApolloReactCommon.MutationResult<SetMcpServerUrlMutation>;
export type SetMcpServerUrlMutationOptions =
  ApolloReactCommon.BaseMutationOptions<
    SetMcpServerUrlMutation,
    SetMcpServerUrlMutationVariables
  >;
export const GetMcpToolsDocument = gql`
  query GetMCPTools($serverId: String!) {
    model(path: $serverId) {
      at(submodel: "tools") {
        submodels {
          ...ModelFragment
        }
      }
    }
  }
  ${ModelFragmentFragmentDoc}
`;

/**
 * __useGetMcpToolsQuery__
 *
 * To run a query within a React component, call `useGetMcpToolsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMcpToolsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMcpToolsQuery({
 *   variables: {
 *      serverId: // value for 'serverId'
 *   },
 * });
 */
export function useGetMcpToolsQuery(
  baseOptions: ApolloReactHooks.QueryHookOptions<
    GetMcpToolsQuery,
    GetMcpToolsQueryVariables
  > &
    (
      | { variables: GetMcpToolsQueryVariables; skip?: boolean }
      | { skip: boolean }
    ),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useQuery<GetMcpToolsQuery, GetMcpToolsQueryVariables>(
    GetMcpToolsDocument,
    options,
  );
}
export function useGetMcpToolsLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    GetMcpToolsQuery,
    GetMcpToolsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useLazyQuery<
    GetMcpToolsQuery,
    GetMcpToolsQueryVariables
  >(GetMcpToolsDocument, options);
}
export function useGetMcpToolsSuspenseQuery(
  baseOptions?:
    | ApolloReactHooks.SkipToken
    | ApolloReactHooks.SuspenseQueryHookOptions<
        GetMcpToolsQuery,
        GetMcpToolsQueryVariables
      >,
) {
  const options =
    baseOptions === ApolloReactHooks.skipToken
      ? baseOptions
      : { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useSuspenseQuery<
    GetMcpToolsQuery,
    GetMcpToolsQueryVariables
  >(GetMcpToolsDocument, options);
}
export type GetMcpToolsQueryHookResult = ReturnType<typeof useGetMcpToolsQuery>;
export type GetMcpToolsLazyQueryHookResult = ReturnType<
  typeof useGetMcpToolsLazyQuery
>;
export type GetMcpToolsSuspenseQueryHookResult = ReturnType<
  typeof useGetMcpToolsSuspenseQuery
>;
export type GetMcpToolsQueryResult = ApolloReactCommon.QueryResult<
  GetMcpToolsQuery,
  GetMcpToolsQueryVariables
>;
export const GetResourcePermissionsDocument = gql`
  query GetResourcePermissions($resourceId: String!) {
    model(path: $resourceId) {
      reverse_references {
        ...ModelFragment
      }
    }
  }
  ${ModelFragmentFragmentDoc}
`;

/**
 * __useGetResourcePermissionsQuery__
 *
 * To run a query within a React component, call `useGetResourcePermissionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetResourcePermissionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetResourcePermissionsQuery({
 *   variables: {
 *      resourceId: // value for 'resourceId'
 *   },
 * });
 */
export function useGetResourcePermissionsQuery(
  baseOptions: ApolloReactHooks.QueryHookOptions<
    GetResourcePermissionsQuery,
    GetResourcePermissionsQueryVariables
  > &
    (
      | { variables: GetResourcePermissionsQueryVariables; skip?: boolean }
      | { skip: boolean }
    ),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useQuery<
    GetResourcePermissionsQuery,
    GetResourcePermissionsQueryVariables
  >(GetResourcePermissionsDocument, options);
}
export function useGetResourcePermissionsLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    GetResourcePermissionsQuery,
    GetResourcePermissionsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useLazyQuery<
    GetResourcePermissionsQuery,
    GetResourcePermissionsQueryVariables
  >(GetResourcePermissionsDocument, options);
}
export function useGetResourcePermissionsSuspenseQuery(
  baseOptions?:
    | ApolloReactHooks.SkipToken
    | ApolloReactHooks.SuspenseQueryHookOptions<
        GetResourcePermissionsQuery,
        GetResourcePermissionsQueryVariables
      >,
) {
  const options =
    baseOptions === ApolloReactHooks.skipToken
      ? baseOptions
      : { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useSuspenseQuery<
    GetResourcePermissionsQuery,
    GetResourcePermissionsQueryVariables
  >(GetResourcePermissionsDocument, options);
}
export type GetResourcePermissionsQueryHookResult = ReturnType<
  typeof useGetResourcePermissionsQuery
>;
export type GetResourcePermissionsLazyQueryHookResult = ReturnType<
  typeof useGetResourcePermissionsLazyQuery
>;
export type GetResourcePermissionsSuspenseQueryHookResult = ReturnType<
  typeof useGetResourcePermissionsSuspenseQuery
>;
export type GetResourcePermissionsQueryResult = ApolloReactCommon.QueryResult<
  GetResourcePermissionsQuery,
  GetResourcePermissionsQueryVariables
>;
export const CreatePermissionDocument = gql`
  mutation CreatePermission(
    $targetId: String!
    $feature: String!
    $resourceId: String!
  ) {
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
export type CreatePermissionMutationFn = ApolloReactCommon.MutationFunction<
  CreatePermissionMutation,
  CreatePermissionMutationVariables
>;

/**
 * __useCreatePermissionMutation__
 *
 * To run a mutation, you first call `useCreatePermissionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePermissionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPermissionMutation, { data, loading, error }] = useCreatePermissionMutation({
 *   variables: {
 *      targetId: // value for 'targetId'
 *      feature: // value for 'feature'
 *      resourceId: // value for 'resourceId'
 *   },
 * });
 */
export function useCreatePermissionMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    CreatePermissionMutation,
    CreatePermissionMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useMutation<
    CreatePermissionMutation,
    CreatePermissionMutationVariables
  >(CreatePermissionDocument, options);
}
export type CreatePermissionMutationHookResult = ReturnType<
  typeof useCreatePermissionMutation
>;
export type CreatePermissionMutationResult =
  ApolloReactCommon.MutationResult<CreatePermissionMutation>;
export type CreatePermissionMutationOptions =
  ApolloReactCommon.BaseMutationOptions<
    CreatePermissionMutation,
    CreatePermissionMutationVariables
  >;
export const GetAgentPermissionsDocument = gql`
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
  ${ModelFragmentFragmentDoc}
`;

/**
 * __useGetAgentPermissionsQuery__
 *
 * To run a query within a React component, call `useGetAgentPermissionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAgentPermissionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAgentPermissionsQuery({
 *   variables: {
 *      agentId: // value for 'agentId'
 *   },
 * });
 */
export function useGetAgentPermissionsQuery(
  baseOptions: ApolloReactHooks.QueryHookOptions<
    GetAgentPermissionsQuery,
    GetAgentPermissionsQueryVariables
  > &
    (
      | { variables: GetAgentPermissionsQueryVariables; skip?: boolean }
      | { skip: boolean }
    ),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useQuery<
    GetAgentPermissionsQuery,
    GetAgentPermissionsQueryVariables
  >(GetAgentPermissionsDocument, options);
}
export function useGetAgentPermissionsLazyQuery(
  baseOptions?: ApolloReactHooks.LazyQueryHookOptions<
    GetAgentPermissionsQuery,
    GetAgentPermissionsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useLazyQuery<
    GetAgentPermissionsQuery,
    GetAgentPermissionsQueryVariables
  >(GetAgentPermissionsDocument, options);
}
export function useGetAgentPermissionsSuspenseQuery(
  baseOptions?:
    | ApolloReactHooks.SkipToken
    | ApolloReactHooks.SuspenseQueryHookOptions<
        GetAgentPermissionsQuery,
        GetAgentPermissionsQueryVariables
      >,
) {
  const options =
    baseOptions === ApolloReactHooks.skipToken
      ? baseOptions
      : { ...defaultOptions, ...baseOptions };
  return ApolloReactHooks.useSuspenseQuery<
    GetAgentPermissionsQuery,
    GetAgentPermissionsQueryVariables
  >(GetAgentPermissionsDocument, options);
}
export type GetAgentPermissionsQueryHookResult = ReturnType<
  typeof useGetAgentPermissionsQuery
>;
export type GetAgentPermissionsLazyQueryHookResult = ReturnType<
  typeof useGetAgentPermissionsLazyQuery
>;
export type GetAgentPermissionsSuspenseQueryHookResult = ReturnType<
  typeof useGetAgentPermissionsSuspenseQuery
>;
export type GetAgentPermissionsQueryResult = ApolloReactCommon.QueryResult<
  GetAgentPermissionsQuery,
  GetAgentPermissionsQueryVariables
>;
