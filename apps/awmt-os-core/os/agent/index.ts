import PlannerAgent, { AgentExecutionPlan } from "./planner_agent";
import ToolsSelector from "./tools_selector";

import type { OsLog, OsDocument, RankedOption } from "@joshu/os-types";
import type Os from "../os";
import { AbstractAgent, uuidv4 } from "./abstract_agent";

// Define a specific state type for the agent
interface AgentState {
	counter: number;
	loopCount: number;
	lastAction: string | null;
}

export default class Agent extends AbstractAgent<AgentState> {
	constructor(os: Os, doc: OsDocument) {
		// Initialize with default state
		super(os, doc, {
			counter: 0,
			loopCount: 0,
			lastAction: null,
		});

		this.execution_plan = new AgentExecutionPlan();

		this.effect.thought("Thinking...");

		this.doc = doc;
	}

	execution_plan: AgentExecutionPlan;
	current_execution_code_plan: string | null = null;

	consecutive_no_tool_selections: number = 0;

	async start(query: string) {
		console.log("AGENT START, DOC WINDOWS:", this.doc.windows.length);
		console.log("AGENT START, OS WINDOWS:", this.os.windows_open.length);

		this.logs.append_message(this.id, query);

		this.effect.received_user_query(query);

		// Increment counter at start
		this.updateState({
			counter: this.getState().counter + 1,
			lastAction: "start",
		});

		// await this.load_apps();

		const planner_agent = new PlannerAgent(this);
		const execution_plan = await planner_agent.execute_additive_plan();

		this.current_execution_code_plan = planner_agent.current_plan_code;
		this.execution_plan = execution_plan;

		// await this.load_desktop();

		let should_continue = true;

		while (should_continue && !this.is_paused) {
			should_continue = await this.loop();
			console.log("Should continue", should_continue);
		}

		if (this.is_paused) {
			console.log("OS is paused. Waiting for resume...");
			return this;
		}

		// Mark all tasks as done
		this.execution_plan.get_all_tasks().forEach((task) => {
			task.is_done = true;
		});

		// Increment counter at completion
		this.updateState({
			counter: this.getState().counter + 1,
			lastAction: "completed",
		});

		this.effect.work_done();

		return this;
	}

	async loop() {
		if (this.is_paused) {
			console.log("OS is paused. Waiting for resume...");
			return true;
		}

		// Increment loop count
		const currentState = this.getState();
		this.updateState({
			loopCount: currentState.loopCount + 1,
			lastAction: "loop",
		});

		console.log("LOOPING, the os has x windows open : ", this.os.windows_open.length);
		console.log("Current agent state:", this.getState());

		// Call events analyzer
		const planner_agent = new PlannerAgent(this);

		// First, execute the additive plan to create/modify tasks
		const execution_plan = await planner_agent.execute_additive_plan();

		this.current_execution_code_plan = planner_agent.current_plan_code;
		this.execution_plan = execution_plan;

		// Call Tools selector
		const tools_selector = new ToolsSelector(this);
		const selected_tools = await tools_selector.select_tools();

		console.log("SELECTED TOOLS", JSON.stringify(selected_tools, null, 2));

		if (selected_tools.length === 0) {
			this.logs.append({
				application: "os",
				agent_id: this.id,
				content: {
					description: "No link was clicked, and no action was selected in the last loop",
					text: "Maybe you can try to do something else, or update the execution plan",
				},
				date: new Date(),
				id: uuidv4(),
				type: "observation",
			});
		}

		// Track consecutive loops with no tool selection
		if (!this.consecutive_no_tool_selections) {
			this.consecutive_no_tool_selections = 0;
		}

		if (selected_tools.length === 0) {
			this.consecutive_no_tool_selections++;
			console.log(`No tools selected for ${this.consecutive_no_tool_selections} consecutive loops`);

			// If no tool has been selected 3 times in a row, mark all tasks as done and end the loop
			if (this.consecutive_no_tool_selections >= 3) {
				console.log("No tools selected for 3 consecutive loops. Marking all tasks as done and ending the loop.");
				this.execution_plan.get_all_tasks().forEach((task) => {
					task.is_done = true;
				});
				return false;
			}
		} else {
			// Reset the counter if tools were selected
			this.consecutive_no_tool_selections = 0;
		}

		const opened_links = await this.open_links(selected_tools);
		const action_to_execute = this.select_action(selected_tools);

		// Update counter based on actions
		if (opened_links.length > 0 || action_to_execute) {
			this.updateState({
				counter: this.getState().counter + 1,
				lastAction: opened_links.length > 0 ? "opened_link" : "executed_action",
			});
		}

		console.log("Chosen outcomes", JSON.stringify(opened_links, null, 2), JSON.stringify(action_to_execute, null, 2));

		// Execute the action if one was selected
		if (action_to_execute) {
			await this.start_action(action_to_execute);
		}

		// After executing actions, run the subtractive plan to mark tasks as completed or remove them
		// const updated_plan = await planner_agent.execute_subtractive_plan();
		// this.current_execution_code_plan = planner_agent.current_plan_code;
		// this.execution_plan = updated_plan;

		if (execution_plan.get_all_tasks().some((task) => !task.is_done)) {
			return true;
		}

		return false;
	}

