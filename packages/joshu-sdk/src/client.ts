import { ConnectionState, FieldDefinition, OsDocument } from '@joshu/os-types';
import * as Automerge from '@automerge/automerge';
import WebSocket from 'ws';

export type WebSocketOperations =
	| {
			type: 'join_session';
			sessionId: string;
			mode: string;
	  }
	| {
			type: 'user_message';
			message: string;
	  }
	| {
			type: 'open_app';
			app_name: string;
	  }
	| {
			type: 'pause';
	  }
	| {
			type: 'resume';
	  }
	| {
			type: 'click_link';
			window_id: string;
			router_path: string;
	  }
	| {
			type: 'start_action';
			window_id: string;
			router_path: string;
			action_path: string;
	  }
	| {
			type: 'fill_fields';
			action_id: string;
			fields: FieldDefinition[];
	  }
	| {
			type: 'apply_action';
			action_id: string;
	  }
	| {
			type: 'close_window';
			window_id: string;
	  }
	| {
			type: 'sync';
			clientState: Uint8Array;
	  }
	| {
			type: 'save_snapshot';
	  }
	| {
			type: 'load_snapshot';
			targetSessionId: string;
	  }
	| {
			type: 'relationship_choice';
			report: import('@joshu/os-types').RelationshipChoiceReport;
	  }
	| {
			type: 'action_choice';
			report: import('@joshu/os-types').ActionChoiceReport;
	  }
	| {
			type: 'permission_request';
			report: import('@joshu/os-types').PermissionRequest;
	  }
	| {
			type: 'action_approval';
			report: import('@joshu/os-types').ActionApprovalRequest;
	  }
	| {
			type: 'prerequisite';
			report: import('@joshu/os-types').Prerequisite;
	  }
	| {
			type: 'background_job';
			report: import('@joshu/os-types').BackgroundJobReport;
	  };

// Define the WebSocket connection state
type UpdateCallback = (doc: OsDocument | null) => void;

export interface ClientOptions {
	url?: string;
	reconnectAttempts?: number;
	reconnectDelay?: number;
}

export class JoshuClient {
	private ws: WebSocket | null = null;
	private sessionId: string | null = null;
	private doc: OsDocument | null = null;
	private connectionState: ConnectionState = 'disconnected';
	private updateCallbacks: Set<UpdateCallback> = new Set();
	private reconnectAttempts = 0;
	private maxReconnectAttempts: number;
	private reconnectTimeout: NodeJS.Timeout | null = null;
	private reconnectDelay: number;
	private url: string;

	constructor(options: ClientOptions = {}) {
		this.url = options.url || 'ws://localhost:3002';
		this.maxReconnectAttempts = options.reconnectAttempts || 5;
		this.reconnectDelay = options.reconnectDelay || 1000;
	}

