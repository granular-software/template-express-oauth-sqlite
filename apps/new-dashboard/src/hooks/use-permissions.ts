"use client";

import { useQuery, useMutation } from "@apollo/client";
import { GET_RESOURCE_PERMISSIONS, CREATE_PERMISSION } from "../lib/graphql/operations";

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  workspaceId: string;
}

export function usePermissions(resourceId?: string) {
  const { data, loading, error, refetch } = useQuery(GET_RESOURCE_PERMISSIONS, {
    variables: { resourceId },
    skip: !resourceId
  });

  const [createPermissionMutation] = useMutation(CREATE_PERMISSION);

  const permissions: Permission[] = data?.model?.reverse_references || [];

  const createPermission = async (targetId: string, feature: string, resourceId: string) => {
    const { data } = await createPermissionMutation({
      variables: { targetId, feature, resourceId }
    });
    return data?.at?.use_feature?.at?.set_reference?.model;
  };

  return {
    permissions,
    loading,
    error,
    refetch,
    createPermission
  };
} 