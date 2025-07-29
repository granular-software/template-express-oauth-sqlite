import * as Automerge from "@automerge/automerge";
import {
	type OsDocument,
	type RankedOption,
	type SerializedView,
	type RelationshipChoiceReport,
	type ActionChoiceReport,
	type PermissionRequest,
	type ActionApprovalRequest,
	type Prerequisite,
	type BackgroundJobReport,
} from "@joshu/os-types";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { WebSocket } from "ws";
import EffectsStream, { type AgentRegisterData, type AgentStateUpdateData, type CloseWindowData, type NavigateToPathData, type OpenWindowData } from "./effects_stream";
import Os from "./os";
import { type SelectedOptionsData, type ThoughtData, type TokenUsageData, type WorkDoneData } from "./types";

// Store active sessions
export interface Session {
	id: string;
	doc: Automerge.Doc<OsDocument>;
	os: Os;
	clients: Set<WebSocket>;
	lastActivity: Date;
	snapshotPath: string;
}

// Directory for snapshots
const SNAPSHOTS_DIR = path.join(process.cwd(), "snapshots");
if (!fs.existsSync(SNAPSHOTS_DIR)) {
	fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

// Initialize a new session
export function createSession(sessionId: string): Session {
	console.log(`Creating new session: ${sessionId}`);

	// Initialize Automerge document with initial state
	let doc = Automerge.init<OsDocument>();

	// Create change to initialize document
	doc = Automerge.change(doc, "Initialize document", (doc) => {
		doc.logs = [];
		doc.actions = [];
		doc.windows = [];
		doc.agents = [];
		doc.thoughts = [];
		doc.session_state = {
			started_at: new Date().toISOString(),
			last_activity: new Date().toISOString(),
			status: "ready",
		};
		doc.token_usage = {
			input: 0,
			output: 0,
			cost: 0,
		};

		doc.relationship_choices = [];
		doc.action_choices = [];
		doc.permission_requests = [];
		doc.action_approvals = [];
		doc.prerequisites = [];
		doc.background_jobs = [];
	});

	// Create snapshot path
	const snapshotPath = path.join(SNAPSHOTS_DIR, `${sessionId}.bin`);

	// Try to load from snapshot if exists
	if (fs.existsSync(snapshotPath)) {
		try {
			const binary = fs.readFileSync(snapshotPath);
			doc = Automerge.load<OsDocument>(binary);
			console.log(`Loaded session from snapshot: ${sessionId}`);
		} catch (err) {
			console.error(`Failed to load snapshot for session ${sessionId}:`, err);
		}
	}

	// Helper function to update clicked links in a view component
	const updateClickedLinks = (windows: { id: string; view: SerializedView }[], selectedOptions: RankedOption[]) => {
		// Get the list of target views that have been clicked
		const clickedTargetViews = selectedOptions.map((option) => (option.type === "click_link" ? option.target_path : null)).filter(Boolean);

		const updateLinksInComponent = (component: SerializedView) => {
			// Update links in the current component
			component.clickable_links = component.clickable_links.map((link) => ({
				...link,
				clicked: clickedTargetViews.includes(link.router_path),
			}));

			// Recursively update links in child components
			if (component.components) {
				component.components.forEach(updateLinksInComponent);
			}
		};

		// Process all views and their components
		windows.forEach((window) => {
			// if (view.components) {
			updateLinksInComponent(window.view);
			// }
		});
	};

	// Helper function to update triggered actions in a view component
	const updateTriggeredActions = (windows: { id: string; view: SerializedView }[], selectedOptions: RankedOption[]) => {
		// Get the list of action names that have been triggered
		const triggeredActionNames = selectedOptions.map((option) => option.name);

		const updateActionsInComponent = (component: SerializedView) => {
			// Get the list of action names that have been triggered
			const triggeredActionNames = selectedOptions.map((option) => option.name);

			// Helper function to deep copy action fields
			// const copyActionField = (field: ActionField) => ({
			// 	name: String(field.name),
			// 	description: String(field.description),
			// 	type: field.type,
			// 	required: Boolean(field.required),
			// });

			// Update actions in the current component by creating new objects
			component.actions = component.actions.map((action) => {
				const isTriggered = triggeredActionNames.includes(action.label);
				// Create a new action object with all properties
				const newAction: SerializedView["actions"][0] = JSON.parse(
					JSON.stringify({
						// label: String(action.label),
						// description: String(action.description),
						// fields: action.fields.map(copyActionField),
						// output_type: String(action.output_type),
						// alias: action.alias || action.label,
						...action,
					}),
				);

				// Only add alias if it exists
				if (action.alias) {
					newAction.alias = String(action.alias);
				}

				return newAction;
			});

			// // Also update triggerable_actions to maintain consistency
			// component.triggerable_actions = component.triggerable_actions.map((action) => {
			// 	const isTriggered = triggeredActionNames.includes(action.label);
			// 	// Create a new action object with all properties
			// 	const newAction: RenderedAction = {
			// 		label: String(action.label),
			// 		description: String(action.description),
			// 		fields: action.fields.map(copyActionField),
			// 		triggered: isTriggered,
			// 		view_to_close: action.view_to_close || null,
			// 	};

			// 	// Only add optional fields if they exist
			// 	if (action.alias) {
			// 		newAction.alias = String(action.alias);
			// 	}
			// 	if (action.output_type) {
			// 		newAction.output_type = String(action.output_type);
			// 	}
			// 	if (action.view_to_close) {
			// 		newAction.view_to_close = String(action.view_to_close) || null;
			// 	}

			// 	return newAction;
			// });

			// Recursively update actions in child components
			if (component.components) {
				component.components.forEach(updateActionsInComponent);
			}
		};

		// Process all views and their components
		windows.forEach((window) => {
			if (window.view) {
				updateActionsInComponent(window.view);
			}
		});
	};

	// Create effects stream that will update the Automerge document
	const effectsStream = new EffectsStream((update) => {
		// Get the latest session document
		const session = sessions.get(sessionId);
		if (!session) return;

		// Only clone the document for non-token-usage updates
		if (update.type !== "token_usage") {
			try {
				session.doc = Automerge.clone(session.doc);
			} catch (e) {
				console.error("Error cloning document:", JSON.stringify(session.doc));
				throw e;
			}
		}

		session.doc = Automerge.change<OsDocument>(session.doc, update.type, (doc) => {
			if (update.type === "thought") {
				if (!doc.thoughts) doc.thoughts = [];
				doc.thoughts.push({
					id: (update.data as ThoughtData).id,
					agent_id: (update.data as ThoughtData).agent_id,
					date: new Date((update.data as ThoughtData).date).toISOString(),
					content: (update.data as ThoughtData).thought,
				});

				// console.log("Thought update", JSON.stringify(update.data, null, 2));

				// Update session state to show agent is working
				doc.session_state.status = "streaming";
				doc.session_state.last_activity = new Date().toISOString();
			} else if (update.type === "pause_state_update") {
				// doc.paused = (update.data as PauseStateData).paused;
				// console.log("Pause state update", JSON.stringify(update.data, null, 2));

			} else if (update.type === "agent_register") {
				const agentRegisterData = update.data as AgentRegisterData;
				console.log("Agent register update", JSON.stringify(agentRegisterData, null, 2));

				// Initialize agents array if it doesn't exist
				if (!doc.agents) {
					doc.agents = [];
				}

				// Check if an agent with this ID already exists
				const existingAgentIndex = doc.agents.findIndex((agent) => agent?.id === agentRegisterData.agent_id);

				if (existingAgentIndex !== -1 && doc.agents[existingAgentIndex]) {
					console.warn(`Agent with ID ${agentRegisterData.agent_id} already exists. Updating state instead.`);
					// Update the existing agent state recursively
					updateNestedObjectRecursively(doc.agents[existingAgentIndex].state, agentRegisterData.initial_state);
				} else {
					// Add the new agent with a deep clone of the initial state
					const deepClonedState = JSON.parse(JSON.stringify(agentRegisterData.initial_state));
					doc.agents.push({
						id: agentRegisterData.agent_id,
						type: agentRegisterData.agent_type,
						created_at: new Date().toISOString(),
						description: "Agent description",
						instructions: "Agent instructions",
						name: "Agent name",
						tasks: [],
						is_active: true,
						paused: false,
						state: deepClonedState,
					});
				}
			} else if (update.type === "agent_state_update") {
				const agentStateData = update.data as AgentStateUpdateData;
				// console.log("Agent state update", JSON.stringify(agentStateData, null, 2));

				// Initialize agents array if it doesn't exist
				if (!doc.agents) {
					doc.agents = [];
				}

				// Find the agent with the matching ID
				const agentIndex = doc.agents.findIndex((agent) => agent?.id === agentStateData.agent_id);

				if (agentIndex !== -1 && doc.agents[agentIndex]) {
					// Agent exists, update its state recursively
					updateNestedObjectRecursively(doc.agents[agentIndex].state, agentStateData.state);
				} else {
					console.warn(`Agent with ID ${agentStateData.agent_id} not found for state update.`);
				}
			} else if (update.type === "navigate_to_path") {
				const navigateToPathData = update.data as NavigateToPathData;
				// console.log("Navigate to path update", JSON.stringify(navigateToPathData, null, 2));

				const { window_id, router_path, view } = navigateToPathData;

				// console.log("NAVIGATING TO PATH", window_id, router_path);

				const selected_window = doc.windows.find((w) => w.id === window_id);

				if (!selected_window) {
					throw new Error("Window not found");
				}

				// Update the window with the new view
				if (view) {
					selected_window.view = view;
				}
			} else if (update.type === "open_window") {
				const openWindowData = update.data as OpenWindowData;
				// console.log("Open window update", JSON.stringify(openWindowData, null, 2));

				doc.windows.push({
					id: openWindowData.window_id,
					// mode: "app",
					view: openWindowData.view,
				});
			} else if (update.type === "close_window") {
				const closeWindowData = update.data as CloseWindowData;
				console.log("Close window update", JSON.stringify(closeWindowData, null, 2));

				const windowIndex = doc.windows.findIndex((w) => w.id === closeWindowData.window_id);

				if (windowIndex === -1) {
					throw new Error("Window not found");
				}

				doc.windows.splice(windowIndex, 1);
			} else if (update.type === "selected_next_steps") {
				// Get the selected options
				const selectedOptions = (update.data as SelectedOptionsData).options || [];

				// Update clicked links and triggered actions in all views
				updateClickedLinks(doc.windows, selectedOptions);
				updateTriggeredActions(doc.windows, selectedOptions);

				// Store the selected options in the events array
				if (!doc.logs) doc.logs = [];
				// Sanitize selected options to remove undefined values
				const sanitizedOptions = JSON.parse(JSON.stringify(selectedOptions));

				doc.logs.push({
					id: (update.data as SelectedOptionsData).id || uuidv4(),
					agent_id: (update.data as SelectedOptionsData).agent_id,
					date: (update.data as SelectedOptionsData).date ? new Date((update.data as SelectedOptionsData).date).toISOString() : new Date().toISOString(),
					type: "selected_options",
					application: "os",
					content: {
						description: "Options selected by the agent",
						options: sanitizedOptions,
					},
				});
			// } else if (update.type === "execution_plan_update") {
			// 	// console.log("Execution plan update", JSON.stringify(update.data, null, 2));

			// 	// The plan data is directly in update.data
			// 	const planData = update.data;
			// 	if (planData) {
			// 		// Deep clone the data to ensure no undefined values
			// 		const sanitizedPlan = JSON.parse(JSON.stringify(planData));
			// 		doc.executionPlan = sanitizedPlan;
			// 	} else {
			// 		// Set to null if no valid plan data
			// 		doc.executionPlan = null;
			// 	}
			} else if (update.type === "work_done") {
				// Handle work_done update
				// console.log("Work done update", JSON.stringify(update.data, null, 2));

				// Store the work done event in the events array
				if (!doc.logs) doc.logs = [];
				doc.logs.push({
					id: (update.data as WorkDoneData).id || uuidv4(),
					agent_id: (update.data as WorkDoneData).agent_id,
					date: (update.data as WorkDoneData).date ? new Date((update.data as WorkDoneData).date).toISOString() : new Date().toISOString(),
					type: "work_done",
					application: "os",
					content: {
						description: "Work completed by the agent",
						text: "Work completed",
					},
				});

				// Update session state to show work is done
				doc.session_state.status = "ready";
				doc.session_state.last_activity = new Date().toISOString();

				// Save snapshot when work is done
				saveSnapshot(sessionId);
			} 
			
			// else if (update.type === "loop_end") {
			// 	// Handle loop end update
			// 	console.log("Loop end update", JSON.stringify(update.data, null, 2));

			// 	// Update session state to show agent is waiting for user query
			// 	doc.session_state.last_activity = new Date().toISOString();
			// } 
			
			else if (update.type === "token_usage") {
				// Handle token usage update
				const tokenUsageData = update.data as TokenUsageData;
				if (tokenUsageData && tokenUsageData.usage) {
					// Update the document's token usage by adding to existing values
					const current_token_usage = doc.token_usage || { input: 0, output: 0, cost: 0 };

					const new_token_usage = {
						input: tokenUsageData.usage.input + current_token_usage.input,
						output: tokenUsageData.usage.output + current_token_usage.output,
						cost: tokenUsageData.usage.cost + current_token_usage.cost,
					};

					console.log("UPDATED TOKEN USAGE", JSON.stringify(new_token_usage, null, 2));

					doc.token_usage = new_token_usage;
				}
			}

			// else if (update.type === "action_parameters_filled") {
			// 	// Handle action parameters filled update
			// 	const actionParamsData = update.data;
			// 	if (!doc.logs) doc.logs = [];

			// 	doc.logs.push(
			// 		JSON.parse(
			// 			JSON.stringify({
			// 				id: actionParamsData.id || uuidv4(),
			// 				date: actionParamsData.date ? new Date(actionParamsData.date).toISOString() : new Date().toISOString(),
			// 				type: "action_parameters_filled",
			// 				application: "os",
			// 				content: {
			// 					description: "Action parameters filled by the agent",
			// 					action_id: actionParamsData.actionId,
			// 					parameters: actionParamsData.parameters,
			// 					text: `Parameters filled for action ${actionParamsData.actionId}`,
			// 				} as ActionEventContent,
			// 			}),
			// 		),
			// 	);
			// }
			else if (update.type === "received_user_query") {
				// Handle received user query update
				console.log("Received user query update", JSON.stringify(update.data, null, 2));

				// Update session state to show agent is waiting for user query
				doc.session_state.status = "ready";
				doc.session_state.last_activity = new Date().toISOString();

				doc.logs.push({
					id: update.data.id,
					agent_id: update.data.agent_id,
					date: update.data.date ? new Date(update.data.date).toISOString() : new Date().toISOString(),
					type: "user_query",
					application: "os",
					content: {
						description: "User query received by the agent",
						text: update.data.content,
					},
				});
			} else if (update.type === "start_action") {
				console.log("Handling START_ACTION", JSON.stringify(update.data, null, 2));

				const action_report = update.data;

				const selected_window = doc.windows.find((w) => w.id === action_report.window_id);

				if (!selected_window) {
					throw new Error("Window not found");
				}

				doc.actions.push(action_report);

				doc.session_state.last_activity = new Date().toISOString();
				doc.session_state.status = "streaming";
			} else if (update.type === "fill_fields") {
				console.log("Handling FILL_FIELDS", JSON.stringify(update.data, null, 2));

				const action_report = update.data;

				// const selected_window = doc.windows.find((w) => w.id === action_report.window_id);

				// if (!selected_window) {
				// 	throw new Error("Window not found");
				// }

				const report = doc.actions.find((action) => action.id === action_report.id);

				if (!report) {
					throw new Error("Action not found");
				}

				report.fields = action_report.fields;
				report.state = action_report.state;
			} else if (update.type === "apply_action") {
				console.log("Handling APPLY_ACTION", JSON.stringify(update.data, null, 2));

				const action_report = update.data;

				// const selected_window = doc.windows.find((w) => w.id === action_report.window_id);

				// if (!selected_window) {
				// 	throw new Error("Window not found");
				// }

				const report = doc.actions.find((action) => action.id === action_report.id);

				if (!report) {
					throw new Error("Action not found");
				}

				report.state = action_report.state;
				report.fields = action_report.fields;
				report.output = action_report.output;
			} else if (update.type === "relationship_choice") {
				const choice = update.data as RelationshipChoiceReport;
				if (!doc.relationship_choices) doc.relationship_choices = [];
				const idx = doc.relationship_choices.findIndex((c) => c.id === choice.id);
				if (idx !== -1) {
					doc.relationship_choices[idx] = choice;
				} else {
					doc.relationship_choices.push(choice);
				}

			} else if (update.type === "action_choice") {
				const choice = update.data as ActionChoiceReport;
				if (!doc.action_choices) doc.action_choices = [];
				const idx = doc.action_choices.findIndex((c) => c.id === choice.id);
				if (idx !== -1) {
					doc.action_choices[idx] = choice;
				} else {
					doc.action_choices.push(choice);
				}

			} else if (update.type === "permission_request") {
				const request = update.data as PermissionRequest;
				if (!doc.permission_requests) doc.permission_requests = [];
				const idx = doc.permission_requests.findIndex((r) => r.id === request.id);
				if (idx !== -1) {
					doc.permission_requests[idx] = request;
				} else {
					doc.permission_requests.push(request);
				}

			} else if (update.type === "action_approval") {
				const approval = update.data as ActionApprovalRequest;
				if (!doc.action_approvals) doc.action_approvals = [];
				const idx = doc.action_approvals.findIndex((a) => a.id === approval.id);
				if (idx !== -1) {
					doc.action_approvals[idx] = approval;
				} else {
					doc.action_approvals.push(approval);
				}

			} else if (update.type === "prerequisite") {
				const follow = update.data as Prerequisite;
				if (!doc.prerequisites) doc.prerequisites = [];
				const idx = doc.prerequisites.findIndex((f) => f.id === follow.id);
				if (idx !== -1) {
					doc.prerequisites[idx] = follow;
				} else {
					doc.prerequisites.push(follow);
				}

			} else if (update.type === "background_job") {
				const job = update.data as BackgroundJobReport;
				if (!doc.background_jobs) doc.background_jobs = [];
				const idx = doc.background_jobs.findIndex((b) => b.id === job.id);
				if (idx !== -1) {
					doc.background_jobs[idx] = job;
				} else {
					doc.background_jobs.push(job);
				}
			} else {
				console.log("Unknown update type", update);
				// throw new Error("Unknown update type " + update.type);
			}
		});

		// Broadcast changes to all clients
		broadcastChanges(sessionId);
	});

	// Create OS instance
	const os = new Os(effectsStream, doc);

	return {
		id: sessionId,
		doc,
		os,
		// effectsStream,
		clients: new Set(),
		lastActivity: new Date(),
		snapshotPath,
	};
}

// Save session snapshot to disk
export function saveSnapshot(sessionId: string) {
	const session = sessions.get(sessionId);
	if (!session) return;

	try {
		const binary = Automerge.save<OsDocument>(session.doc);
		fs.writeFileSync(session.snapshotPath, binary);
		console.log(`Saved snapshot for session ${sessionId}`);
	} catch (err) {
		console.error(`Failed to save snapshot for session ${sessionId}:`, err);
	}
}

// Broadcast changes to all clients in a session
export function broadcastChanges(sessionId: string) {
	const session = sessions.get(sessionId);
	if (!session) return;

	const message = JSON.stringify({
		type: "update",
		data: Array.from(Automerge.save<OsDocument>(session.doc)), // Convert Uint8Array to regular array for JSON
	});

	for (const client of session.clients) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	}
}

// Store active sessions
export const sessions = new Map<string, Session>();

/**
 * Updates a nested object recursively property by property
 * to avoid Automerge reference issues
 */
function updateNestedObjectRecursively(target: any, source: any): void {
	// If source is null or undefined, skip update
	if (source === null || source === undefined) {
		return;
	}

	// Process each property in the source object
	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			const sourceValue = source[key];

			// If this is an array, replace it entirely (with a deep clone)
			if (Array.isArray(sourceValue)) {
				// Deep clone the array to avoid reference issues
				target[key] = JSON.parse(JSON.stringify(sourceValue));
			}
			// If this is an object and not null, recursively update its properties
			else if (typeof sourceValue === "object" && sourceValue !== null) {
				// If the target doesn't have this property or it's not an object, initialize it
				if (!target[key] || typeof target[key] !== "object") {
					target[key] = {};
				}
				// Recursively update this nested object
				updateNestedObjectRecursively(target[key], sourceValue);
			}
			// For primitives and other values, assign directly
			else {
				target[key] = sourceValue;
			}
		}
	}
}
