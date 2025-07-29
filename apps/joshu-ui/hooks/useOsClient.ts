'use client';

import { useEffect, useState, useCallback } from 'react';
import { osClient } from '@/lib/osClient';
import { OsDocument, OsLog, Thought, SerializedView, ExecutionPlanData, FieldDefinition } from '@joshu/os-types';

export interface UserChunk {
	role: 'user';
	logs: OsLog[];
}

export interface AgentChunk {
	role: 'agent';
	loops: { index: number; logs: OsLog[]; thoughts: Thought[] }[];
}

export interface UseOsClient {
	document: OsDocument | null;
	thoughts: Thought[];
	chunks: (AgentChunk | UserChunk)[];
	isConnected: boolean;
	sessionId: string | null;
	sendMessage: (message: string) => Promise<boolean>;
	open_app: (appName: string) => Promise<void>;
	close_window: (windowId: string) => Promise<void>;
	click_link: (windowId: string, routerPath: string) => Promise<void>;

	start_action: (windowId: string, actionAlias: string, actionPath: string) => Promise<void>;
	fill_fields: (actionId: string, fields: FieldDefinition[]) => Promise<void>;
	apply_action: (actionId: string) => Promise<void>;

	pause: () => Promise<void>;
	resume: () => Promise<void>;
	sync: () => void;
	connect: (sessionId?: string, options?: { mode?: 'desktop' }) => Promise<string | null>;
	switchSession: (sessionId: string) => Promise<string | null>;
	// views: SerializedView[];
	windows: { id: string; view: SerializedView }[];
	executionPlan: ExecutionPlanData | null;
	logs: OsLog[];
}

