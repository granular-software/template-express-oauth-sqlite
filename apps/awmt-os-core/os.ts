import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { v4 as uuidv4 } from "uuid";
import * as Automerge from "@automerge/automerge";
import fs from "fs";
import path from "path";
import { sessions, createSession, saveSnapshot, broadcastChanges } from "./os/document_manager";
import type { Agent, FieldDefinition, IterativeAppBuilderState, OsDocument, Task, AppsInstallConfig } from "@joshu/os-types";
import { Console } from "console";
// import type { WebSocketOperations } from "./os/types";

export type WebSocketOperations =
	| {
			type: "join_session";
			sessionId: string;
			mode: string;
	  }
	| {
			type: "user_message";
			message: string;
	  }
	| {
			type: "install_apps";
			config: AppsInstallConfig;
	  }
	| {
			type: "open_app";
			app_name: string;
	  }
	| {
			type: "pause";
	  }
	| {
			type: "resume";
	  }
	| {
			type: "click_link";
			window_id: string;
			router_path: string;
	  }
	| {
			type: "start_action";
			window_id: string;
			router_path: string;
			action_path: string;
	  }
	| {
			type: "fill_fields";
			action_id: string;
			fields: FieldDefinition[];
	  }
	| {
			type: "apply_action";
			action_id: string;
	  }
	| {
			type: "close_window";
			window_id: string;
	  }
	| {
			type: "sync";
			clientState: Uint8Array;
	  }
	| {
			type: "save_snapshot";
	  }
	| {
			type: "load_snapshot";
			targetSessionId: string;
	  }
	| {
			type: "create_agent";
			name: string;
			description: string;
			instructions: string;
	  }
	| {
			type: "assign_task";
			agentId: string;
			description: string;
	  }
	| {
			type: "relationship_choice";
			report: import("@joshu/os-types").RelationshipChoiceReport;
	  }
	| {
			type: "action_choice";
			report: import("@joshu/os-types").ActionChoiceReport;
	  }
	| {
			type: "permission_request";
			report: import("@joshu/os-types").PermissionRequest;
	  }
	| {
			type: "action_approval";
			report: import("@joshu/os-types").ActionApprovalRequest;
	  }
	| {
			type: "prerequisite";
			report: import("@joshu/os-types").Prerequisite;
	  }
	| {
			type: "background_job";
			report: import("@joshu/os-types").BackgroundJobReport;
	  };

const PORT = 3002;
const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });
const SNAPSHOTS_DIR = path.join(process.cwd(), "snapshots");

function cleanupSnapshots() {
	if (!fs.existsSync(SNAPSHOTS_DIR)) {
		fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
		return;
	}

	const now = new Date();
	const files = fs.readdirSync(SNAPSHOTS_DIR);

	files.forEach((file) => {
		const filePath = path.join(SNAPSHOTS_DIR, file);
		const stats = fs.statSync(filePath);
		const fileAge = now.getTime() - stats.mtime.getTime();

		// Delete snapshots older than 7 days
		if (fileAge > 7 * 24 * 60 * 60 * 1000) {
			try {
				fs.unlinkSync(filePath);
				console.log(`Deleted old snapshot: ${file}`);
			} catch (err) {
				console.error(`Failed to delete snapshot ${file}:`, err);
			}
		}
	});
}

cleanupSnapshots();

