#!/usr/bin/env node

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  MCPOAuthClient,
  TokenResponseSchema,
  buildFormBody,
} from "./index";
import { makeHTTPRequest } from "./utils";

/* Simple color helper (same palette as auth CLI) */
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};
const c = (color: keyof typeof colors, txt: string) => `${colors[color]}${txt}${colors.reset}`;

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const resourceURL = args[0] || (await prompt("Enter MCP protected resource URL: "));
    const clientId = args[1] || (await prompt("Enter client_id: "));
    const refreshToken = args[2] || (await prompt("Enter refresh_token: "));
    const clientSecretIndex = args.findIndex((a) => a === "--client-secret");
    const clientSecret = clientSecretIndex !== -1 ? args[clientSecretIndex + 1] : undefined;

    console.log(c("bold", "\n=== Token Refresh ==="));

    // Create client for discovery helpers
    const client = new MCPOAuthClient({
      redirect_uri: "http://localhost/void",
      client_name: "Refresh CLI",
    });

    console.log(c("cyan", "Discovering protected resource metadata…"));
    const resourceMeta = await client.discoverProtectedResource(resourceURL);
    if (resourceMeta.authorization_servers.length === 0) {
      throw new Error("No authorization servers found for resource");
    }
    const authServerURL = resourceMeta.authorization_servers[0]!;

    console.log(c("cyan", "Discovering authorization server metadata…"));
    const authMeta = await client.discoverAuthorizationServer(authServerURL);

    if (!authMeta.token_endpoint) {
      throw new Error("Authorization server does not expose token endpoint");
    }

    console.log(c("cyan", "Sending refresh_token request…"));

    const body = buildFormBody({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      resource: resourceURL,
    });

    const response = await makeHTTPRequest<any>(authMeta.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const token = TokenResponseSchema.parse(response);

    console.log(c("green", "\n✅ Token refreshed successfully"));
    console.log("Access Token:", token.access_token);
    if (token.refresh_token) console.log("Refresh Token:", token.refresh_token);
    if (token.expires_in) console.log("Expires In:", `${token.expires_in} seconds`);
    if (token.scope) console.log("Scope:", token.scope);

    process.exit(0);
  } catch (err) {
    console.error(c("red", `\nToken refresh failed: ${err instanceof Error ? err.message : err}`));
    process.exit(1);
  }
}

main(); 