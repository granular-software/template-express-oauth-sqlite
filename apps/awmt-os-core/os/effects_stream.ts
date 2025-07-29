import type {
	ActionReport,
	FieldDefinition,
	RankedOption,
	SerializedView,
	RelationshipChoiceReport,
	ActionChoiceReport,
	PermissionRequest,
	ActionApprovalRequest,
	Prerequisite,
	BackgroundJobReport,
} from "@joshu/os-types";
import { type TokenUsage } from "./types";

// export type RecordedEvent =
// 	| {
// 			type: "thought";
// 			data: ThoughtData;
// 	  }
// 	| {
// 			type: "execution_plan_update";
// 			data: ExecutionPlanData;
// 	  }
// 	| {
// 			type: "selected_options";
// 			data: SelectedOptionsData;
// 	  }
// 	| {
// 			type: "work_done";
// 			data: WorkDoneData;
// 	  }
// 	| {
// 			type: "token_usage";
// 			data: TokenUsageData;
// 	  }
// 	| {
// 			type: "received_user_query";
// 			data: ReceivedUserQueryData;
// 	  }
// 	| {
// 			type: "loop_end";
// 			data: LoopEndData;
// 	  }
// 	| {
// 			type: "pause_state_update";
// 			data: PauseStateData;
// 	  }
// 	| {
// 			type: "navigate_to_path";
// 			data: NavigateToPathData;
// 	  }
// 	| {
// 			type: "open_window";
// 			data: OpenWindowData;
// 	  }
// 	| {
// 			type: "close_window";
// 			data: CloseWindowData;
// 	  }
// 	| {
// 			type: "agent_state_update";
// 			data: AgentStateUpdateData;
// 	  }
// 	| {
// 			type: "agent_register";
// 			data: AgentRegisterData;
// 	  }
// 	| {
// 			type: "start_action";
// 			data: ActionReport;
// 	  }
// 	| {
// 			type: "fill_fields";
// 			data: ActionReport;
// 	  }
// 	| {
// 			type: "apply_action";
// 			data: ActionReport;
// 	  };

// export type LoadedViewsData = {
// 	windows: {
// 		id: string;
// 		view: SerializedView;
// 	}[];
// };

// export type ExecutionPlanData = {
// 	id: string;
// 	date: number;
// 	tasks: any[];
// 	validation?: {
// 		valid: boolean;
// 		issues: string[];
// 	};
// 	stats?: {
// 		total_tasks: number;
// 		completed_tasks: number;
// 		in_progress_tasks: number;
// 		blocked_tasks: number;
// 		not_started_tasks: number;
// 		total_progress_percentage: number;
// 	};
// };

// export type SelectedOptionsData = {
// 	id: string;
// 	date: number;
// 	agent_id: string;
// 	options: RankedOption[];
// };

// export type ActionParametersData = {
// 	id: string;
// 	actionId: string;
// 	date: number;
// 	parameters: {
// 		name: string;
// 		type: string;
// 		value: string | number | boolean;
// 	}[];
// };

// export type WorkDoneData = {
// 	id: string;
// 	agent_id: string;
// 	date: number;
// };

// export type LoopEndData = {
// 	id: string;
// 	date: number;
// };

// export type TokenUsageData = {
// 	usage: TokenUsage;
// };

// export type ReceivedUserQueryData = {
// 	id: string;
// 	agent_id: string;
// 	date: number;
// 	content: string;
// };

// export type PauseStateData = {
// 	id: string;
// 	date: number;
// 	paused: boolean;
// };

export type NavigateToPathData = {
	id: string;
	date: number;
	window_id: string;
	router_path: string;
	view: SerializedView;
};

// export type OpenWindowData = {
// 	id: string;
// 	date: number;
// 	window_id: string;
// 	router_path: string;
// 	view: SerializedView;
// };

// export type CloseWindowData = {
// 	id: string;
// 	date: number;
// 	window_id: string;
// };

export type AgentStateUpdateData = {
	id: string;
	date: number;
	agent_id: string;
	state: Record<string, any>;
};

export type AgentRegisterData = {
	id: string;
	date: number;
	agent_id: string;
	agent_type: string;
	initial_state: Record<string, any>;
};

// export type StartActionData = {
// 	id: string;
// 	date: number;
// 	window_id: string;
// 	router_path: string;
// 	action_path: string;
// };

// export type FillFieldsData = {
// 	id: string;
// 	date: number;
// 	action_id: string;
// 	fields: FieldDefinition[];
// };

// export type ApplyActionData = {
// 	id: string;
// 	date: number;
// 	action_id: string;
// };