	private async open_links(selected_tools: RankedOption[]): Promise<RankedOption[]> {
		const selected_links = selected_tools.filter((tool) => tool.type === "click_link");
		const views_to_load: RankedOption[] = [];

		// Process all selected links (views)
		for (const selected_tool of selected_links) {
			// console.log('Loading view', JSON.stringify(selected_tool, null, 2));

			const selected_link = selected_tool.serialized_view?.clickable_links.find((link) => link.alias === selected_tool.token);

			if (selected_link) {
				const current_window = this.doc.windows.find((window) => window.id === selected_tool.window_id);

				if (current_window) {
					try {
						// await this.load_view(current_window);

						console.log("LINK TO NAVIGATE TO", selected_link);

						if (selected_link.router_path.startsWith("/apps/")) {
							await this.os.open_app(selected_link.router_path.replace("/apps/", ""));
						} else {
							await this.os.navigate(current_window.id, selected_link.router_path);
						}

						this.logs.append({
							id: uuidv4(),
							date: new Date(),
							agent_id: this.id,
							type: "navigation",
							application: "os",
							content: {
								opened_view_id: selected_tool.window_id,
								opened_view_label: selected_tool.name,
								opened_view_description: selected_tool.description,
							},
						});

						views_to_load.push(selected_tool);
					} catch (error) {
						console.error("Error loading view", error);
					}
				} else {
					console.log("Window not found");
				}
			}
		}

		return views_to_load;
	}

	private select_action(selected_tools: RankedOption[]): RankedOption | null {
		const most_relevant_action = selected_tools.find((tool) => tool.type === "action" || tool.type === "close_window");

		if (most_relevant_action && most_relevant_action.score > 0.5) {
			console.log("Executing action", JSON.stringify(most_relevant_action, null, 2));
			return most_relevant_action;
		}

		return null;
	}

	// async load_view(window_id: string, view_path: string) {
	// 	const view = new View(view_path);

	// 	await view.render();

	// 	const window = { id: window_id, view };

	// 	// this.windows_open.push(window);

	// 	const current_window = this.windows_open.find((window) => window.id === window_id);
	// 	const current_window_index = this.windows_open.findIndex((window) => window.id === window_id);

	// 	if (current_window) {
	// 		this.windows_open[current_window_index] = window;
	// 	} else {
	// 		this.windows_open.push(window);
	// 	}

	// 	this.effectsStream.navigate_to_path(window_id, view_path);

	// 	// const serialized_views = await Promise.all(this.windows_open.map(async (window) => await window.view.print()));

	// 	// this.effectsStream.loaded_views(serialized_views);

	// 	return view;
	// }

	// async close_window(window_id: string) {
	// 	// const windowIndex = this.doc.windows.findIndex((window) => window.id === window_id);
	// 	// if (windowIndex !== -1) {
	// 	// 	this.doc.windows.splice(windowIndex, 1);
	// 	// }

	// 	// const serialized_views = await Promise.all(this.windows_open.map(async (window) => await window.view.print()));
	// 	// this.effectsStream.loaded_views(serialized_views);

	// 	this.os.close_window(window_id);
	// }

	async pause() {
		console.log("PAUSING OS");
		this.is_paused = true;
		this.effect.update_pause_state(true);
	}

	async resume() {
		console.log("RESUMING OS");
		this.is_paused = false;
		this.effect.update_pause_state(false);

		let should_continue = true;

		while (should_continue && !this.is_paused) {
			should_continue = await this.loop();
			console.log("Should continue", should_continue);
		}

		if (this.is_paused) {
			console.log("OS is paused. Waiting for resume...");
			return;
		}

		// Mark all tasks as done
		this.execution_plan.get_all_tasks().forEach((task) => {
			task.is_done = true;
		});

		this.effect.work_done();
	}

