import { ConnectionState, FieldDefinition, OsDocument } from '@joshu/os-types';
// import { WebSocketOperations } from '@joshu/os-types'

import * as Automerge from '@automerge/automerge';

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
	  };

// Define the WebSocket connection state
type UpdateCallback = (doc: OsDocument | null) => void;

// Create a client-side only version of the OsClient
export class OsClient {
	private ws: WebSocket | null = null;
	private sessionId: string | null = null;
	private doc: any | null = null; // Will be Automerge.Doc<OsDocument> when initialized
	private connectionState: ConnectionState = 'disconnected';
	private updateCallbacks: Set<UpdateCallback> = new Set();
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectTimeout: NodeJS.Timeout | null = null;
	private Automerge: any = null; // Will hold the Automerge module when loaded

	constructor(private url: string = '') {
		// Initialize URL only on client side
		if (typeof window !== 'undefined') {
			this.url = url || `ws://${window.location.hostname}:3002`;
			// Dynamically import Automerge only on client side
			this.loadAutomerge();
		}
	}

	// Dynamically load Automerge
	private async loadAutomerge() {
		if (typeof window !== 'undefined') {
			try {
				// const Automerge = await import('@automerge/automerge');
				this.Automerge = Automerge;
				console.log('Automerge loaded successfully');
			} catch (error) {
				console.error('Failed to load Automerge:', error);
			}
		}
	}

	// Connect to the WebSocket server
	async connect(sessionId?: string, options: { mode?: 'desktop' } = {}): Promise<string> {
		// Ensure we're on client side
		if (typeof window === 'undefined') {
			return Promise.reject(new Error('Cannot connect on server side'));
		}

		// Ensure Automerge is loaded
		if (!this.Automerge) {
			await this.loadAutomerge();
		}

		return new Promise((resolve, reject) => {
			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				resolve(this.sessionId!);
				return;
			}

			this.connectionState = 'connecting';
			this.ws = new WebSocket(this.url);

			this.ws.onopen = () => {
				console.log('Connected to OS WebSocket server');

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
					const message = JSON.parse(event.data) as {
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
								this.doc = this.Automerge.load(new Uint8Array(message.initialState));
								this.notifyUpdateCallbacks();
							}

							resolve(this.sessionId!);
							break;

						case 'update':
							// Update document from binary array
							if (message.data) {
								const updatedDoc = this.Automerge.load(new Uint8Array(message.data));
								this.doc = updatedDoc;
								this.notifyUpdateCallbacks();
							}
							break;

						case 'error':
							console.error('Error from OS server:', message.message);
							break;

						case 'sync_response':
							// Update document from binary array
							if (message.data) {
								this.doc = this.Automerge.load(new Uint8Array(message.data));
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

	async open_app(app_name: string): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'open_app', app_name } as WebSocketOperations));
	}

	async close_window(window_id: string): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'close_window', window_id } as WebSocketOperations));
	}

	async click_link(window_id: string, router_path: string): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'click_link', window_id, router_path } as WebSocketOperations));
	}

	async start_action(window_id: string, router_path: string, action_path: string): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'start_action', window_id, router_path, action_path } as WebSocketOperations));
	}

	async fill_fields(action_id: string, fields: FieldDefinition[]): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'fill_fields', action_id, fields } as WebSocketOperations));
	}

	async apply_action(action_id: string): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			await this.connect(this.sessionId || undefined);
		}

		this.ws!.send(JSON.stringify({ type: 'apply_action', action_id } as WebSocketOperations));
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

		const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
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
				clientState: this.doc ? Array.from(this.Automerge.save(this.doc)) : undefined,
			}),
		);
	}

	// Add this getter method
	public getSessionId(): string | null {
		return this.sessionId;
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
}

// Create a singleton instance
export const osClient = new OsClient();
