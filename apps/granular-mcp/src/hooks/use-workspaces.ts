"use client";

import { useState, useEffect } from "react";
import { api } from "awmt-sdk";
import type { Model, QueryPromiseChain, MutationPromiseChain } from "awmt-sdk/api/schema";

interface Workspace {
  path: string | null;
  label: string | null;
  description: string | null;
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch workspaces
  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the workspace model and its instances
      const workspaceModel = await (api.chain.query as QueryPromiseChain)
        .model({ path: "workspace" })
        .execute({
          path: true,
          label: true,
          description: true,
          instances: {
            path: true,
            label: true,
            description: true,
          },
        });

      if (workspaceModel?.instances) {
        const workspaceInstances = workspaceModel.instances.map((instance: Model) => ({
          path: instance.path,
          label: instance.label,
          description: instance.description,
        }));
        setWorkspaces(workspaceInstances);
      } else {
        setWorkspaces([]);
      }
    } catch (err) {
      console.error("Error fetching workspaces:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch workspaces");
    } finally {
      setLoading(false);
    }
  };

  // Create a new workspace
  const createWorkspace = async (name: string) => {
    try {
      setError(null);

      const result = await (api.chain.mutation as MutationPromiseChain)
        .at({ path: "workspace" })
        .instantiate({ label: name })
        .execute({
          model: {
            path: true,
            label: true,
            description: true,
          },
        });

      if (result?.model) {
        const newWorkspace: Workspace = {
          path: result.model.path,
          label: result.model.label,
          description: result.model.description,
        };

        // Add the new workspace to the list
        setWorkspaces((prev) => [...prev, newWorkspace]);
        return newWorkspace;
      } else {
        throw new Error("Failed to create workspace");
      }
    } catch (err) {
      console.error("Error creating workspace:", err);
      setError(err instanceof Error ? err.message : "Failed to create workspace");
      throw err;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchWorkspaces();
  }, []);

  return {
    workspaces,
    loading,
    error,
    fetchWorkspaces,
    createWorkspace,
  };
} 