	private async start_action(action: RankedOption): Promise<any> {
		const selected_action = action.serialized_view.actions.find((a) => a.alias === action.token);

		const current_window = this.doc.windows.find((window) => window.id === action.serialized_view.window_id);

		if (!current_window) {
			console.error("Window not found ");
			return null;
		}

		if (!selected_action) {
			console.error("Action not found");
			return null;
		}

		console.log("Selected action:", selected_action);

		this.os.start_action(current_window.id, selected_action.alias, selected_action.action_path, "agent");

		this.logs.append({
			id: uuidv4(),
			date: new Date(),
			agent_id: this.id,
			type: "action",
			application: "os",
			content: {
				action_id: selected_action.alias,
			},
		});

		// const tool_executor = new ToolExecutorAgent(this);
		// const tool_executor = new ToolExecutorAgent(this);

		// // Get the action details
		// const actionDetails = action.serialized_view.actions.find((a) => a.alias === action.token);

		// // Check if this is a close window action by output_type
		// if (actionDetails && actionDetails.output_type === "close_window") {
		// 	// This is a close window action, handled directly by the tool executor
		// 	return await tool_executor.executor(action);
		// }

		// // For other actions, continue with the existing logic
		// const tool_call = await tool_executor.executor(action);

		// // Here you would call your API with the tool call
		// // For now, let's simulate a response
		// const action_result = await this.handle_action_call(action, tool_call);

		// // Create a view component from the action result
		// const result_view = await this.create_action_result_view(action, tool_call, action_result);

		// // Add the result view to loaded views
		// this.windows_open.push({ id: result_view.model_path, view: result_view });

		// // Update the effectsStream with all loaded views
		// const serialized_views = await Promise.all(this.windows_open.map(async (window) => await window.view.print()));
		// this.effectsStream.loaded_views(serialized_views);

		// return action_result;
	}

	// Method to handle the API call for the action
	private async handle_action_call(action: RankedOption, tool_call: any): Promise<any> {
		// This is where you would make the actual API call
		// For now, let's return a mock response
		console.log(`Handling action call for ${action.name}`);

		// Simulate API call delay
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Return a mock response based on the action
		return {
			id: uuidv4(),
			timestamp: new Date().toISOString(),
			status: "success",
			data: {
				// Mock data based on action output_type
				result: `Result of executing ${action.name}`,
				// Add more fields as needed
			},
		};
	}

	// Method to create a view from the action result using ModelDisplayViewComponent
	// private async create_action_result_view(action: RankedOption, tool_call: any, action_result: any): Promise<View> {
	// 	// Create a special view for the action result
	// 	const view_path = `action_result_${action_result.id}`;
	// 	const view = new View(view_path);

	// 	// Create a model path for the result data
	// 	const model_path = `action_result_model_${action_result.id}`;

	// 	// Create a ModelDisplayViewComponent for the action result
	// 	view._view_component = ModelDisplayComponent({
	// 		path: view_path,
	// 		label: `Result of ${action.name}`,
	// 		description: `This view shows the result of executing the action "${action.name}". Action ID: ${action_result.id}, Timestamp: ${action_result.timestamp}`,
	// 		model: model_path,
	// 	});

	// 	// Add metadata to the component
	// 	view._view_component.metadata = {
	// 		action_id: action.token,
	// 		action_name: action.name,
	// 		tool_call: tool_call,
	// 		result: action_result,
	// 		timestamp: new Date().toISOString(),
	// 	};

	// 	view._loaded = true;
	// 	view._label = `Result of ${action.name}`;
	// 	view._description = `This view shows the result of executing the action "${action.name}"`;

	// 	return view;
	// }

	// async close_view(view_path: string) {
	// 	console.log("CALLED CLOSE_VIEW IN OS", view_path);

	// 	// Don't allow closing the desktop view
	// 	if (view_path === "desktop") {
	// 		console.log("Cannot close desktop view");
	// 		return false;
	// 	}

	// 	// Find the view index
	// 	const viewIndex = this.doc.windows.findIndex((window) => window.view.model_path === view_path);

	// 	if (viewIndex === -1) {
	// 		console.log("View not found:", view_path);
	// 		return false;
	// 	}

	// 	// Remove the view from views_open
	// 	this.windows_open.splice(viewIndex, 1);

	// 	// Log the action in the logs stream
	// 	this.logs.append({
	// 		id: uuidv4(),
	// 		date: new Date(),
	// 		type: "navigation",
	// 		application: "os",
	// 		content: {
	// 			closed_view_id: view_path,
	// 			action: "close_view",
	// 		},
	// 	});

	// 	// Update the effectsStream with all loaded views
	// 	// const serialized_views = await Promise.all(this.windows_open.map(async (window) => await window.view.print()));
	// 	// this.effectsStream.loaded_views(serialized_views);

	// 	this.effectsStream.close_window(window_id);

	// 	return true;
	// }
}
