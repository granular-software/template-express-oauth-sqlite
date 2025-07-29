"use client";

import { useState, useEffect } from "react";
import { api } from "awmt-sdk";
import type { Model, QueryPromiseChain, MutationPromiseChain } from "awmt-sdk/api/schema";

interface WorkspaceMcpServer {
  path: string;
  label: string | null;
}

export function useWorkspaceMcpServers(workspacePath: string) {
  const [attachedServers, setAttachedServers] = useState<WorkspaceMcpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch MCP servers attached to the workspace
  const fetchAttachedServers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query equivalent to the provided GraphQL
      const result = await (api.chain.query as QueryPromiseChain)
        .model({ path: workspacePath })
        .at({ submodel: "mcp_servers" })
        .execute({
          submodels: {
            reference: {
              path: true,
              label: true,
            },
          },
        });

      if (result?.submodels) {
        const servers = result.submodels.map((submodel: any) => ({
          path: submodel.reference.path,
          label: submodel.reference.label,
        }));
        setAttachedServers(servers);
      } else {
        setAttachedServers([]);
      }
    } catch (err) {
      console.error("Error fetching workspace MCP servers:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch workspace MCP servers");
    } finally {
      setLoading(false);
    }
  };

  // Attach an MCP server to the workspace
  const attachMcpServer = async (mcpServerPath: string) => {
    try {
      setError(null);

      // Mutation equivalent to the provided GraphQL
      const result = await (api.chain.mutation as MutationPromiseChain)
        .at({ path: workspacePath + ":mcp_servers" })
        .create_submodel({ subpath: mcpServerPath })
        .set_reference({ reference: mcpServerPath })
        .execute({
          model: {
            path: true,
          },
        });

      if (result?.model) {
        // Refresh the list of attached servers
        await fetchAttachedServers();
        return result.model;
      } else {
        throw new Error("Failed to attach MCP server to workspace");
      }
    } catch (err) {
      console.error("Error attaching MCP server to workspace:", err);
      setError(err instanceof Error ? err.message : "Failed to attach MCP server to workspace");
      throw err;
    }
  };

  // Initial fetch
  useEffect(() => {
    if (workspacePath) {
      fetchAttachedServers();
    }
  }, [workspacePath]);

  return {
    attachedServers,
    loading,
    error,
    fetchAttachedServers,
    attachMcpServer,
  };
} 