// export default class EffectsStream {
// 	constructor(private onUpdate: (update: RecordedEvent) => void) {}

// 	thought(thought: string) {
// 		this.onUpdate({
// 			type: "thought",
// 			data: {
// 				id: crypto.randomUUID(),
// 				date: Date.now(),
// 				thought,
// 			},
// 		});
// 	}

// 	navigate({ window_id, router_path, view }: { window_id: string; router_path: string; view: SerializedView }) {
// 		this.onUpdate({
// 			type: "navigate_to_path",
// 			data: { id: crypto.randomUUID(), date: Date.now(), window_id, router_path, view },
// 		});
// 	}

// 	open_window({ window_id, router_path, view }: { window_id: string; router_path: string; view: SerializedView }) {
// 		this.onUpdate({
// 			type: "open_window",
// 			data: { id: crypto.randomUUID(), date: Date.now(), window_id, router_path, view },
// 		});
// 	}

// 	close_window(window_id: string) {
// 		this.onUpdate({
// 			type: "close_window",
// 			data: { id: crypto.randomUUID(), date: Date.now(), window_id },
// 		});
// 	}

// 	execution_plan_update(plan: ExecutionPlanData) {
// 		this.onUpdate({
// 			type: "execution_plan_update",
// 			data: {
// 				...plan,
// 				date: Date.now(),
// 			},
// 		});
// 	}

// 	selected_options(agent_id: string, options: RankedOption[]) {
// 		this.onUpdate({
// 			type: "selected_options",
// 			data: {
// 				id: crypto.randomUUID(),
// 				agent_id,
// 				date: Date.now(),
// 				options,
// 			},
// 		});
// 	}

// 	work_done(agent_id: string) {
// 		this.onUpdate({
// 			type: "work_done",
// 			data: {
// 				id: crypto.randomUUID(),
// 				agent_id,
// 				date: Date.now(),
// 			},
// 		});
// 	}

// 	loop_end() {
// 		this.onUpdate({
// 			type: "loop_end",
// 			data: {
// 				id: crypto.randomUUID(),
// 				date: Date.now(),
// 			},
// 		});
// 	}

// 	token_usage(usage: TokenUsage) {
// 		this.onUpdate({
// 			type: "token_usage",
// 			data: { usage },
// 		});
// 	}

// 	received_user_query(agent_id: string, content: string) {
// 		this.onUpdate({
// 			type: "received_user_query",
// 			data: {
// 				id: crypto.randomUUID(),
// 				agent_id,
// 				date: Date.now(),
// 				content,
// 			},
// 		});
// 	}

// 	update_pause_state(paused: boolean) {
// 		this.onUpdate({
// 			type: "pause_state_update",
// 			data: {
// 				id: crypto.randomUUID(),
// 				date: Date.now(),
// 				paused,
// 			},
// 		});
// 	}

// 	register_agent(agent_id: string, agent_type: string, initial_state: Record<string, any>) {
// 		this.onUpdate({
// 			type: "agent_register",
// 			data: {
// 				id: crypto.randomUUID(),
// 				date: Date.now(),
// 				agent_id,
// 				agent_type,
// 				initial_state,
// 			},
// 		});
// 	}

// 	update_agent_state(agent_id: string, state: Record<string, any>) {
// 		this.onUpdate({
// 			type: "agent_state_update",
// 			data: {
// 				id: crypto.randomUUID(),
// 				date: Date.now(),
// 				agent_id,
// 				state,
// 			},
// 		});
// 	}

// 	start_action(action_report: ActionReport) {
// 		this.onUpdate({
// 			type: "start_action",
// 			data: action_report,
// 		});
// 	}

// 	fill_fields(action_report: ActionReport) {
// 		this.onUpdate({
// 			type: "fill_fields",
// 			data: action_report,
// 		});
// 	}

// 	apply_action(action_report: ActionReport) {
// 		this.onUpdate({
// 			type: "apply_action",
// 			data: action_report,
// 		});
// 	}
// }

export type ThoughtData = {
	id: string;
	date: number;
	agent_id: string;
	thought: string;
};

export type WorkDoneData = {
	id: string;
	agent_id: string;
	date: number;
};

export type TokenUsageData = {
	id: string;
	date: number;
	agent_id: string;
	usage: TokenUsage;
};

export type ReceivedUserQueryData = {
	id: string;
	agent_id: string;
	date: number;
	content: string;
};

export type PauseStateData = {
	id: string;
	date: number;
	agent_id: string;
	paused: boolean;
};

