import { OsDocument, OsLog, AppsInstallConfig } from '@joshu/os-types';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import * as Automerge from '@automerge/automerge';

export interface ComputerImageOptions {
	name: string;
	url?: string;
	apps?: AppsInstallConfig;
}

/**
 * Simplified ComputerImage that connects to JOSHU OS and manages the document
 */
export class ComputerImage {
	public readonly id: string;
	public readonly name: string;
	public readonly url: string;
	public readonly apps?: AppsInstallConfig;
	public sessionId: string | null = null;

	private ws: WebSocket | null = null;
	private doc: Automerge.Doc<OsDocument> | null = null;
	private docSyncState: Automerge.SyncState | null = null;
	private subscribers: ((doc: OsDocument | null) => void)[] = [];
	
	// Log subscription state
	private lastLogId: string | null = null;
	private logSubscribers: ((log: OsLog) => void)[] = [];

	constructor(options: ComputerImageOptions) {
		this.id = uuidv4();
		this.name = options.name;
		this.url = options.url || 'ws://localhost:3002';
		this.apps = options.apps;
	}

	/**
	 * Connect to JOSHU OS and join session
	 */
	async start(existingSessionId?: string): Promise<string> {
		return new Promise((resolve, reject) => {
			let resolved = false;
			
			// Add timeout to prevent hanging indefinitely
			const timeout = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					console.log("TIMEOUT");
					reject(new Error('Timeout: No document received within 10 seconds'));
				}
			}, 10000);
			
