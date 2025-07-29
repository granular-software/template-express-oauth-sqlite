import type { FieldDefinition, RankedOption, SerializedView, TriggerableAction } from "@joshu/os-types";

export type Thought = {
	id: string;
	date: string | Date;
	content: string;
};

export type View = {
	path: string;
	_loaded: boolean;
	_label: string;
	_description: string;
	_view_component: ViewComponent | null;
	print?: () => Promise<SerializedView>;
};

export type ViewComponent = {
	type: string;
	view_model: string;
	router_path: string;
	name: string;
	description: string;
	components: ViewComponent[];
	clickable_links: ClickableLink[];
	// actions: Action[];
	rendered_links: RenderedLink[];
	triggerable_actions: TriggerableAction[];
	label?: string;
};

export type RenderedLink = {
	label: string;
	description: string;

	router_path: string;
};

// export type RenderedAction = {
// 	label: string;
// 	description: string;
// 	fields: ActionField[];
// 	alias?: string;
// 	output_type?: string;
// 	view_to_close: string | null;
// 	triggered: boolean;
// };

export type ClickableLink = {
	name: string;
	description: string;
	window_id: string;
	router_path: string;
	clicked: boolean;
};

// export type Action = {
// 	label: string;
// 	description: string;
// 	fields: ActionField[];
// 	alias?: string;
// 	triggered: boolean;
// };

// export type ActionField = {
// 	name: string;
// 	description: string;
// 	type: "string" | "number" | "boolean" | "date";
// 	required: boolean;
// };

export type ExecutionPlan = {
	tasks: Task[];
	get_task_by_id(id: string): Task | undefined;
	get_all_tasks(): Task[];
	serialize(): string;
	mark_as_started(task: Task): void;
};

export type Task = {
	id: string;
	title: string;
	description: string;
	is_done: boolean;
	status: string;
	priority: string;
	progress_percentage: number;
	parent_id?: string;
	prerequisites: PrerequisiteData[];
	depends_on?: DependencyData;
	subtasks: Task[];
};

export type PrerequisiteData = {
	id: string;
	name: string;
	description: string;
};

export type DependencyData = {
	task_id: string;
	task_title: string;
};

export type RecordedEventData = ThoughtData | LoadedViewsData | ExecutionPlanData | SelectedOptionsData | ActionParametersData | WorkDoneData;

export interface ThoughtData {
	id: string;
	date: number;
	agent_id: string;
	thought: string;
	timestamp: number;
	overwrite: boolean;
	is_done: boolean;
}

export interface LoadedViewsData {
	id: string;
	date: number;
	windows: {
		id: string;
		view: SerializedView;
	}[];
}

export interface ExecutionPlanData {
	id: string;
	date: number;
	plan: ExecutionPlan;
}

export interface SelectedOptionsData {
	id: string;
	date: number;
	agent_id: string;
	options: RankedOption[];
}

export interface ActionParametersData {
	id: string;
	date: number;
	actionId: string;
	parameters: Record<string, unknown>[];
}

export interface WorkDoneData {
	id: string;
	agent_id: string;
	date: number;
}

export interface TokenUsageData {
	usage: TokenUsage;
}

export type SessionState = {
	started_at: string;
	last_activity: string;
	status: "streaming" | "ready" | "done";
};

export interface TokenUsage {
	input: number;
	output: number;
	cost: number;
}

// export type WebSocketOperations =
// 	| {
// 			type: "join_session";
// 			sessionId: string;
// 			mode: string;
// 	  }
// 	| {
// 			type: "user_message";
// 			message: string;
// 	  }
// 	| {
// 			type: "open_app";
// 			app_name: string;
// 	  }
// 	| {
// 			type: "pause";
// 	  }
// 	| {
// 			type: "resume";
// 	  }
// 	| {
// 			type: "click_link";
// 			window_id: string;
// 			router_path: string;
// 	  }
// 	| {
// 			type: "start_action";
// 			window_id: string;
// 			router_path: string;
// 			action_path: string;
// 	  }
// 	| {
// 			type: "fill_fields";
// 			action_id: string;
// 			fields: FieldDefinition[];
// 	  }
// 	| {
// 			type: "apply_action";
// 			action_id: string;
// 	  }
// 	| {
// 			type: "close_window";
// 			window_id: string;
// 	  }
// 	| {
// 			type: "sync";
// 			clientState: Uint8Array;
// 	  }
// 	| {
// 			type: "save_snapshot";
// 	  }
// 	| {
// 			type: "load_snapshot";
// 			targetSessionId: string;
// 	  };