wss.on("connection", (ws) => {
	let sessionId: string | null = null;

	console.log("New client connected");

	// Handle messages from client
	ws.on("message", async (message) => {

		console.log("MESSAGE", message.toString());
		
		try {
			const data = JSON.parse(message.toString()) as WebSocketOperations;

			// Handle different message types
			switch (data.type) {
				case "join_session": {
					// Assert sessionId will be string
					sessionId = (data.sessionId as string) || (uuidv4() as string);

					if (!sessions.has(sessionId)) {
						sessions.set(sessionId, createSession(sessionId));
					}

					const session = sessions.get(sessionId)!;
					session.clients.add(ws);
					session.lastActivity = new Date();

					// Send initial state to client
					ws.send(
						JSON.stringify({
							type: "session_joined",
							sessionId,
							initialState: Array.from(Automerge.save(session.doc)), // Convert Uint8Array to regular array for JSON
						}),
					);

					// If desktop mode is requested, start the OS in desktop mode
					if (data.mode === "desktop") {
						try {
							await session.os.start_desktop();
						} catch (error) {
							console.error("Error starting desktop mode:", error);
							ws.send(
								JSON.stringify({
									type: "error",
									message: "Error starting desktop mode",
								}),
							);
						}
					}

					console.log(`Client joined session: ${sessionId}`);
					break;
				}

				case "user_message": {
					// Process user message
					if (!sessionId || !sessions.has(sessionId)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No active session",
							}),
						);
						return;
					}

					const session = sessions.get(sessionId)!;
					session.lastActivity = new Date();

					// Process the message with OS
					try {
						await session.os.start_agent(data.message);
					} catch (error) {
						console.error("Error processing message:", error);
						ws.send(
							JSON.stringify({
								type: "error",
								message: "Error processing message",
							}),
						);
					}

					break;
				}

				case "install_apps": {
					if (!sessionId || !sessions.has(sessionId)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No active session",
							}),
						);
						return;
					}

					const session = sessions.get(sessionId)!;
					session.lastActivity = new Date();

					try {
						await session.os.install_apps(data.config);
					} catch (error) {
						console.error("Error installing apps:", error);
					}

					break;
				}

				case "open_app": {
					if (!sessionId || !sessions.has(sessionId)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No active session",
							}),
						);

						return;
					}

					const session = sessions.get(sessionId)!;
					session.lastActivity = new Date();

					try {
						await session.os.open_app(data.app_name);
					} catch (error) {
						console.error("Error opening app:", error);
					}

					break;
				}

				case "pause": {
					if (!sessionId || !sessions.has(sessionId)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No active session",
							}),
						);
						return;
					}

					const session = sessions.get(sessionId)!;
					session.lastActivity = new Date();

					try {
						await session.os.agent?.pause();
					} catch (error) {
						console.error("Error pausing:", error);
					}

					break;
				}

				case "resume": {
					if (!sessionId || !sessions.has(sessionId)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No active session",
							}),
						);
						return;
					}

					const session = sessions.get(sessionId)!;
					session.lastActivity = new Date();

					try {
						await session.os.agent?.resume();
					} catch (error) {
						console.error("Error resuming:", error);
					}

					break;
				}

				case "click_link": {
					if (!sessionId || !sessions.has(sessionId)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No active session",
							}),
						);
						return;
					}

					const session = sessions.get(sessionId)!;
					session.lastActivity = new Date();

					console.log("Click link", data);

					try {
						await session.os.navigate(data.window_id, data.router_path);
					} catch (error) {
						console.error("Error clicking link:", error);
					}

					break;
				}

				case "start_action": {
					if (!sessionId || !sessions.has(sessionId)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No active session",
							}),
						);
						return;
					}

					const session = sessions.get(sessionId)!;
					session.lastActivity = new Date();

					try {
						await session.os.start_action(data.window_id, data.router_path, data.action_path, "user");
					} catch (error) {
						console.error("Error starting action:", error);
					}

					break;
				}

				case "fill_fields": {
					if (!sessionId || !sessions.has(sessionId)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No active session",
							}),
						);
						return;
					}

					const session = sessions.get(sessionId)!;
					session.lastActivity = new Date();

					try {
						await session.os.fill_fields(data.action_id, data.fields);
					} catch (error) {
						console.error("Error filling fields:", error);
					}

					break;
				}

				case "apply_action": {
					if (!sessionId || !sessions.has(sessionId)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No active session",
							}),
						);
						return;
					}

					const session = sessions.get(sessionId)!;
					session.lastActivity = new Date();

					try {
						await session.os.apply_action(data.action_id);
					} catch (error) {
						console.error("Error applying action:", error);
					}

					break;
				}

				case "close_window": {
					if (!sessionId || !sessions.has(sessionId)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No active session",
							}),
						);
						return;
					}

					const session = sessions.get(sessionId)!;
					session.lastActivity = new Date();

					try {
						await session.os.close_window(data.window_id);
					} catch (error) {
						console.error("Error closing window:", error);
					}

					break;
				}

				case "sync": {
					// Sync client state with server
					if (!sessionId || !sessions.has(sessionId)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No active session",
							}),
						);
						return;
					}

					const session = sessions.get(sessionId)!;
					session.lastActivity = new Date();

					// If client sends their state, merge it
					if (data.clientState && Array.isArray(data.clientState)) {
						try {
							const clientDoc = Automerge.load<OsDocument>(new Uint8Array(data.clientState));
							session.doc = Automerge.merge(session.doc, clientDoc);
						} catch (error) {
							console.error("Error merging client state:", error);
						}
					}

					// Send current state to client
					ws.send(
						JSON.stringify({
							type: "sync_response",
							data: Array.from(Automerge.save(session.doc)), // Convert Uint8Array to regular array for JSON
						}),
					);

					break;
				}

				case "save_snapshot": {
					if (!sessionId || !sessions.has(sessionId)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No active session",
							}),
						);
						return;
					}

					try {
						saveSnapshot(sessionId);
						ws.send(
							JSON.stringify({
								type: "snapshot_saved",
								sessionId,
							}),
						);
					} catch (error) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "Failed to save snapshot",
							}),
						);
					}
					break;
				}

				case "load_snapshot": {
					const targetSessionId = data.targetSessionId;
					if (!targetSessionId) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No target session ID provided",
							}),
						);
						return;
					}

					const snapshotPath = path.join(SNAPSHOTS_DIR, `${targetSessionId}.bin`);
					if (!fs.existsSync(snapshotPath)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "Snapshot not found",
							}),
						);
						return;
					}

					try {
						const binary = fs.readFileSync(snapshotPath);
						const loadedDoc = Automerge.load<OsDocument>(binary);

						ws.send(
							JSON.stringify({
								type: "snapshot_loaded",
								sessionId: targetSessionId,
								data: Array.from(Automerge.save(loadedDoc)),
							}),
						);
					} catch (error) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "Failed to load snapshot",
							}),
						);
					}
					break;
				}

				case "create_agent": {

					console.log("MESSAGE RECEIVED CREATE AGENT", data);


					if (!sessionId || !sessions.has(sessionId)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No active session",
							}),
						);
						return;
					}

					const session = sessions.get(sessionId)!;
					session.lastActivity = new Date();

					const agentId = uuidv4();
					const agent = {
						id: agentId,
						name: data.name,
						description: data.description,
						instructions: data.instructions,
						createdAt: new Date().toISOString(),
						tasks: [],
						isActive: true,
						type: "CompositeAgent",
						state: {},
						created_at: new Date().toISOString(),
						is_active: true,
						paused: false,
					} as Agent;

					// Update document with new agent
					session.doc = Automerge.change(session.doc, "Create agent", (doc) => {
						if (!doc.agents) doc.agents = [];
						doc.agents.push(agent);
					});

					// Broadcast changes
					broadcastChanges(sessionId);

					// Send response to client
					ws.send(
						JSON.stringify({
							type: "agent_created",
							agent,
						}),
					);

					console.log(`Agent created: ${agentId} - ${data.name}`);
					break;
				}

				case "assign_task": {
					if (!sessionId || !sessions.has(sessionId)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "No active session",
							}),
						);
						return;
					}

					const session = sessions.get(sessionId)!;
					session.lastActivity = new Date();

					const taskId = uuidv4();
					const task = {
						id: taskId,
						description: data.description,
						status: "pending" as const,
						createdAt: new Date().toISOString(),
						created_at: new Date().toISOString(),
						is_active: true,
						paused: false,
						agent_id: data.agentId,
						validation_report: null,
					} as Task;

					// Update document with new task
					session.doc = Automerge.change(session.doc, "Assign task", (doc) => {
						if (!doc.agents) return;

						const agent = doc.agents.find((a) => a.id === data.agentId);
						if (agent) {
							if (!agent.tasks) agent.tasks = [];
							agent.tasks.push(task);
						}
					});

					// Broadcast changes
					broadcastChanges(sessionId);

					// Send response to client
					ws.send(
						JSON.stringify({
							type: "task_assigned",
							task,
							agentId: data.agentId,
						}),
					);

					console.log(`Task assigned: ${taskId} to agent ${data.agentId}`);
					break;
				}
			}
		} catch (error) {
			console.error("Error handling message:", error);
			ws.send(
				JSON.stringify({
					type: "error",
					message: "Invalid message format",
				}),
			);
		}
	});

	// Handle client disconnect
	ws.on("close", () => {
		console.log("Client disconnected");

		if (sessionId && sessions.has(sessionId)) {
			const session = sessions.get(sessionId)!;
			session.clients.delete(ws);

			// If no clients left, save snapshot
			if (session.clients.size === 0) {
				saveSnapshot(sessionId);
			}
		}
	});
});

// Periodic cleanup of inactive sessions (every 30 minutes)
setInterval(
	() => {
		const now = new Date();
		for (const [sessionId, session] of sessions.entries()) {
			// If session is inactive for more than 2 hours and has no clients
			const inactiveTime = now.getTime() - session.lastActivity.getTime();
			if (inactiveTime > 2 * 60 * 60 * 1000 && session.clients.size === 0) {
				// Save final snapshot
				saveSnapshot(sessionId);
				// Remove session
				sessions.delete(sessionId);
				console.log(`Cleaned up inactive session: ${sessionId}`);
			}
		}
	},
	30 * 60 * 1000,
);

// Start the server
httpServer.listen(PORT, () => {
	console.log(`OS WebSocket server running on port ${PORT}`);
});
