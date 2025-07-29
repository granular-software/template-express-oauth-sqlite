import { z } from "zod";
import { createResource, createMCPServer } from "mcpresso";
import { serve } from "@hono/node-server";

// Import your resources
import { exampleResource } from "./resources/example.js";

// Create the MCP server (Express version)
const expressApp = createMCPServer({
  name: "test-vercel-mcp",
  serverUrl: process.env.SERVER_URL || "https://your-vercel-app.vercel.app",
  resources: [exampleResource],
  exposeTypes: true,
  serverMetadata: {
    name: "test-vercel-mcp",
    version: "1.0.0",
    description: "A mcpresso MCP server",
    url: process.env.SERVER_URL || "https://your-vercel-app.vercel.app",
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
    capabilities: {
      authentication: false,
      rateLimiting: false,
      retries: true,
      streaming: true,
    },
  },
});

// Convert Express app to Hono for Vercel
const app = serve({
  fetch: expressApp,
});

// Export for Vercel Functions
export default app;

// Local development server
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = process.env.PORT || 3000;
  console.log("Starting mcpresso server on port " + port);
  console.log("MCP Inspector URL: http://localhost:" + port);
  
  expressApp.listen(port, () => {
    console.log("Server running on http://localhost:" + port);
  });
}