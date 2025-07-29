"use client";

import { useState, useEffect } from "react";
import { api } from "awmt-sdk";
import type { Model, QueryPromiseChain, MutationPromiseChain } from "awmt-sdk/api/schema";

interface McpServer {
  path: string | null;
  label: string | null;
  description: string | null;
}

export function useMcpServers() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch MCP servers
  const fetchServers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the mcp_server model and its instances
      const serverModel = await (api.chain.query as QueryPromiseChain)
        .model({ path: "mcp_server" })
        .execute({
          path: true,
          label: true,
          description: true,
          direct_instances: {
            path: true,
            label: true,
            description: true,
          },
        });

      if (serverModel?.direct_instances) {
        let serverInstances = serverModel.direct_instances.map((instance: Model) => ({
          path: instance.path,
          label: instance.label,
          description: instance.description,
        }));

        // Provide a mock MCP server when none are found to allow local testing
        if (serverInstances.length === 0) {
          serverInstances = [
            {
              path: "mock-server-1",
              label: "Mock MCP Server",
              description: "Mock server with sample tools and resources",
            },
          ];
        }

        setServers(serverInstances);
      } else {
        // No server instances found, so add a mock server for development/testing.
        setServers([
          {
            path: "mock-server-1",
            label: "Mock MCP Server",
            description: "Mock server with sample tools and resources",
          },
        ]);
      }
    } catch (err) {
      console.error("Error fetching MCP servers:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch MCP servers");
    } finally {
      setLoading(false);
    }
  };

  // Create a new MCP server
  const createMcpServer = async (name: string, url: string) => {
    try {
      setError(null);

      // Create the MCP server instance
      const result = await (api.chain.mutation as MutationPromiseChain)
        .at({ path: "mcp_server" })
        .instantiate({ label: name })
        .execute({
          model: {
            path: true,
            label: true,
            description: true,
          },
        });

      if (result?.model) {
        const newServer: McpServer = {
          path: result.model.path,
          label: result.model.label,
          description: result.model.description,
        };

        // Set the URL for the server
        if (result.model.path) {
          await (api.chain.mutation as MutationPromiseChain)
            .at({ path: result.model.path + ":url" })
            .set_string_value({ value: url })
            .execute({
              model: {
                path: true,
              },
            });
        }

        // Add the new server to the list
        setServers((prev) => [...prev, newServer]);
        return newServer;
      } else {
        throw new Error("Failed to create MCP server");
      }
    } catch (err) {
      console.error("Error creating MCP server:", err);
      setError(err instanceof Error ? err.message : "Failed to create MCP server");
      throw err;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchServers();
  }, []);

  return {
    servers,
    loading,
    error,
    fetchServers,
    createMcpServer,
  };
} 