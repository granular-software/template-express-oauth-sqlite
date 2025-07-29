import express from "express";
import { api } from "awmt-sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { QueryPromiseChain, ModelRequest } from "awmt-sdk/api/schema";
import { z } from "zod";
import {
  ListToolsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

const app = express();
app.use(express.json());

// Helper function to check if request is JSON-RPC
const isJsonRpcRequest = (req: any) => {
  return req.body.jsonrpc === "2.0" && req.body.id !== undefined;
};

// Helper function to send JSON-RPC response
const sendJsonRpcResponse = (res: any, id: any, result?: any, error?: any) => {
  const response: any = {
    jsonrpc: "2.0",
    id: id
  };
  
  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }
  
  return res.json(response);
};

// Helper function to send error response
const sendErrorResponse = (res: any, req: any, statusCode: number, message: string, code?: number) => {
  if (isJsonRpcRequest(req)) {
    return sendJsonRpcResponse(res, req.body.id, undefined, {
      code: code || -32603,
      message: message
    });
  } else {
    return res.status(statusCode).json({ error: message });
  }
};

app.all("/mcp/:workspace_id", async (req, res) => {
  try {
    const { workspace_id } = req.params;
    console.log("MCP Middleware request received for workspace:", workspace_id);
    
    // 1. Lookup attached MCP servers for this workspace
    const workspace = await (api.chain.query as QueryPromiseChain)
      .model({ path: workspace_id + ":mcp_servers" })
      .execute({
        submodels: {
          reference: {
            path: true,
            string_value: [{ path: "url" }],
          },
        },
      } as ModelRequest);

    const servers = workspace?.submodels
      ?.map((submodel) => ({
        id: submodel.reference?.path,
        url: submodel.reference?.string_value,
      }))
      .filter((s) => s.url);

    console.log("Servers:", JSON.stringify(servers, null, 2));

    if (!servers || servers.length === 0) {
      return sendErrorResponse(res, req, 404, "No MCP servers attached to this workspace", -32601);
    }

    const { method, params } = req.body;
    if (!method) {
      return sendErrorResponse(res, req, 400, "Missing MCP method", -32600);
    }

    console.log("Method:", method);
    console.log("Params:", params);

    // MCP Lifecycle: initialize
    if (method === "initialize") {
      const InitializeResultSchema = z.any();
      for (const server of servers) {
        try {
          if (!server.url) continue;
          const client = new Client({ name: "awmt-mcp-middleware", version: "1.0.0" });
          const transport = new StreamableHTTPClientTransport(new URL(server.url as string));
          await client.connect(transport);
          const result = await (client.request as any)(
            { method: "initialize", params: params || {} },
            InitializeResultSchema
          );
          await transport.close();
          
          if (isJsonRpcRequest(req)) {
            return sendJsonRpcResponse(res, req.body.id, result);
          } else {
            return res.json(result);
          }
        } catch (err) {
          console.warn(`Error initializing server ${server.id}:`, err);
        }
      }
      return sendErrorResponse(res, req, 500, "Failed to initialize any MCP server", -32603);
    }

    // MCP Lifecycle: notifications/initialized
    if (method === "notifications/initialized") {
      if (isJsonRpcRequest(req)) {
        return sendJsonRpcResponse(res, req.body.id, { result: "ok" });
      } else {
        return res.status(200).json({ result: "ok" });
      }
    }

    // MCP Lifecycle: shutdown
    if (method === "shutdown") {
      if (isJsonRpcRequest(req)) {
        return sendJsonRpcResponse(res, req.body.id, { result: "ok" });
      } else {
        return res.status(200).json({ result: "ok" });
      }
    }

    // tools/list
    if (method === "tools/list") {
      const allTools: any[] = [];
      for (const server of servers) {
        try {
          if (!server.url) continue;
          const client = new Client({ name: "awmt-mcp-middleware", version: "1.0.0" });
          const transport = new StreamableHTTPClientTransport(new URL(server.url as string));
          await client.connect(transport);
          const result = await (client.request as any)(
            { method: "tools/list", params: {} },
            ListToolsResultSchema
          );
          if (Array.isArray(result?.tools)) allTools.push(...result.tools);
          await transport.close();
        } catch (err) {
          console.warn(`Error fetching tools from server ${server.id}:`, err);
        }
      }
      
      const response = { tools: allTools };
      if (isJsonRpcRequest(req)) {
        return sendJsonRpcResponse(res, req.body.id, response);
      } else {
        return res.json(response);
      }
    }

    // resources/list
    if (method === "resources/list") {
      const allResources: any[] = [];
      for (const server of servers) {
        try {
          if (!server.url) continue;
          const client = new Client({ name: "awmt-mcp-middleware", version: "1.0.0" });
          const transport = new StreamableHTTPClientTransport(new URL(server.url as string));
          await client.connect(transport);
          const result = await (client.request as any)(
            { method: "resources/list", params: {} },
            ListResourcesResultSchema
          );
          if (Array.isArray(result?.resources)) allResources.push(...result.resources);
          await transport.close();
        } catch (err) {
          console.warn(`Error fetching resources from server ${server.id}:`, err);
        }
      }
      
      const response = { resources: allResources };
      if (isJsonRpcRequest(req)) {
        return sendJsonRpcResponse(res, req.body.id, response);
      } else {
        return res.json(response);
      }
    }

    // resources/templates/list
    if (method === "resources/templates/list") {
      const allTemplates: any[] = [];
      for (const server of servers) {
        try {
          if (!server.url) continue;
          const client = new Client({ name: "awmt-mcp-middleware", version: "1.0.0" });
          const transport = new StreamableHTTPClientTransport(new URL(server.url as string));
          await client.connect(transport);
          const result = await (client.request as any)(
            { method: "resources/templates/list", params: {} },
            ListResourceTemplatesResultSchema
          );
          if (Array.isArray(result?.resourceTemplates)) allTemplates.push(...result.resourceTemplates);
          await transport.close();
        } catch (err) {
          console.warn(`Error fetching templates from server ${server.id}:`, err);
        }
      }
      
      const response = { resourceTemplates: allTemplates };
      if (isJsonRpcRequest(req)) {
        return sendJsonRpcResponse(res, req.body.id, response);
      } else {
        return res.json(response);
      }
    }

    // resources/read
    if (method === "resources/read") {
      const { uri } = params || {};
      if (!uri) {
        return sendErrorResponse(res, req, 400, "Missing 'uri' parameter for resources/read", -32602);
      }

      for (const server of servers) {
        try {
          if (!server.url) continue;
          const client = new Client({ name: "awmt-mcp-middleware", version: "1.0.0" });
          const transport = new StreamableHTTPClientTransport(new URL(server.url as string));
          await client.connect(transport);
          const result = await (client.request as any)(
            { method: "resources/read", params: { uri } },
            z.any()
          );
          await transport.close();
          
          if (isJsonRpcRequest(req)) {
            return sendJsonRpcResponse(res, req.body.id, result);
          } else {
            return res.json(result);
          }
        } catch (err) {
          console.warn(`Error reading resource from server ${server.id}:`, err);
        }
      }
      return sendErrorResponse(res, req, 404, `Resource not found: ${uri}`, -32601);
    }

    // prompts/list
    if (method === "prompts/list") {
      const allPrompts: any[] = [];
      for (const server of servers) {
        try {
          if (!server.url) continue;
          const client = new Client({ name: "awmt-mcp-middleware", version: "1.0.0" });
          const transport = new StreamableHTTPClientTransport(new URL(server.url as string));
          await client.connect(transport);
          const result = await (client.request as any)(
            { method: "prompts/list", params: {} },
            z.any()
          );
          if (Array.isArray(result?.prompts)) allPrompts.push(...result.prompts);
          await transport.close();
        } catch (err) {
          console.warn(`Error fetching prompts from server ${server.id}:`, err);
        }
      }
      
      const response = { prompts: allPrompts };
      if (isJsonRpcRequest(req)) {
        return sendJsonRpcResponse(res, req.body.id, response);
      } else {
        return res.json(response);
      }
    }

    // tools/call
    if (method === "tools/call") {
      const { name, arguments: toolArgs } = params || {};
      if (!name) {
        return sendErrorResponse(res, req, 400, "Missing 'name' parameter for tools/call", -32602);
      }

      for (const server of servers) {
        try {
          if (!server.url) continue;
          const client = new Client({ name: "awmt-mcp-middleware", version: "1.0.0" });
          const transport = new StreamableHTTPClientTransport(new URL(server.url as string));
          await client.connect(transport);
          const result = await (client.request as any)(
            { method: "tools/call", params: { name, arguments: toolArgs || {} } },
            z.any()
          );
          await transport.close();
          
          if (isJsonRpcRequest(req)) {
            return sendJsonRpcResponse(res, req.body.id, result);
          } else {
            return res.json(result);
          }
        } catch (err) {
          console.warn(`Error calling tool from server ${server.id}:`, err);
        }
      }
      return sendErrorResponse(res, req, 404, `Tool not found: ${name}`, -32601);
    }

    // ping
    if (method === "ping") {
      const response = { pong: true };
      if (isJsonRpcRequest(req)) {
        return sendJsonRpcResponse(res, req.body.id, response);
      } else {
        return res.json(response);
      }
    }

    // Add more MCP methods as needed...

    // Default: not supported
    return sendErrorResponse(res, req, 400, `MCP method '${method}' not supported by middleware`, -32601);
  } catch (error: any) {
    console.error("MCP Middleware error:", error);
    return sendErrorResponse(res, req, 500, error?.message || "Internal error", -32603);
  }
});

const PORT = 3099;
app.listen(PORT, () => {
  console.log(`MCP Middleware server running on http://localhost:${PORT}`);
}); 