export type SelectedNextStepsData = {
	id: string;
	date: number;
	agent_id: string;
	options: RankedOption[];
};

export type OpenWindowData = {
	id: string;
	date: number;
	window_id: string;
	router_path: string;
	view: SerializedView;
};

export type CloseWindowData = {
	id: string;
	date: number;
	window_id: string;
};

export type RecordedEvent =
	| {
			type: "thought";
			data: ThoughtData;
	  }
	| {
			type: "selected_next_steps";
			data: SelectedNextStepsData;
	  }
	| {
			type: "work_done";
			data: WorkDoneData;
	  }
	| {
			type: "token_usage";
			data: TokenUsageData;
	  }
	| {
			type: "received_user_query";
			data: ReceivedUserQueryData;
	  }
	| {
			type: "pause_state_update";
			data: PauseStateData;
	  }
	| {
			type: "navigate_to_path";
			data: NavigateToPathData;
	  }
	| {
			type: "open_window";
			data: OpenWindowData;
	  }
	| {
			type: "close_window";
			data: CloseWindowData;
	  }
	| {
			type: "agent_register";
			data: AgentRegisterData;
	  }
	| {
			type: "agent_state_update";
			data: AgentStateUpdateData;
	  }
	| {
			type: "start_action";
			data: ActionReport;
	  }
	| {
			type: "fill_fields";
			data: ActionReport;
	  }
	| {
			type: "apply_action";
			data: ActionReport;
	  }
	| {
			type: "relationship_choice";
			data: RelationshipChoiceReport;
	  }
	| {
			type: "action_choice";
			data: ActionChoiceReport;
	  }
	| {
			type: "permission_request";
			data: PermissionRequest;
	  }
	| {
			type: "action_approval";
			data: ActionApprovalRequest;
	  }
	| {
			type: "prerequisite";
			data: Prerequisite;
	  }
	| {
			type: "background_job";
			data: BackgroundJobReport;
	  };

export default class EffectsStream {
	constructor(private onUpdate: (update: RecordedEvent) => void) {}

	agent(agent_id: string) {
		return {
			thought: (thought: string) => {
				this.onUpdate({ type: "thought", data: { id: crypto.randomUUID(), date: Date.now(), agent_id, thought } });
			},

			selected_next_steps: (options: RankedOption[]) => {
				this.onUpdate({ type: "selected_next_steps", data: { id: crypto.randomUUID(), date: Date.now(), agent_id, options } });
			},

			work_done: () => {
				this.onUpdate({ type: "work_done", data: { id: crypto.randomUUID(), date: Date.now(), agent_id } });
			},

			token_usage: (usage: TokenUsage) => {
				this.onUpdate({ type: "token_usage", data: { id: crypto.randomUUID(), date: Date.now(), agent_id, usage } });
			},

			received_user_query: (content: string) => {
				this.onUpdate({ type: "received_user_query", data: { id: crypto.randomUUID(), date: Date.now(), agent_id, content } });
			},

			update_pause_state: (paused: boolean) => {
				this.onUpdate({ type: "pause_state_update", data: { id: crypto.randomUUID(), date: Date.now(), agent_id, paused } });
			},

			update_agent_state:(state: Record<string, any>) => {
				this.onUpdate({ type: "agent_state_update", data: { id: crypto.randomUUID(), date: Date.now(), agent_id, state } });
			},

				
		};
	}

	navigate_to_path(window_id: string, router_path: string, view: SerializedView) {
		this.onUpdate({ type: "navigate_to_path", data: { id: crypto.randomUUID(), date: Date.now(), window_id, router_path, view } });
	}

	open_window(window_id: string, router_path: string, view: SerializedView) {
		this.onUpdate({ type: "open_window", data: { id: crypto.randomUUID(), date: Date.now(), window_id, router_path, view } });
	}

	close_window(window_id: string) {
		this.onUpdate({ type: "close_window", data: { id: crypto.randomUUID(), date: Date.now(), window_id } });
	}

	register_agent(agent_id: string, agent_type: string, initial_state: Record<string, any>) {
		this.onUpdate({ type: "agent_register", data: { id: crypto.randomUUID(), date: Date.now(), agent_id, agent_type, initial_state } });
	}

	

	start_action(action_report: ActionReport) {
		this.onUpdate({ type: "start_action", data: action_report });
	}

	fill_fields(action_report: ActionReport) {
		this.onUpdate({ type: "fill_fields", data: action_report });
	}

	apply_action(action_report: ActionReport) {
		this.onUpdate({ type: "apply_action", data: action_report });
	}
}
