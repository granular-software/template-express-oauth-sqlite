import { z } from "zod";
import { createMCPServer } from "mcpresso";
import { oauthConfig } from "./auth/oauth.js";

// Import your resources
import { exampleResource } from "./resources/example.js";

// Resolve the canonical base URL of this server for both dev and production.
const BASE_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;

// Create the MCP server (Express version)
const expressApp = createMCPServer({
  name: "{{PROJECT_NAME}}",
  serverUrl: BASE_URL,
  resources: [exampleResource],
  auth: oauthConfig,
  exposeTypes: true,
  serverMetadata: {
    name: "{{PROJECT_NAME}}",
    version: "1.0.0",
    description: "{{PROJECT_DESCRIPTION}}",
    url: process.env.SERVER_URL || "https://your-server.com",
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
    capabilities: {
      authentication: true,
      rateLimiting: false,
      retries: true,
      streaming: true,
    },
  },
});

// Health check endpoint
expressApp.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Export for Node.js
export default expressApp;

// Local development server
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = process.env.PORT || 3000;
  console.log("Starting mcpresso server on port " + port);
  console.log("MCP Inspector URL: http://localhost:" + port);
  
  expressApp.listen(port, () => {
    console.log("Server running on http://localhost:" + port);
  });
} 