#!/usr/bin/env node

import readline from "node:readline/promises";
import http from "node:http";
import { stdin as input, stdout as output } from "node:process";
import { MCPOAuthClient, OAuthError, MCPDiscoveryError, AuthFlowContext } from "./index";

// ---- Fetch Logger ----
function setupFetchLogging() {
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const [input, init] = args;
    const method = init?.method || "GET";
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : "<Request>";

    console.log(colorize("cyan", `\n→ ${method} ${url}`));

    const res = await origFetch(...args);

    const cloned = res.clone();
    const ct = cloned.headers.get("content-type") || "";
    let bodyPreview: any = null;
    try {
      if (ct.includes("application/json")) {
        bodyPreview = await cloned.json();
      } else {
        bodyPreview = await cloned.text();
      }
    } catch (_) {
      bodyPreview = "<unreadable response body>";
    }

    console.log(colorize("magenta", `← ${res.status} ${res.statusText}`));
    console.log(bodyPreview);

    return res;
  }) as typeof fetch;
}

/* Simple color helper (avoids extra deps) */
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

function colorize(color: keyof typeof colors, text: string) {
  return `${colors[color]}${text}${colors.reset}`;
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

function logStep(title: string) {
  console.log("\n" + colorize("bold", `=== ${title} ===`));
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const manualMode = args.includes("--manual");
    const verbose = args.includes("--verbose") || args.includes("-v");
    const resourceURLArg = args.find((a) => !a.startsWith("--"));
    const resourceURL = resourceURLArg || (await prompt("Enter MCP protected resource URL: "));

    // Enable fetch logging
    setupFetchLogging();

    // Prepare redirect URI & optional local server
    let redirectURI = "http://localhost/callback";
    let callbackURLPromise: Promise<string> | undefined;

    if (!manualMode) {
      // Spin up temporary local HTTP server
      const server = http.createServer();

      // Promise resolves with the full callback URL once the server handles it
      callbackURLPromise = new Promise<string>((resolve) => {
        server.on("request", (req, res) => {
          const fullUrl = `http://localhost:${(server.address() as any).port}${req.url}`;

          res.writeHead(200, { "Content-Type": "text/html;charset=utf-8" });
          res.end("<html><body><h1>Authentication complete</h1><p>You can return to the terminal.</p></body></html>");

          resolve(fullUrl);
          server.close();
        });
      });

      // Start listening and wait until the port is assigned before continuing
      await new Promise<void>((ready) => {
        server.listen(0, "127.0.0.1", () => {
          const port = (server.address() as any).port;
          redirectURI = `http://localhost:${port}/callback`;
          console.log(`Listening for callback on ${redirectURI}`);
          ready();
        });
      });
    }

    // Basic client configuration with common development redirect URIs
    const client = new MCPOAuthClient({
      redirect_uris: [
        redirectURI,
        // Common development redirect URIs
        "http://localhost:3000/oauth/callback",
        "http://localhost:3001/oauth/callback", 
        "http://localhost:6274/oauth/callback", // MCP Inspector
        "http://localhost:8080/oauth/callback",
        "http://localhost:5173/oauth/callback", // Vite default
        "http://localhost:4173/oauth/callback", // Vite preview
      ],
      scope: "openid offline_access", // Ask for minimal scopes plus refresh.
      client_name: "MCPresso CLI Test App",
      client_uri: "https://github.com/granular-software/mcpresso-oauth-client",
    });

    // Optional: print state changes to give the user visibility into progress.
    if (verbose) {
      const stepMap: Record<string, string> = {
        discovering_metadata: "Metadata Discovery",
        registering_client: "Client Registration",
        preparing_authorization: "Preparing Authorization",
        awaiting_authorization: "Request Authorization (user consent)",
        exchanging_code: "Token Request",
        completed: "Authentication Complete",
        error: "Error",
      };

      client.on("state_change", ({ state }: { state: string; context: AuthFlowContext }) => {
        const stepName = stepMap[state] || state;
        console.log(colorize("bold", `\n--- ${stepName} ---`));
        console.log(colorize("magenta", ` ↪ state: ${state}`));
      });
    }

    client.on("error", ({ error }: { error: OAuthError | MCPDiscoveryError }) => {
      console.error(colorize("red", `Error: ${error.message}`));
    });

    logStep("Metadata Discovery, Client Registration & Authorization Preparation");
    const authURL = await client.startAuthFlow(resourceURL);

    console.log("\n" + colorize("cyan", "Open the following URL in your browser to authorize the application:\n"));
    console.log(colorize("yellow", authURL) + "\n");

    let callbackURL: string;
    if (manualMode) {
      console.log("After completing authorization, paste the full callback URL below.\n");
      callbackURL = await prompt("Paste the full callback URL: ");
    } else {
      console.log(colorize("cyan", "Waiting for OAuth server to redirect back…\n"));
      if (!callbackURLPromise) {
        throw new Error("Callback promise not initialized");
      }
      callbackURL = await callbackURLPromise; // Resolved by HTTP listener
      console.log(colorize("green", "Received callback!"));
    }

    logStep("Exchanging Authorization Code for Tokens");
    const token = await client.handleCallback(callbackURL);

    logStep("Authentication Complete");
    console.log("Access Token:", token.access_token);
    if (token.refresh_token) {
      console.log("Refresh Token:", token.refresh_token);
    }
    if (token.expires_at) {
      const expiresInSec = token.expires_at - Math.floor(Date.now() / 1000);
      console.log(`Expires in: ${Math.round(expiresInSec / 60)} minutes`);
    }

    console.log("\n" + colorize("green", "✅ OAuth flow finished successfully"));

    process.exit(0);
  } catch (err) {
    console.error("\n" + colorize("red", `Authentication failed: ${err instanceof Error ? err.message : err}`));
    process.exit(1);
  }
}

main(); 