			try {
				this.ws = new WebSocket(this.url);
				
				this.ws.on('open', () => {
					console.log('Connected to JOSHU OS');
					this.sessionId = existingSessionId || uuidv4();
					
					// console.log('Sending join_session message with sessionId:', this.sessionId);
					
					// Join session (existing or new)
					this.ws!.send(JSON.stringify({
						type: 'join_session',
						sessionId: this.sessionId,
						mode: 'desktop'
					}));
					
					// console.log('join_session message sent, waiting for response...');
					// Don't resolve here - wait for document to be ready
				});

				this.ws.on('message', (data: Buffer) => {
					// console.log('Raw message received, length:', data.length);
					try {
						const message = JSON.parse(data.toString());
						// console.log("MESSAGE", message);
						
						this.handleMessage(message);
						
						// console.log('After handleMessage, getState() is:', this.getState() !== null ? 'NOT NULL' : 'NULL');
						
						// Resolve when document becomes available
						if (!resolved && this.getState() !== null && this.sessionId) {
							resolved = true;
							clearTimeout(timeout);

							// console.log("RESOLVED COMPUTER", JSON.stringify(this.getState(), null, 2));

							resolve(this.sessionId);
						}
					} catch (error) {
						console.error('Error parsing message:', error);
						console.error('Raw message data:', data.toString());
					}
				});

				this.ws.on('close', () => {
					console.log('Disconnected from JOSHU OS');
					this.sessionId = null;
					if (!resolved) {
						resolved = true;
						clearTimeout(timeout);
						reject(new Error('WebSocket closed before document was received'));
					}
				});

				this.ws.on('error', (error: Error) => {
					console.error('WebSocket error:', error);
					if (!resolved) {
						resolved = true;
						clearTimeout(timeout);
						reject(error);
					}
				});

			} catch (error) {
				if (!resolved) {
					resolved = true;
					clearTimeout(timeout);
					reject(error);
				}
			}
		});
	}

	/**
	 * Disconnect from JOSHU OS
	 */
	stop(): void {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.sessionId = null;
		this.doc = null;
		this.docSyncState = null;
	}

	/**
	 * Check if connected
	 */
	isConnected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}

	/**
	 * Send a message to the OS
	 */
	async sendMessage(content: string): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}

		const message = {
			type: 'user_message',
			message: content,
			timestamp: new Date().toISOString()
		};

		this.ws!.send(JSON.stringify(message));
	}

	/**
	 * Send a direct WebSocket message (for internal operations like agent creation)
	 */
	async sendWebSocketMessage(message: any): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}

		this.ws!.send(JSON.stringify(message));
	}

	/**
	 * Open an application
	 */
	async openApp(appName: string): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}

		const message = {
			type: 'open_app',
			app_name: appName
		};

		this.ws!.send(JSON.stringify(message));
	}

	/**
	 * Click a link in a window
	 */
	async clickLink(windowId: string, routerPath: string): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}

		const message = {
			type: 'click_link',
			window_id: windowId,
			router_path: routerPath
		};

		this.ws!.send(JSON.stringify(message));
	}

	/**
	 * Start an action in a window
	 */
	async startAction(windowId: string, routerPath: string, actionPath: string): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}

		const message = {
			type: 'start_action',
			window_id: windowId,
			router_path: routerPath,
			action_path: actionPath
		};

		this.ws!.send(JSON.stringify(message));
	}

	/**
	 * Fill fields for an action
	 */
	async fillFields(actionId: string, fields: any[]): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}

		const message = {
			type: 'fill_fields',
			action_id: actionId,
			fields: fields
		};

		this.ws!.send(JSON.stringify(message));
	}

	/**
	 * Apply an action
	 */
	async applyAction(actionId: string): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}

		const message = {
			type: 'apply_action',
			action_id: actionId
		};

		this.ws!.send(JSON.stringify(message));
	}

	/**
	 * Close a window
	 */
	async closeWindow(windowId: string): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}

		const message = {
			type: 'close_window',
			window_id: windowId
		};

		this.ws!.send(JSON.stringify(message));
	}

	/**
	 * Save a snapshot of the current session
	 */
	async saveSnapshot(): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}

		if (!this.sessionId) {
			throw new Error('No active session to save');
		}

		const message = {
			type: 'save_snapshot'
		};

		this.ws!.send(JSON.stringify(message));
	}

	/**
	 * Load a snapshot and switch to that session
	 */
	async loadSnapshot(targetSessionId: string): Promise<string> {
		return new Promise((resolve, reject) => {
			if (!this.isConnected()) {
				reject(new Error('Not connected to JOSHU OS'));
				return;
			}

			let resolved = false;
			const timeout = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					reject(new Error('Timeout: Snapshot not loaded within 10 seconds'));
				}
			}, 10000);

			// Listen for snapshot_loaded message
			const originalOnMessage = this.ws!.onmessage;
			this.ws!.onmessage = (event: any) => {
				try {
					const message = JSON.parse(event.data.toString());
					
					if (message.type === 'snapshot_loaded') {
						if (!resolved) {
							resolved = true;
							clearTimeout(timeout);
							
							// Update session ID and document
							this.sessionId = message.sessionId;
							if (message.data) {
								this.doc = Automerge.load(new Uint8Array(message.data)) as Automerge.Doc<OsDocument>;
								this.notifySubscribers();
							}
							
							// Restore original message handler
							this.ws!.onmessage = originalOnMessage;
							
							if (this.sessionId) {
								resolve(this.sessionId);
							} else {
								reject(new Error('Session ID not provided in snapshot response'));
							}
						}
					} else if (message.type === 'error') {
						if (!resolved) {
							resolved = true;
							clearTimeout(timeout);
							// Restore original message handler
							this.ws!.onmessage = originalOnMessage;
							reject(new Error(message.message || 'Failed to load snapshot'));
						}
					} else {
						// Forward other messages to original handler
						if (originalOnMessage) {
							originalOnMessage.call(this.ws, event);
						}
					}
				} catch (error) {
					// Forward parsing errors to original handler
					if (originalOnMessage) {
						originalOnMessage.call(this.ws, event);
					}
				}
			};

			// Send load snapshot request
			const message = {
				type: 'load_snapshot',
				targetSessionId: targetSessionId
			};

			this.ws!.send(JSON.stringify(message));
		});
	}

	/**
	 * Get the current session ID
	 */
	getSessionId(): string | null {
		return this.sessionId;
	}

	/**
	 * Subscribe to document updates
	 */
	subscribe(callback: (doc: OsDocument | null) => void): () => void {
		this.subscribers.push(callback);
		
		// Immediately call with current document
		callback(this.doc ? Automerge.clone(this.doc) : null);
		
		return () => {
			const index = this.subscribers.indexOf(callback);
			if (index >= 0) {
				this.subscribers.splice(index, 1);
			}
		};
	}

	/**
	 * Subscribe to new logs from the OsDocument
	 * Calls the callback every time a new log is synced, keeping track of the last log
	 */
	subscribeToLogs(callback: (log: OsLog) => void): () => void {
		// console.log(`📋 New logs subscriber added (total: ${this.logSubscribers.length + 1})`);
		this.logSubscribers.push(callback);
		
		// Check current document for any new logs and update last log ID
		// Pass the specific callback to ensure it gets all existing logs
		this.checkForNewLogsForSubscriber(callback);
		
		return () => {
			const index = this.logSubscribers.indexOf(callback);
			if (index >= 0) {
				this.logSubscribers.splice(index, 1);
				// console.log(`📋 Logs subscriber removed (remaining: ${this.logSubscribers.length})`);
			}
		};
	}

	/**
	 * Get the current OS document
	 */
	getState(): OsDocument | null {
		return this.doc ? Automerge.clone(this.doc) : null;
	}

	private handleMessage(message: any): void {
		switch (message.type) {
			case 'session_joined':
				console.log('Session joined:', message.sessionId);
				if (message.initialState) {
					try {
						this.doc = Automerge.load(new Uint8Array(message.initialState)) as Automerge.Doc<OsDocument>;
						this.notifySubscribers();
						
						// Send install_apps message if apps configuration is provided
						if (this.apps && this.apps.apps.length > 0) {
							console.log('Sending install_apps message with', this.apps.apps.length, 'apps');
							this.ws!.send(JSON.stringify({
								type: 'install_apps',
								config: this.apps
							}));
						}
					} catch (error) {
						console.error('Error loading initial state:', error);
					}
				}
				break;
			case 'document_update':
			case 'update':
				this.handleDocumentUpdate(message);
				break;
			case 'sync_response':
				this.handleSyncResponse(message);
				break;
			case 'agent_created':
				console.log('Agent created:', message.agent);
				break;
			case 'task_assigned':
				console.log('Task assigned:', message.task);
				break;
			default:
				console.log('Unknown message type:', message.type);
		}
	}

	private handleDocumentUpdate(message: any): void {
		try {
			if (!message.data) {
				console.warn('Received document update without data, skipping');
				return;
			}

			// The server sends full document state using Automerge.save(), not incremental changes
			// So we need to load the complete document, not apply changes
			let documentData: Uint8Array;
			try {
				documentData = Array.isArray(message.data) 
					? new Uint8Array(message.data) 
					: new Uint8Array(message.data);
			} catch (error) {
				console.warn('Could not convert message data to Uint8Array, skipping update:', error);
				return;
			}
			
			// Always load as complete document since server sends full state
			try {
				this.doc = Automerge.load(documentData) as Automerge.Doc<OsDocument>;
				this.notifySubscribers();
			} catch (loadError) {
				console.warn('Could not load document update, skipping:', loadError);
				return;
			}
		} catch (error) {
			console.warn('Error in handleDocumentUpdate, skipping:', error);
		}
	}

	private handleSyncResponse(message: any): void {
		try {
			if (message.data && this.docSyncState) {
				const syncMessage = new Uint8Array(message.data);
				const [newDoc, newSyncState] = Automerge.receiveSyncMessage(
					this.doc || Automerge.init<OsDocument>(), 
					this.docSyncState, 
					syncMessage
				);
				
				this.doc = newDoc as Automerge.Doc<OsDocument>;
				this.docSyncState = newSyncState;
				this.notifySubscribers();
			}
		} catch (error) {
			console.error('Error handling sync response:', error);
		}
	}

	private notifySubscribers(): void {
		const docClone = this.doc ? Automerge.clone(this.doc) : null;
		this.subscribers.forEach(callback => callback(docClone));
		
		// Also check for new logs
		this.checkForNewLogs();
	}

	private checkForNewLogs(): void {
		if (!this.doc || !this.doc.logs || this.logSubscribers.length === 0) {
			return;
		}

		const logs = this.doc.logs;
		if (logs.length === 0) {
			return;
		}

		// Find the index of the last seen log
		const lastSeenIndex = this.lastLogId === null ? -1 : logs.findIndex(log => log.id === this.lastLogId);
		
		// If this is the first time seeing logs OR we can't find the last seen log, process all logs
		// Otherwise, process only logs after the last seen one
		const startIndex = lastSeenIndex === -1 ? 0 : lastSeenIndex + 1;
		
		const newLogsCount = logs.length - startIndex;
		if (newLogsCount > 0) {
			// console.log(`📋 Processing ${newLogsCount} new logs for ${this.logSubscribers.length} subscribers`);
			if (this.lastLogId === null) {
				// console.log(`📋 First time seeing logs - processing all ${logs.length} logs`);
			}
		}
		
		// Process all new logs since the last seen one for all subscribers
		for (let i = startIndex; i < logs.length; i++) {
			const newLog = logs[i];
			// console.log(`📋 Calling back new log ${i - startIndex + 1}/${newLogsCount}: ${newLog.type} (${newLog.id.slice(0, 8)}...)`);
			this.logSubscribers.forEach(callback => callback(JSON.parse(JSON.stringify(newLog))));
		}

		// Update the last log ID to the most recent log
		if (logs.length > 0) {
			this.lastLogId = logs[logs.length - 1].id;
		}
	}

	private checkForNewLogsForSubscriber(callback: (log: OsLog) => void): void {
		if (!this.doc || !this.doc.logs) {
			console.log('📋 No document or logs available for new subscriber');
			return;
		}

		const logs = this.doc.logs;
		if (logs.length === 0) {
			console.log('📋 No logs in document for new subscriber');
			return;
		}

		console.log(`📋 Processing ${logs.length} existing logs for new subscriber`);
		// Always process all existing logs for new subscribers (past logs)
		for (let i = 0; i < logs.length; i++) {
			const log = logs[i];
			console.log(`📋 Calling back past log ${i + 1}/${logs.length}: ${log.type} (${log.id.slice(0, 8)}...)`);
			callback(JSON.parse(JSON.stringify(log)));
		}

		// Update the global lastLogId if it hasn't been set yet
		if (this.lastLogId === null && logs.length > 0) {
			this.lastLogId = logs[logs.length - 1].id;
			console.log(`📋 Set global lastLogId to: ${this.lastLogId.slice(0, 8)}...`);
		}
	}

	async sendRelationshipChoice(report: import('@joshu/os-types').RelationshipChoiceReport): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}
		const message = { type: 'relationship_choice', report };
		this.ws!.send(JSON.stringify(message));
	}

	async sendActionChoice(report: import('@joshu/os-types').ActionChoiceReport): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}
		const message = { type: 'action_choice', report };
		this.ws!.send(JSON.stringify(message));
	}

	async sendPermissionRequest(report: import('@joshu/os-types').PermissionRequest): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}
		const message = { type: 'permission_request', report };
		this.ws!.send(JSON.stringify(message));
	}

	async sendActionApproval(report: import('@joshu/os-types').ActionApprovalRequest): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}
		const message = { type: 'action_approval', report };
		this.ws!.send(JSON.stringify(message));
	}

	async sendPrerequisite(report: import('@joshu/os-types').Prerequisite): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}
		const message = { type: 'prerequisite', report };
		this.ws!.send(JSON.stringify(message));
	}

	async sendBackgroundJob(report: import('@joshu/os-types').BackgroundJobReport): Promise<void> {
		if (!this.isConnected()) {
			throw new Error('Not connected to JOSHU OS');
		}
		const message = { type: 'background_job', report };
		this.ws!.send(JSON.stringify(message));
	}
} 