import EffectsStream from "../effects_stream";
import OpenAI from "openai";
import Os from "../os";
import { type RankedOption, type TriggerableAction } from "@joshu/os-types";

import { createOpenAIClient, getModelName } from "../config/modelConfig";
import { encoding_for_model } from "tiktoken";
import type { TiktokenModel } from "tiktoken";
// import type { RenderedAction } from "@joshu/os-types";
import type Agent from ".";
import { uuidv4 } from "./abstract_agent";

export default class ToolExecutorAgent {
	private model: string = getModelName();
	// private os: Os;
	// private effectsStream: EffectsStream;

	public agent: Agent;

	constructor(agent: Agent) {
		this.agent = agent;
		// this.os = agent.os;
		// this.effectsStream = os.effectsStream;
	}

	async executor(action: RankedOption): Promise<any> {
		this.agent.effect.thought(`Executing action: ${action.name}`);

		console.log(`Executing action from tool executor agent:`, action);

		// Extract action details from the serialized view
		const actionDetails = action.serialized_view.actions.find((a) => a.alias === action.token);

		if (!actionDetails) {
			throw new Error(`Action details not found for token: ${action.token}`);
		}

		// Check if this is a close window action by output_type
		if (action.type === "close_window") {
			// This is a close window action
			const viewToClose = action.window_id;

			console.log("FOUND VIEW TO CLOSE", action);

			if (viewToClose) {
				// Call the close_view method on the OS
				const result = await this.agent.os.close_window(viewToClose);

				// Log the action execution in the logs stream
				this.agent.logs.append({
					id: uuidv4(),
					date: new Date(),
					type: "action",
					agent_id: this.agent.id,
					application: "os",
					content: {
						action_id: action.token,
						action_name: action.name,
						action_description: actionDetails.description,
						result: result ? "success" : "failed",
						view_closed: viewToClose,
					},
				});

				return { success: result, view_closed: viewToClose };
			}

			return { success: false, error: "No view specified to close" };
		}

		// For other actions, continue with the existing logic
		const toolCall = await this._generate_tool_call(action, actionDetails);

		// Log the action execution in the logs stream
		this.agent.logs.append({
			id: uuidv4(),
			date: new Date(),
			type: "action",
			agent_id: this.agent.id,
			application: "os",
			content: {
				action_id: action.token,
				action_name: action.name,
				action_description: actionDetails.description,
				tool_call: toolCall,
			},
		});

		return toolCall;
	}