export function useOsClient(): UseOsClient {
	const [document, setDocument] = useState<OsDocument | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [realtimeThoughts, setRealtimeThoughts] = useState<Thought[]>([]);

	useEffect(() => {
		// Initialize on client side only
		setDocument(osClient.getState());
		setIsConnected(osClient.getConnectionState() === 'connected');

		// Subscribe to document updates
		const unsubscribe = osClient.subscribe((doc) => {
			setDocument(doc);

			// Update real-time thoughts whenever the document changes
			if (doc?.thoughts) {
				setRealtimeThoughts([...doc.thoughts]);
			}
		});

		// Update connection state when it changes
		const checkConnectionState = () => {
			const currentState = osClient.getConnectionState();
			setIsConnected(currentState === 'connected');
		};

		// Check connection state periodically
		const intervalId = setInterval(checkConnectionState, 1000);

		// Connect if not already connected
		if (osClient.getConnectionState() !== 'connected') {
			osClient
				.connect()
				.then((sid) => {
					setSessionId(sid);
					setIsConnected(true);
				})
				.catch(console.error);
		} else if (osClient.getConnectionState() === 'connected') {
			setSessionId(osClient.getSessionId() || null);
		}

		// Cleanup on unmount
		return () => {
			unsubscribe();
			clearInterval(intervalId);
		};
	}, []);

	// Function to send a message
	const sendMessage = useCallback(async (message: string) => {
		try {
			await osClient.sendMessage(message);
			return true;
		} catch (error) {
			console.error('Error sending message:', error);
			return false;
		}
	}, []);

	const open_app = useCallback(async (appName: string) => {
		try {
			await osClient.open_app(appName);
		} catch (error) {
			console.error('Error opening app:', error);
		}
	}, []);

	const pause = useCallback(async () => {
		try {
			await osClient.pause();
		} catch (error) {
			console.error('Error pausing:', error);
		}
	}, []);

	const resume = useCallback(async () => {
		try {
			await osClient.resume();
		} catch (error) {
			console.error('Error resuming:', error);
		}
	}, []);

	const close_window = useCallback(async (windowId: string) => {
		try {
			await osClient.close_window(windowId);
		} catch (error) {
			console.error('Error closing window:', error);
		}
	}, []);

	const click_link = useCallback(async (windowId: string, routerPath: string) => {
		try {
			await osClient.click_link(windowId, routerPath);
		} catch (error) {
			console.error('Error clicking link:', error);
		}
	}, []);

	const start_action = useCallback(async (windowId: string, actionAlias: string, actionPath: string) => {
		try {
			await osClient.start_action(windowId, actionAlias, actionPath);
		} catch (error) {
			console.error('Error starting action:', error);
		}
	}, []);

	const fill_fields = useCallback(async (actionId: string, fields: FieldDefinition[]) => {
		try {
			await osClient.fill_fields(actionId, fields);
		} catch (error) {
			console.error('Error filling fields:', error);
		}
	}, []);

	const apply_action = useCallback(async (actionId: string) => {
		try {
			await osClient.apply_action(actionId);
		} catch (error) {
			console.error('Error applying action:', error);
		}
	}, []);

	// Function to force sync with server
	const sync = useCallback(() => {
		osClient.sync();
	}, []);

	let chunks: (AgentChunk | UserChunk)[] = [];

	if (document) {
		const logs = document?.logs;

		let all_thoughts = document.thoughts;

		if (logs && logs.length > 0) {
			let currentChunk: AgentChunk | UserChunk | null = null;
			let currentLoopThoughts: Thought[] = [];

			const getDateValue = (date: string | Date) => {
				return typeof date === 'string' ? new Date(date).getTime() : date.getTime();
			};

			for (const event of logs) {
				const isUserEvent = event.type === 'user_query';
				const role = isUserEvent ? 'user' : 'agent';

				// If we don't have a current chunk or the role changed, create a new chunk
				if (!currentChunk || currentChunk.role !== role) {
					if (currentChunk) {
						chunks.push(currentChunk);
					}

					// Create appropriate chunk type based on role
					if (role === 'user') {
						currentChunk = { role: 'user', logs: [event] } as UserChunk;
						currentLoopThoughts = [];
					} else {
						// For agent chunks, find thoughts that occurred before this event
						const eventTime = getDateValue(event.date);
						currentLoopThoughts = all_thoughts.filter((t) => getDateValue(t.date) <= eventTime);
						currentChunk = {
							role: 'agent',
							loops: [
								{
									index: 0,
									logs: [event],
									thoughts: currentLoopThoughts,
								},
							],
						};
					}
				} else {
					// Add to existing chunk
					if (role === 'user') {
						(currentChunk as UserChunk).logs.push(event);
						currentLoopThoughts = [];
					} else {
						// For agent chunks, check if this is a loop_end event
						if (event.type === 'loop_end' && currentChunk.role === 'agent') {
							// Add the event to the current chunk with thoughts
							currentChunk.loops.push({
								index: currentChunk.loops.length,
								logs: [event],
								thoughts: currentLoopThoughts,
							});
							// Push the current chunk and start a new agent chunk
							chunks.push(currentChunk);
							currentChunk = { role: 'agent', loops: [] } as AgentChunk;
							currentLoopThoughts = [];
						} else if (currentChunk.role === 'agent') {
							// Find thoughts that occurred between the last event and this one
							const lastEvent = currentChunk.loops[currentChunk.loops.length - 1]?.logs[0];
							const eventTime = getDateValue(event.date);

							currentLoopThoughts = lastEvent
								? all_thoughts.filter((t) => {
										const thoughtTime = getDateValue(t.date);
										const lastEventTime = getDateValue(lastEvent.date);
										return thoughtTime > lastEventTime && thoughtTime <= eventTime;
									})
								: all_thoughts.filter((t) => getDateValue(t.date) <= eventTime);

							currentChunk.loops.push({
								index: currentChunk.loops.length,
								logs: [event],
								thoughts: currentLoopThoughts,
							});
						}
					}
				}
			}

			// Add the last chunk if it exists and has logs
			if (currentChunk) {
				if (currentChunk.role === 'user' && currentChunk.logs.length > 0) {
					chunks.push(currentChunk);
				} else if (currentChunk.role === 'agent' && currentChunk.loops.length > 0) {
					chunks.push(currentChunk);
				}
			}
		}
	}

	console.log('THOUGHTS RECEIVED', document?.thoughts);

	return {
		document,
		// thoughts: document?.thoughts || [],
		thoughts: document?.thoughts || [],
		isConnected,
		sessionId,
		sendMessage,
		open_app,
		close_window, 
		click_link,
		start_action,
		fill_fields,
		apply_action,

		executionPlan: null,

		pause,
		resume,
		sync,
		connect: useCallback(async (sessionId?: string, options?: { mode?: 'desktop' }) => {
			try {
				const sid = await osClient.connect(sessionId);
				if (options?.mode === 'desktop') {
					osClient.enableDesktopMode();
				}
				setSessionId(sid);
				setIsConnected(true);
				return sid;
			} catch (error) {
				console.error('Error connecting:', error);
				return null;
			}
		}, []),
		switchSession: useCallback(async (sessionId: string) => {
			try {
				const sid = await osClient.switchSession(sessionId);
				setSessionId(sid);
				setIsConnected(true);
				return sid;
			} catch (error) {
				console.error('Error switching session:', error);
				return null;
			}
		}, []),
		// views: document?.views || [],
		windows: document?.windows || [],
		// executionPlan: document?.executionPlan || null,
		logs: document?.logs || [],

		chunks: chunks,
	};
}
