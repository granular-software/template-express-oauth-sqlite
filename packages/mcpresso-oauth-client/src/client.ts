import { OAuthClientConfig, AuthFlowContext, OAuthFlowState, AuthorizationServerMetadata, AuthorizationServerMetadataSchema, ProtectedResourceMetadata, ProtectedResourceMetadataSchema, TokenResponse, TokenResponseSchema, StoredToken, PKCEChallenge, PKCEMethod, TokenStorage, ClientRegistrationRequest, ClientRegistrationResponse, ClientRegistrationResponseSchema, OAuthError, MCPDiscoveryError, AuthEventMap, AuthEventListener } from "./types";

import { createPKCEChallenge, buildAuthorizationURL, parseCallbackURL, generateState, calculateExpiryTime, isTokenExpired, makeHTTPRequest, buildFormBody, getOAuthDiscoveryURL, getProtectedResourceMetadataURL, validateState } from "./utils";

import { createDefaultTokenStorage } from "./storage";

export class MCPOAuthClient {
	private config: OAuthClientConfig & {
		pkce_method: PKCEMethod;
		discovery_timeout: number;
		token_storage: TokenStorage;
		client_name: string;
	};
	private flowContexts = new Map<string, AuthFlowContext>();
	private eventListeners = new Map<keyof AuthEventMap, Set<AuthEventListener<any>>>();

	constructor(config: OAuthClientConfig) {
		this.config = {
			pkce_method: "S256",
			discovery_timeout: 30000,
			token_storage: createDefaultTokenStorage(),
			...config,
		};
	}

	// ===== Event Management =====