	private async _generate_tool_call(action: RankedOption, actionDetails: TriggerableAction): Promise<any> {
		// Create a JSON schema for the tool based on the action fields
		const parameterProperties: Record<string, any> = {};
		const requiredFields: string[] = [];

		if (actionDetails.fields) {
			actionDetails.fields.forEach((field: any) => {
				let fieldSchema: any = {
					type: this._mapTypeToJsonSchemaType(field.type),
					description: field.description || `${field.name} parameter`,
				};

				// Add additional schema properties based on field type
				if (field.type === "enum" && field.options) {
					fieldSchema.enum = field.options;
				}

				parameterProperties[field.name] = fieldSchema;

				if (field.required) {
					requiredFields.push(field.name);
				}
			});
		}

		const toolDefinition = {
			type: "function",
			function: {
				name: action.token,
				description: actionDetails.description,
				parameters: {
					type: "object",
					properties: parameterProperties,
					required: requiredFields,
				},
			},
		};

		console.log(`Tool definition: ${JSON.stringify(toolDefinition, null, 2)}`);

		const prompt = `You are Joshu, a helpful AI agent navigating a virtual computer to fulfill user demands.

You need to execute an action by generating a tool call with appropriate parameters.

<events_stream>
${this.agent.logs
	.get_stream()
	.map((log) => `[${log.date.toString()}] ${log.type.toUpperCase()} - ${log.application || "System"}: ${typeof log.content === "string" ? log.content : JSON.stringify(log.content)}`)
	.join("\n")}
</events_stream>

<current_execution_plan>
${this.agent.execution_plan.tasks
	.map((task, i) => {
		const prerequisites = task.prerequisites && task.prerequisites.length > 0 ? `\n    Prerequisites: ${task.prerequisites.map((prerequisite) => `${prerequisite.name}: ${prerequisite.description}`).join(", ")}` : "";
		const subtasks =
			task.subtasks && task.subtasks.length > 0
				? "\n" +
					task.subtasks
						.map((subtask, j) => {
							const subtaskPrerequisites = subtask.prerequisites && subtask.prerequisites.length > 0 ? `\n        Prerequisites: ${subtask.prerequisites.map((prerequisite) => `${prerequisite.name}: ${prerequisite.description}`).join(", ")}` : "";
							return `    Subtask ${i + 1}.${j + 1}: ${subtask.title} (Status: ${subtask.is_done ? "Completed" : "Pending"})${subtaskPrerequisites}`;
						})
						.join("\n")
				: "";

		return `Task ${i + 1}: ${task.title} (Status: ${task.is_done ? "Completed" : "Pending"})${prerequisites}${subtasks}`;
	})
	.join("\n\n")}
</current_execution_plan>

<tool_definition>
${JSON.stringify(toolDefinition, null, 2)}
</tool_definition>

You need to execute the action "${action.name}".
Based on the context and the tool definition above, generate appropriate values for each parameter.
Your response should be a valid JSON object with parameter names as keys and appropriate values that match the schema.
`;

		try {
			const openai = createOpenAIClient();

			// Get the encoding for the current model
			const enc = encoding_for_model("chatgpt-4o-latest");

			// Count tokens for system message and prompt
			const systemMessage = "You are a helpful assistant that generates tool calls with appropriate parameters.";
			const inputTokens = enc.encode(systemMessage).length + enc.encode(prompt).length;

			const response = await openai.chat.completions.create({
				model: this.model,
				messages: [
					{ role: "system", content: systemMessage },
					{ role: "user", content: prompt },
				],
				temperature: 0.2,
				response_format: { type: "json_object" },
			});

			// console.log("AMOUNT OF INPUT TOKENS (TEA)", inputTokens);

			const content = response.choices[0]?.message?.content;

			console.log(`Response: ${content}`);

			if (!content) {
				throw new Error("Failed to generate tool call parameters");
			}

			// Count output tokens
			const outputTokens = enc.encode(content).length;

			// Free the encoder to prevent memory leaks
			enc.free();

			// Parse the JSON response
			const toolCallParams = JSON.parse(content);

			// Create the final tool call object
			const toolCall = {
				action_id: action.token,
				action_name: action.name,
				parameters: toolCallParams,
				timestamp: new Date().toISOString(),
			};

			const p = toolCallParams as Record<string, string | number | boolean>;

			const p_as_array = Object.entries(p).map(([name, value]) => ({
				name,
				type: typeof value as "string" | "number" | "boolean",
				value: value as string | number | boolean,
			}));

			console.log("Generated tool call:", JSON.stringify(toolCall, null, 2));

			// this.agent.effect.action_parameters_filled(action, p_as_array);

			// Update token usage with accurate counts
			this.agent.record_token_usage(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, this.model);

			return toolCall;
		} catch (error) {
			console.error("Error generating tool call:", error);
			throw error;
		}
	}

	// Helper method to map field types to JSON Schema types
	private _mapTypeToJsonSchemaType(fieldType: string): string {
		const typeMap: Record<string, string> = {
			string: "string",
			number: "number",
			integer: "integer",
			boolean: "boolean",
			array: "array",
			object: "object",
			enum: "string",
			date: "string",
			datetime: "string",
			file: "string",
			url: "string",
			email: "string",
		};

		return typeMap[fieldType.toLowerCase()] || "string";
	}
}
