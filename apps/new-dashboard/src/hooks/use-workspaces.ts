"use client";

import { useQuery, useMutation, gql } from "@apollo/client";

export interface Workspace {
	id: string;
	name: string;
	description?: string;
	path: string;
}

const GET_WORKSPACES = gql`
	query GetWorkspaces {
		model(path: "workspace") {
			direct_instances {
				path
				label
				description
			}
		}
	}
`;

const CREATE_WORKSPACE = gql`
	mutation CreateWorkspace($label: String!) {
		at(path: "workspace") {
			instantiate(label: $label) {
				model {
					path
					label
					description
				}
			}
		}
	}
`;

export function useWorkspaces() {
	const { data, loading, error, refetch } = useQuery<{
		model: {
			direct_instances: {
				path: string;
				label: string;
				description: string;
			}[];
		};
	}>(GET_WORKSPACES, {
		notifyOnNetworkStatusChange: true,
		errorPolicy: "all",
	});
	const [createWorkspaceMutation] = useMutation<{
		at: {
			instantiate: {
				model: { path: string; label: string; description: string };
			};
		};
	}>(CREATE_WORKSPACE);

	const workspaces: Workspace[] =
		data?.model?.direct_instances?.map((workspace) => ({
			id: workspace.path || "",
			name: workspace.label || "Unnamed Workspace",
			description: workspace.description || undefined,
			path: workspace.path || "",
		})) || [];

	const createWorkspace = async (name: string, description?: string) => {
		console.log("createWorkspace called with name:", name, "description:", description);
		const { data } = await createWorkspaceMutation({
			variables: { label: name },
		});
		// Refresh the workspace list after successful creation
		if (data?.at?.instantiate?.model) {
			await refetch();
		}
		return data?.at?.instantiate?.model;
	};

	return {
		workspaces,
		loading,
		error,
		refetch,
		createWorkspace,
	};
}