	on<T extends keyof AuthEventMap>(event: T, listener: AuthEventListener<T>): void {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, new Set());
		}
		this.eventListeners.get(event)!.add(listener);
	}

	off<T extends keyof AuthEventMap>(event: T, listener: AuthEventListener<T>): void {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			listeners.delete(listener);
		}
	}

	private emit<T extends keyof AuthEventMap>(event: T, data: AuthEventMap[T]): void {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			listeners.forEach((listener) => {
				try {
					listener(data);
				} catch (error) {
					console.error(`Error in ${event} listener:`, error);
				}
			});
		}
	}

	// ===== Flow State Management =====

	private updateFlowState(resourceURL: string, updates: Partial<AuthFlowContext>): void {
		const existing = this.flowContexts.get(resourceURL) || {
			resource_url: resourceURL,
			state: "idle" as OAuthFlowState,
		};

		const context = { ...existing, ...updates };
		this.flowContexts.set(resourceURL, context);

		this.emit("state_change", { state: context.state, context });
	}

	getFlowContext(resourceURL: string): AuthFlowContext | null {
		return this.flowContexts.get(resourceURL) || null;
	}

	// ===== Core OAuth Flow =====

	/**
	 * Initiates OAuth flow for a MCP resource
	 * Returns authorization URL that user should visit
	 */
	async startAuthFlow(resourceURL: string): Promise<string> {
		try {
			this.updateFlowState(resourceURL, {
				state: "discovering_metadata",
				error: undefined,
			});

			// Step 1: Discovery - Get protected resource metadata
			const resourceMetadata = await this.discoverProtectedResource(resourceURL);

			if (resourceMetadata.authorization_servers.length === 0) {
				throw new MCPDiscoveryError("No authorization servers found", resourceURL);
			}

			// Use first authorization server (could be configurable)
			if (resourceMetadata.authorization_servers.length === 0) {
				throw new MCPDiscoveryError("No authorization servers found", resourceURL);
			}

			const authServerURL = resourceMetadata.authorization_servers[0]!;

			// Step 2: Get authorization server metadata
			const authServerMetadata = await this.discoverAuthorizationServer(authServerURL);

			// Step 3: Use fixed client credentials or register client via DCR
			let clientId: string;
			let clientSecret: string | undefined;
			let registeredClient: ClientRegistrationResponse;

			if (this.config.client_id) {
				// Use fixed client credentials
				clientId = this.config.client_id;
				clientSecret = this.config.client_secret;
				registeredClient = {
					client_id: clientId,
					client_secret: clientSecret,
					client_id_issued_at: Math.floor(Date.now() / 1000),
					client_secret_expires_at: 0,
					redirect_uris: [this.config.redirect_uri],
					client_name: this.config.client_name,
					client_uri: this.config.client_uri,
					scope: this.config.scope,
					grant_types: ["authorization_code", "refresh_token"],
					response_types: ["code"],
					token_endpoint_auth_method: "none"
				};
			} else {
				// Use dynamic client registration
				if (!authServerMetadata.registration_endpoint) {
					throw new MCPDiscoveryError("Server does not support Dynamic Client Registration", resourceURL);
				}

				this.updateFlowState(resourceURL, {
					state: "registering_client",
					authorization_server: authServerURL,
				});

				registeredClient = await this.registerClient(authServerMetadata.registration_endpoint);
				clientId = registeredClient.client_id;
				clientSecret = registeredClient.client_secret;
			}

			this.updateFlowState(resourceURL, {
				state: "preparing_authorization",
				authorization_server: authServerURL,
				registered_client: registeredClient,
			});

			// Step 4: Generate PKCE challenge
			const pkce = createPKCEChallenge(this.config.pkce_method);
			const state = generateState();

			// Step 5: Build authorization URL
			const authURL = buildAuthorizationURL(authServerMetadata.authorization_endpoint, {
				response_type: "code",
				client_id: clientId,
				redirect_uri: this.config.redirect_uri,
				scope: this.config.scope,
				state,
				resource: resourceURL,
				code_challenge: pkce.code_challenge,
				code_challenge_method: pkce.code_challenge_method,
			});

			this.updateFlowState(resourceURL, {
				state: "awaiting_authorization",
				authorization_url: authURL,
				pkce,
			});

			// Store state for callback validation
			this.storeFlowState(resourceURL, state);

			return authURL;
		} catch (error) {
			const oauthError = error instanceof OAuthError || error instanceof MCPDiscoveryError ? error : new OAuthError("discovery_failed", error instanceof Error ? error.message : "Unknown error");

			this.updateFlowState(resourceURL, {
				state: "error",
				error: oauthError.message,
			});

			this.emit("error", { error: oauthError });
			throw oauthError;
		}
	}

	/**
	 * Handles OAuth callback and exchanges code for tokens
	 */
	async handleCallback(callbackURL: string): Promise<StoredToken> {
		const params = parseCallbackURL(callbackURL);

		if (params.error) {
			const error = new OAuthError(params.error, params.error_description, undefined, params.state);
			this.emit("error", { error });
			throw error;
		}

		if (!params.code) {
			console.log("URL PARAMS", params);
			const error = new OAuthError("invalid_request", "Missing code parameter");
			this.emit("error", { error });
			throw error;
		}

		// Resolve the flow context. Prefer state-based lookup, but gracefully
		// fall back to the single awaiting-authorization flow if the server did
		// not echo the state parameter.
		let resourceURL: string | null = null;
		let context: AuthFlowContext | null = null;

		if (params.state) {
			({ resourceURL, context } = this.findFlowByState(params.state));
		}

		if (!context) {
			// Try to find exactly one flow that is awaiting authorization.  If more
			// than one matches we can’t safely decide which one to use.
			const awaiting = Array.from(this.flowContexts.entries()).filter(([, ctx]) => ctx.state === "awaiting_authorization");
			if (awaiting.length === 1) {
				const [url, ctx] = awaiting[0]!; // guaranteed by length check
				resourceURL = url;
				context = ctx;
			}
		}

		if (!context || !resourceURL) {
			const error = new OAuthError("invalid_state", "No matching flow found for callback");
			this.emit("error", { error });
			throw error;
		}

		// From here on resourceURL is definitely defined
		const resURL = resourceURL as string;

		try {
			this.updateFlowState(resURL, {
				state: "exchanging_code",
				code: params.code,
			});

			if (!context.authorization_server || !context.pkce) {
				throw new OAuthError("invalid_state", "Missing authorization server or PKCE data");
			}

			// Get authorization server metadata again
			const authServerMetadata = await this.discoverAuthorizationServer(context.authorization_server!);

			// Get client credentials from registered client
			const clientId = context.registered_client?.client_id;
			const clientSecret = context.registered_client?.client_secret;

			if (!clientId) {
				throw new OAuthError("invalid_state", "No registered client found");
			}

			// Exchange code for tokens
			const tokenResponse = await this.exchangeCodeForTokens(authServerMetadata.token_endpoint, params.code, context.pkce.code_verifier, resURL, clientId, clientSecret);

			// Store token
			const storedToken: StoredToken = {
				access_token: tokenResponse.access_token,
				token_type: tokenResponse.token_type,
				expires_at: calculateExpiryTime(tokenResponse.expires_in),
				refresh_token: tokenResponse.refresh_token,
				scope: tokenResponse.scope,
				resource: resURL,
				created_at: Math.floor(Date.now() / 1000),
			};

			await this.config.token_storage.setToken(resURL, storedToken);

			// Clean up persisted state (remove any key that matches this flow)
			if (typeof window !== "undefined" && window.localStorage) {
				try {
					const keys = Object.keys(window.localStorage);
					keys.forEach((k) => {
						if (k.startsWith("mcpresso_oauth_state_")) {
							const val = window.localStorage.getItem(k);
							if (val && JSON.parse(val).resource_url === resURL) {
								window.localStorage.removeItem(k);
							}
						}
					});
				} catch (_) {}
			}

			this.updateFlowState(resURL, {
				state: "completed",
				token: storedToken,
			});

			this.emit("token_updated", { resource: resURL, token: storedToken });

			return storedToken;
		} catch (error) {
			const oauthError = error instanceof OAuthError ? error : new OAuthError("token_exchange_failed", error instanceof Error ? error.message : "Unknown error");

			this.updateFlowState(resURL, {
				state: "error",
				error: oauthError.message,
			});

			// Clean up persisted state on error as well
			if (typeof window !== "undefined" && window.localStorage) {
				try {
					const keys = Object.keys(window.localStorage);
					keys.forEach((k) => {
						if (k.startsWith("mcpresso_oauth_state_")) {
							const val = window.localStorage.getItem(k);
							if (val && JSON.parse(val).resource_url === resURL) {
								window.localStorage.removeItem(k);
							}
						}
					});
				} catch (_) {}
			}

			this.emit("error", { error: oauthError });
			throw oauthError;
		}
	}

	// ===== Token Management =====

	/**
	 * Gets valid access token for resource, refreshing if needed
	 */
	async getAccessToken(resourceURL: string): Promise<string | null> {
		const token = await this.config.token_storage.getToken(resourceURL);

		if (!token) {
			return null;
		}

		// Check if token is expired
		if (isTokenExpired(token.expires_at)) {
			if (token.refresh_token) {
				try {
					const refreshedToken = await this.refreshToken(resourceURL, token.refresh_token);
					return refreshedToken.access_token;
				} catch (error) {
					// Refresh failed, remove invalid token
					await this.removeToken(resourceURL);
					return null;
				}
			} else {
				// No refresh token, remove expired token
				await this.removeToken(resourceURL);
				return null;
			}
		}

		return token.access_token;
	}

	/**
	 * Checks if we have a valid token for a resource
	 */
	async hasValidToken(resourceURL: string): Promise<boolean> {
		const token = await this.getAccessToken(resourceURL);
		return token !== null;
	}

	/**
	 * Removes stored token for a resource
	 */
	async removeToken(resourceURL: string): Promise<void> {
		await this.config.token_storage.removeToken(resourceURL);
		this.emit("token_removed", { resource: resourceURL });
	}

	/**
	 * Clears all stored tokens
	 */
	async clearAllTokens(): Promise<void> {
		await this.config.token_storage.clear();
	}

	// ===== Discovery Methods =====

	/**
	 * Public: Fetches the protected-resource metadata (step 1 of the flow).
	 * Exposed mainly for demo / debugging so that callers can run the flow
	 * interactively. Production apps should keep using startAuthFlow().
	 */
	async discoverProtectedResource(resourceURL: string): Promise<ProtectedResourceMetadata> {
		const metadataURL = getProtectedResourceMetadataURL(resourceURL);

		try {
			const metadata = await makeHTTPRequest<any>(metadataURL, {
				signal: AbortSignal.timeout(this.config.discovery_timeout),
			});

			return ProtectedResourceMetadataSchema.parse(metadata);
		} catch (error) {
			throw new MCPDiscoveryError(`Failed to fetch protected resource metadata: ${error instanceof Error ? error.message : "Unknown error"}`, resourceURL);
		}
	}

	/**
	 * Public: Fetches the OAuth authorization-server metadata (step 1b).
	 */
	async discoverAuthorizationServer(issuerURL: string): Promise<AuthorizationServerMetadata> {
		const discoveryURL = getOAuthDiscoveryURL(issuerURL);

		try {
			const metadata = await makeHTTPRequest<any>(discoveryURL, {
				signal: AbortSignal.timeout(this.config.discovery_timeout),
			});

			return AuthorizationServerMetadataSchema.parse(metadata);
		} catch (error) {
			throw new OAuthError("discovery_failed", `Failed to fetch authorization server metadata: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}

	// ===== Token Exchange Methods =====

	private async exchangeCodeForTokens(tokenEndpoint: string, code: string, codeVerifier: string, resourceURL: string, clientId: string, clientSecret?: string): Promise<TokenResponse> {
		const body = buildFormBody({
			grant_type: "authorization_code",
			client_id: clientId,
			client_secret: clientSecret,
			code,
			redirect_uri: this.config.redirect_uri,
			code_verifier: codeVerifier,
			resource: resourceURL,
		});

		try {
			const response = await makeHTTPRequest<any>(tokenEndpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body,
			});

			return TokenResponseSchema.parse(response);
		} catch (error) {
			throw new OAuthError("token_exchange_failed", error instanceof Error ? error.message : "Unknown error");
		}
	}

	private async refreshToken(resourceURL: string, refreshToken: string): Promise<StoredToken> {
		// First get authorization server for this resource
		const existingToken = await this.config.token_storage.getToken(resourceURL);
		if (!existingToken) {
			throw new OAuthError("invalid_token", "No existing token found");
		}

		// Discover the authorization server again
		const resourceMetadata = await this.discoverProtectedResource(resourceURL);

		if (resourceMetadata.authorization_servers.length === 0) {
			throw new OAuthError("invalid_token", "No authorization servers found for resource");
		}

		const authServerMetadata = await this.discoverAuthorizationServer(resourceMetadata.authorization_servers[0]!);

		// Get stored token context to find registered client info
		const context = this.flowContexts.get(resourceURL);
		const clientId = context?.registered_client?.client_id;
		const clientSecret = context?.registered_client?.client_secret;

		if (!clientId) {
			throw new OAuthError("invalid_token", "No registered client found for refresh");
		}

		const body = buildFormBody({
			grant_type: "refresh_token",
			client_id: clientId,
			client_secret: clientSecret,
			refresh_token: refreshToken,
			resource: resourceURL,
		});

		try {
			const response = await makeHTTPRequest<any>(authServerMetadata.token_endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body,
			});

			const tokenResponse = TokenResponseSchema.parse(response);

			const newToken: StoredToken = {
				access_token: tokenResponse.access_token,
				token_type: tokenResponse.token_type,
				expires_at: calculateExpiryTime(tokenResponse.expires_in),
				refresh_token: tokenResponse.refresh_token || refreshToken, // Keep old refresh token if none provided
				scope: tokenResponse.scope || existingToken.scope,
				resource: resourceURL,
				created_at: Math.floor(Date.now() / 1000),
			};

			await this.config.token_storage.setToken(resourceURL, newToken);
			this.emit("token_updated", { resource: resourceURL, token: newToken });

			return newToken;
		} catch (error) {
			throw new OAuthError("refresh_failed", error instanceof Error ? error.message : "Unknown error");
		}
	}

	// ===== Dynamic Client Registration =====

	/**
	 * Public: Performs Dynamic Client Registration (step 2).
	 */
	async registerClient(registrationEndpoint: string): Promise<ClientRegistrationResponse> {
		const registrationRequest: ClientRegistrationRequest = {
			redirect_uris: [this.config.redirect_uri],
			token_endpoint_auth_method: "none", // Public client (PKCE)
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
			client_name: this.config.client_name,
			client_uri: this.config.client_uri,
			scope: this.config.scope,
		};

		try {
			const response = await makeHTTPRequest<any>(registrationEndpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(registrationRequest),
			});

			return ClientRegistrationResponseSchema.parse(response);
		} catch (error) {
			throw new OAuthError("client_registration_failed", `Failed to register client: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}

	// ===== Helper Methods =====

	private storeFlowState(resourceURL: string, state: string): void {
		// In a real implementation, you might want to store this more securely
		// For now, we'll use a simple mapping
		const context = this.flowContexts.get(resourceURL);
		if (context) {
			context.state = "awaiting_authorization";
			// Add state to context for validation
			(context as any)._oauth_state = state;

			// Persist minimal context across page reloads so that the callback can be
			// processed even after navigating away to the OAuth server. We purposely
			// only store the pieces of information required for the token exchange.
			try {
				const persisted: Partial<AuthFlowContext> = {
					resource_url: resourceURL,
					state: "awaiting_authorization",
					authorization_server: context.authorization_server,
					pkce: context.pkce,
					registered_client: context.registered_client,
				};
				if (typeof window !== "undefined" && window.localStorage) {
					window.localStorage.setItem(`mcpresso_oauth_state_${state}`, JSON.stringify(persisted));
				}
			} catch (e) {
				// Fail silently; persistence is best-effort only.
			}
		}
	}

	private findFlowByState(state: string): { resourceURL: string; context: AuthFlowContext } | { resourceURL: null; context: null } {
		for (const [resourceURL, context] of this.flowContexts.entries()) {
			if ((context as any)._oauth_state === state) {
				return { resourceURL, context };
			}
		}
		// No in-memory context found; attempt to restore from localStorage
		if (typeof window !== "undefined" && window.localStorage) {
			try {
				const stored = window.localStorage.getItem(`mcpresso_oauth_state_${state}`);
				if (stored) {
					const parsed: AuthFlowContext = JSON.parse(stored);
					if (parsed && parsed.resource_url) {
						// Re-hydrate into memory for future use
						this.flowContexts.set(parsed.resource_url, parsed);
						return { resourceURL: parsed.resource_url, context: parsed };
					}
				}
			} catch (e) {
				// Ignore JSON parse errors or storage access issues
			}
		}

		return { resourceURL: null, context: null };
	}
}