	// Connect to the WebSocket server
	async connect(sessionId?: string, options: { mode?: 'desktop' } = {}): Promise<string> {
		return new Promise((resolve, reject) => {
			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				resolve(this.sessionId!);
				return;
			}

			this.connectionState = 'connecting';
			this.ws = new WebSocket(this.url);

			this.ws.onopen = () => {
				console.log('Connected to JOSHU OS WebSocket server');

				// Join or create a session
				this.ws!.send(
					JSON.stringify({
						type: 'join_session',
						sessionId,
						...options,
					} as WebSocketOperations),
				);
			};

			this.ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data.toString()) as {
						type: string;
						sessionId?: string | undefined;
						initialState?: number[];
						data?: number[];
						message?: string;
					};

					switch (message.type) {
						case 'session_joined':
							this.sessionId = message.sessionId || null;
							this.connectionState = 'connected';
							this.reconnectAttempts = 0;

							// Initialize document from binary array
							if (message.initialState) {
								this.doc = Automerge.load<OsDocument>(new Uint8Array(message.initialState));
								this.notifyUpdateCallbacks();
							}

							resolve(this.sessionId!);
							break;

						case 'update':
							// Update document from binary array
							if (message.data) {
								const updatedDoc = Automerge.load<OsDocument>(new Uint8Array(message.data));
								this.doc = updatedDoc;
								this.notifyUpdateCallbacks();
							}
							break;

						case 'error':
							console.error('Error from JOSHU OS server:', message.message);
							break;

						case 'sync_response':
							// Update document from binary array
							if (message.data) {
								this.doc = Automerge.load<OsDocument>(new Uint8Array(message.data));
								this.notifyUpdateCallbacks();
							}
							break;
					}
				} catch (error) {
					console.error('Error processing message:', error);
				}
			};

			this.ws.onerror = (error) => {
				console.error('WebSocket error:', error);
				this.connectionState = 'error';
				reject(error);
			};

			this.ws.onclose = () => {
				console.log('WebSocket connection closed');
				this.connectionState = 'disconnected';

				// Try to reconnect
				this.attemptReconnect();
			};
		});
	}

	// Send a user message to the OS
	async sendMessage(message: string): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(
			JSON.stringify({
				type: 'user_message',
				message,
			} as WebSocketOperations),
		);
	}

	async openApp(appName: string): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'open_app', app_name: appName } as WebSocketOperations));
	}

	async closeWindow(windowId: string): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'close_window', window_id: windowId } as WebSocketOperations));
	}

	async clickLink(windowId: string, routerPath: string): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'click_link', window_id: windowId, router_path: routerPath } as WebSocketOperations));
	}

	async startAction(windowId: string, routerPath: string, actionPath: string): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'start_action', window_id: windowId, router_path: routerPath, action_path: actionPath } as WebSocketOperations));
	}

	async fillFields(actionId: string, fields: FieldDefinition[]): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'fill_fields', action_id: actionId, fields } as WebSocketOperations));
	}

	async applyAction(actionId: string): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'apply_action', action_id: actionId } as WebSocketOperations));
	}

	async pause(): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'pause' } as WebSocketOperations));
	}

	async resume(): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'resume' } as WebSocketOperations));
	}

	// Subscribe to document updates
	subscribe(callback: UpdateCallback): () => void {
		this.updateCallbacks.add(callback);

		// If we already have a document, notify immediately
		if (this.doc) {
			callback(this.doc);
		}

		// Return unsubscribe function
		return () => {
			this.updateCallbacks.delete(callback);
		};
	}

	// Get the current document
	getState(): OsDocument | null {
		return this.doc;
	}

	// Get connection state
	getConnectionState(): ConnectionState {
		return this.connectionState;
	}

	// Get session ID
	getSessionId(): string | null {
		return this.sessionId;
	}

	// Close the connection
	disconnect(): void {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}
	}

	// Attempt to reconnect
	private attemptReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.log('Max reconnect attempts reached');
			return;
		}

		const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
		console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

		this.reconnectTimeout = setTimeout(() => {
			this.reconnectAttempts++;
			this.connect(this.sessionId || undefined).catch(() => {
				// If reconnect fails, it will trigger onclose which will attempt again
			});
		}, delay);
	}

	// Notify all callbacks of document update
	private notifyUpdateCallbacks(): void {
		if (!this.doc) return;

		for (const callback of this.updateCallbacks) {
			try {
				callback(this.doc);
			} catch (error) {
				console.error('Error in update callback:', error);
			}
		}
	}

	// Force sync with server
	sync(): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.warn('Cannot sync: WebSocket not connected');
			return;
		}

		this.ws.send(
			JSON.stringify({
				type: 'sync',
				clientState: this.doc ? Array.from(Automerge.save(this.doc)) : undefined,
			}),
		);
	}

	// Switch to a different session
	async switchSession(sessionId: string): Promise<string> {
		// Close existing connection if any
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		// Reset state
		this.doc = null;
		this.sessionId = null;
		this.connectionState = 'disconnected';

		// Connect with new session ID
		return this.connect(sessionId);
	}

	// Enable desktop mode
	enableDesktopMode(): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.warn('Cannot enable desktop mode: WebSocket not connected');
			return;
		}

		this.ws.send(
			JSON.stringify({
				type: 'join_session',
				mode: 'desktop',
			} as WebSocketOperations),
		);
	}

	// Save a snapshot
	async saveSnapshot(): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'save_snapshot' } as WebSocketOperations));
	}

	// Load a snapshot
	async loadSnapshot(targetSessionId: string): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'load_snapshot', targetSessionId } as WebSocketOperations));
	}

	async sendRelationshipChoice(report: import('@joshu/os-types').RelationshipChoiceReport): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}
		this.ws!.send(
			JSON.stringify({ type: 'relationship_choice', report } as WebSocketOperations),
		);
	}

	async sendActionChoice(report: import('@joshu/os-types').ActionChoiceReport): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}
		this.ws!.send(
			JSON.stringify({ type: 'action_choice', report } as WebSocketOperations),
		);
	}

	async sendPermissionRequest(report: import('@joshu/os-types').PermissionRequest): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}
		this.ws!.send(
			JSON.stringify({ type: 'permission_request', report } as WebSocketOperations),
		);
	}

	async sendActionApproval(report: import('@joshu/os-types').ActionApprovalRequest): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}
		this.ws!.send(
			JSON.stringify({ type: 'action_approval', report } as WebSocketOperations),
		);
	}

	async sendPrerequisite(report: import('@joshu/os-types').Prerequisite): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}
		this.ws!.send(JSON.stringify({ type: 'prerequisite', report } as WebSocketOperations));
	}

	async sendBackgroundJob(report: import('@joshu/os-types').BackgroundJobReport): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}
		this.ws!.send(JSON.stringify({ type: 'background_job', report } as WebSocketOperations));
	}
} 