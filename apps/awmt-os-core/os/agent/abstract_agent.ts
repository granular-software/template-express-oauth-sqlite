import type { OsLog, OsDocument, RankedOption, TokenUsage } from "@joshu/os-types";
import type Os from "../os";

export function uuidv4(): string {
	return crypto.randomUUID();
}

export class LogsStream {
	constructor() {
		this.logs = [];
	}

	private logs: OsLog[];

	get_stream() {
		return this.logs;
	}

	append(log: OsLog) {
		this.logs.push(log);
	}

	append_message(agent_id: string, message: string) {
		this.append({
			id: uuidv4(),
			date: new Date(),
			type: "user_query",
			application: "os",
			agent_id: agent_id,
			content: {
				description: "Goal or task given by the user, that you need to fulfill",
				text: message,
			},
		});
	}
}

export abstract class AbstractAgent<StateType extends Record<string, any> = Record<string, any>> {
	constructor(
		public os: Os,
		public doc: OsDocument,
		initialState: StateType = {} as StateType,
	) {
		this.logs = new LogsStream();
		this.id = uuidv4();
		this._state = initialState;
		// this.registerAgent(initialState);
	}

	private _state: StateType;
	readonly id: string;
	is_paused: boolean = false;
	logs: LogsStream;

	token_usage: {
		input: number;
		output: number;
		cost: number;
	} = {
		input: 0,
		output: 0,
		cost: 0,
	};

	// Register the agent with the document
	private registerAgent(initialState: StateType): void {
		this.effect.register_agent(initialState);
	}

	// Get the current state
	getState(): StateType {
		return { ...this._state };
	}

	// Update the state
	updateState(newState: Partial<StateType>): void {
		this._state = { ...this._state, ...newState };
		this.effect.update_agent_state(newState);
	}

	abstract start(query: string): Promise<this>;

	abstract loop(): Promise<boolean>;

	abstract pause(): Promise<void>;

	abstract resume(): Promise<void>;

	public effect = {
		thought: (thought: string) => {
			this.os.emit_agent_effect.thought(this.id, thought);
		},
		received_user_query: (query: string) => {
			this.os.emit_agent_effect.received_user_query(this.id, query);
		},
		work_done: () => {
			this.os.emit_agent_effect.work_done(this.id);
		},
		selected_options: (options: RankedOption[]) => {
			this.os.emit_agent_effect.selected_options(this.id, options);
		},
		token_usage: (usage: TokenUsage) => {
			this.os.emit_agent_effect.token_usage(this.id, usage);
		},
		update_pause_state: (paused: boolean) => {
			this.os.emit_agent_effect.update_pause_state(this.id, paused);
		},
		update_agent_state: (state: Partial<StateType>) => {
			this.os.emit_agent_effect.update_agent_state(this.id, state);
		},
		register_agent: (initialState: StateType) => {
			this.os.emit_agent_effect.register_agent(this.id, this.constructor.name, initialState);
		},
	};

	record_token_usage(input: number, output: number, model: string): void {
		let inputCost = 0;
		let outputCost = 0;

		// Pricing per million tokens (examples - adjust with actual pricing)
		switch (model) {
			case "gpt-4o":
				inputCost = input * (10 / 1000000); // $10 per million input tokens
				outputCost = output * (30 / 1000000); // $30 per million output tokens
				break;
			case "claude-3-opus-20240229":
				inputCost = input * (15 / 1000000); // $15 per million input tokens
				outputCost = output * (75 / 1000000); // $75 per million output tokens
				break;
			case "claude-3-sonnet-20240229":
				inputCost = input * (3 / 1000000); // $3 per million input tokens
				outputCost = output * (15 / 1000000); // $15 per million output tokens
				break;
			case "claude-3-haiku-20240307":
				inputCost = input * (0.25 / 1000000); // $0.25 per million input tokens
				outputCost = output * (1.25 / 1000000); // $1.25 per million output tokens
				break;
			case "gpt-4.1-mini":
				inputCost = input * (0.4 / 1000000); // $0.15 per million input tokens
				outputCost = output * (1.6 / 1000000); // $0.60 per million output tokens
				break;
			case "gpt-4.1":
				inputCost = input * (2 / 1000000); // $0.15 per million input tokens
				outputCost = output * (8 / 1000000); // $0.60 per million output tokens
				break;
			case "deepseek-chat":
				inputCost = input * (0.27 / 1000000); // $0.20 per million input tokens
				outputCost = output * (1.1 / 1000000); // $0.80 per million output tokens
				break;
			default:
				// Default pricing if model not recognized
				inputCost = input * (0 / 1000000); // $5 per million input tokens
				outputCost = output * (20 / 1000000); // $15 per million output tokens
		}

		// Add to total cost
		// this.token_usage.cost += inputCost + outputCost;

		this.effect.token_usage({
			input: input,
			output: output,
			cost: inputCost + outputCost,
		});

		// Log token usage for debugging
		console.log(`Token usage updated - Model: ${model}, Input: ${input}, Output: ${output}, Cost: $${(inputCost + outputCost).toFixed(6)}`);
	}
}
