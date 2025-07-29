export interface OsDocument {
	session_state: SessionState;
	agents: Agent[];

	thoughts: Thought[];
	token_usage: TokenUsage;

	logs: OsLog[];
	windows: Window[];
	
	actions: ActionReport[];

	// Human-in-the-loop interactions
	relationship_choices: RelationshipChoiceReport[];
	action_choices: ActionChoiceReport[];
	permission_requests: PermissionRequest[];
	action_approvals: ActionApprovalRequest[];
	prerequisites: Prerequisite[];
	background_jobs: BackgroundJobReport[];
}

export interface TokenUsage {
	input: number;
	output: number;
	cost: number;
}

// Connection state types
export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

// View component types
export interface SerializedView {
	type: string;
	// path: string;
	// model_path: string;

	view_model: string;
	router_path: string;

	name: string;
	description: string;
	components: SerializedView[];

	clickable_links: {
		name: string;
		description: string;
		alias: string;

		router_path: string;

		is_already_opened: boolean;
	}[];

	// actions: {
	// 	label: string;
	// 	description: string;
	// 	alias: string;
	// 	fields: {
	// 		name: string;
	// 		description: string;
	// 		type: "string" | "number" | "boolean" | "date";
	// 		required: boolean;
	// 	}[];
	// 	output_type: string;
	// 	is_already_opened?: boolean;
	// 	view_to_close?: string;
	// }[];

	actions: (TriggerableAction & { alias: string })[];
}

export type ActionOutput =
	| {
			type: "string";
			defined: boolean;
			value: string | null;
	  }
	| {
			type: "number";
			defined: boolean;
			value: number | null;
	  }
	| {
			type: "boolean";
			defined: boolean;
			value: boolean;
	  }
	| {
			type: "date";
			defined: boolean;
			value: string | null;
	  }
	| {
			type: "relation";
			defined: boolean;
			prototype: string;
			value: string | null;
	  }
	| {
			type: "relation_array";
			defined: boolean;
			prototype: string;
			value: string[] | null;
	  }
	| {
			type: "void";
	  };

export type AbstractFieldDefinition = {
	subpath: string;
	name: string;
	description: string;
	required: boolean;
	defined: boolean;
};

export type FieldDefinition = AbstractFieldDefinition &
	(
		| {
				type: "string";
				value: string | null;
		  }
		| {
				type: "number";
				value: number | null;
		  }
		| {
				type: "boolean";
				value: boolean | null;
		  }
		| {
				type: "date";
				value: string | null;
		  }
		| {
				type: "relation";
				prototype: string;
				value: string | null;
		  }
		| {
				type: "relation_array";
				prototype: string;
				value: string[] | null;
		  }
	);

export interface TriggerableAction {
	app: string;
	router_path: string;

	action_path: string;

	label: string;
	description: string;

	fields: FieldDefinition[];

	output_type: ActionOutput;
}

export interface ActionReport {
	id: string;
	window_id: string;
	action_instance_model: string;

	created_at: string;

	state: "created" | "preparing" | "running" | "success" | "error";
	created_by: "user" | "agent";

	label: string;
	description: string;

	output: ActionOutput | null;

	fields: FieldDefinition[];
}

export interface Window {
	id: string;
	view: SerializedView;
}

export interface Agent<TState extends Record<string, any> = Record<string, any>> {
	id: string;
	name: string;
	paused: boolean;
	description: string;
	instructions: string;
	created_at: string;
	tasks: Task[];
	is_active: boolean;
	type: string;
	state: TState;
}

export interface Task {
	id: string;
	agent_id: string;
	description: string;
	status: "pending" | "running" | "completed" | "failed" | "cancelled";
	created_at: string;
	started_at?: string;
	completed_at?: string;
	error?: string;
}
export interface Thought {
	id: string;
	agent_id: string;
	date: string;
	content: string;
}

export interface SessionState {
	started_at: string;
	last_activity: string;
	status: "streaming" | "ready" | "done" | "error";
}

export type ActionEventContent = {
	// description: string;
	text?: string;

	action_id?: string;
	action_name?: string;
	action_description?: string;
	result?: string;
	view_closed?: string;
	parameters?: Record<string, unknown>[];

	tool_call?: any;

	// action_id: action.token,
	// 					action_name: action.name,
	// 					action_description: actionDetails.description,
	// 					result: result ? 'success' : 'failed',
	// 					view_closed: viewToClose,
};

export type ObservationEventContent = {
	description: string;
	text?: string;
};

export type PlanEventContent = {
	description: string;
	plan?: ExecutionPlanData;
};

export type UserQueryEventContent = {
	description: string;
	text: string;
};

export type NavigationEventContent = {
	description?: string;
	opened_view_id?: string;
	opened_view_label?: string;
	opened_view_description?: string;
	closed_view_id?: string;
	action?: string;
};

export type SelectedOptionsEventContent = {
	description: string;
	options: RankedOption[];
};

export type WorkDoneEventContent = {
	description: string;
	text: string;
};

export type ActionParametersFilledEventContent = {
	description: string;
	action_id: string;
	parameters: Record<string, unknown>[];
};

export type EventContent = ActionEventContent | ObservationEventContent | PlanEventContent | UserQueryEventContent | NavigationEventContent | SelectedOptionsEventContent | WorkDoneEventContent | ActionParametersFilledEventContent;

export type OsLog = {
	id: string;
	date: string | Date;
	type: "action" | "observation" | "plan" | "user_query" | "navigation" | "selected_options" | "work_done" | "loop_end";
	application: string | null;
	agent_id: string;
	content: EventContent;
};

export type PrerequisiteData = {
	id: string;
	name: string;
	description: string;
};

export type DependencyData = {
	task_id: string;
	task_title: string; // Add task title for better display
};

export type TaskData = {
	id: string;
	title: string;
	description: string;
	status: string;
	priority: string;
	progress_percentage: number;
	parent_id?: string;
	prerequisites: PrerequisiteData[];
	depends_on?: DependencyData;
	subtasks: TaskData[];
};

export type ExecutionPlanData = {
	id: string;
	tasks: TaskData[];
	validation: {
		valid: boolean;
		issues: string[];
	};
	stats: {
		total_tasks: number;
		completed_tasks: number;
		in_progress_tasks: number;
		blocked_tasks: number;
		not_started_tasks: number;
		total_progress_percentage: number;
	};
	// Add separate arrays for completed and active tasks
	completed_tasks: TaskData[];
	active_tasks: TaskData[];
	date: number;
};

// Message types for WebSocket communication
export interface WebSocketMessage {
	type: WebSocketMessageType;
	sessionId?: string;
	message?: string;
	data?: number[];
	initialState?: number[];
}

export type WebSocketMessageType = "join_session" | "session_joined" | "update" | "error" | "sync" | "sync_response" | "user_message" | "install_apps";

// View component types
// export interface RenderedAction {
// 	label: string;
// 	description: string;
// 	fields: {
// 		name: string;
// 		description: string;
// 		type: "string" | "number" | "boolean" | "date";
// 		required: boolean;
// 	}[];
// 	output_type: string;
// }

export interface RenderedLink {
	label: string;
	description: string;

	router_path: string;

	clicked: boolean;
}

export interface RenderedViewComponent {
	type: string;
	path: string;
	label: string;
	description: string;
	metadata?: any;
	triggerable_actions: TriggerableAction[];
	rendered_links: RenderedLink[];

	children_keys: string[];
}

export interface ButtonViewComponent extends RenderedViewComponent {
	type: "button";
}

const ButtonViewComponentFactory = (data: Omit<ButtonViewComponent, "type" | "children_keys">) => ({
	type: "button",
	children_keys: [],
	...data,
});

export interface TextInputViewComponent extends RenderedViewComponent {
	type: "text_input";
}

const TextInputViewComponentFactory = (data: Omit<TextInputViewComponent, "type" | "children_keys">) => ({
	type: "text_input",
	children_keys: [],
	...data,
});

export interface InstancesListViewComponent extends RenderedViewComponent {
	type: "instances_list";
	can_create: boolean;
	prototype: string;
}

const InstancesListViewComponentFactory = (data: Omit<InstancesListViewComponent, "type" | "children_keys">) => ({
	type: "instances_list",
	children_keys: [],
	...data,
});

export interface LinkViewComponent extends RenderedViewComponent {
	type: "link";
	view: string;
}

const LinkViewComponentFactory = (data: Omit<LinkViewComponent, "type" | "children_keys">) => ({
	type: "link",
	children_keys: [],
	...data,
});

export interface ModelDisplayViewComponent extends RenderedViewComponent {
	type: "model_display";
	model: string;
}

const ModelDisplayViewComponentFactory = (data: Omit<ModelDisplayViewComponent, "type" | "children_keys">) => ({
	type: "model_display",
	children_keys: [],
	...data,
});

export interface DesktopViewComponent extends RenderedViewComponent {
	type: "desktop";
}

const DesktopViewComponentFactory = (data: Omit<DesktopViewComponent, "type" | "children_keys">) => ({
	type: "desktop",
	children_keys: [],
	...data,
});

export interface AppRootViewComponent extends RenderedViewComponent {
	type: "app_root";
	children_keys: ["tabs"];
	tabs: AppTabViewComponent[];
}

const AppRootViewComponentFactory = (data: Omit<AppRootViewComponent, "type" | "children_keys">) => ({
	type: "app_root",
	children_keys: ["tabs"],
	...data,
});

export interface AppTabViewComponent extends RenderedViewComponent {
	type: "app_tab";
	tab_name: string;
	children_keys: ["components"];
	components: ViewComponent[];
}

const AppTabViewComponentFactory = (data: Omit<AppTabViewComponent, "type" | "children_keys">) => ({
	type: "app_tab",
	children_keys: ["components"],
	...data,
});

export type ViewComponent = ButtonViewComponent | TextInputViewComponent | InstancesListViewComponent | LinkViewComponent | ModelDisplayViewComponent | DesktopViewComponent | AppRootViewComponent | AppTabViewComponent;

export const ViewComponentFactory = {
	button: ButtonViewComponentFactory,
	text_input: TextInputViewComponentFactory,
	instances_list: InstancesListViewComponentFactory,
	link: LinkViewComponentFactory,
	model_display: ModelDisplayViewComponentFactory,
	desktop: DesktopViewComponentFactory,
	app_root: AppRootViewComponentFactory,
	app_tab: AppTabViewComponentFactory,
};

export interface SerializedViewWithAlias {
	name: string;
	view_model: string;
	router_path: string;

	window_id: string;

	description: string;
	clickable_links: {
		name: string;
		description: string;
		alias: string;
		// target_view: string;
		router_path: string;

		is_already_opened: boolean;
	}[];
	// actions: {
	// 	label: string;
	// 	description: string;
	// 	alias: string;
	// 	fields: {
	// 		name: string;
	// 		description: string;
	// 		type: "string" | "number" | "boolean" | "date";
	// 		required: boolean;
	// 	}[];
	// 	output_type: string;
	// 	is_already_opened?: boolean;
	// 	view_to_close?: string;
	// }[];

	actions: (TriggerableAction & { alias: string })[];

	children_keys: string[];

	// Add tabs/components for recursive views
	tabs?: SerializedViewWithAlias[];
	components?: SerializedViewWithAlias[];
}

export type AliasesDictionary = Map<
	string,
	| {
			// is_link: boolean;
			// is_action: boolean;
			// alias: string;
			// serialized_view: SerializedViewWithAlias;
			// view_to_close?: string;

			type: "click_link";
			alias: string;

			window_id: string;
			target_path: string;

			serialized_view: SerializedViewWithAlias;
	  }
	| {
			type: "action";

			window_id: string;
			alias: string;

			serialized_view: SerializedViewWithAlias;
	  }
	| {
			type: "close_window";

			window_id: string;
			alias: string;

			serialized_view: SerializedViewWithAlias;
	  }
	| {
			type: "idle";
			alias: string;
	  }
>;

type AbstractRankedOption = {
	token: string;
	type: string;

	name: string;
	description: string;
	score: number;

	serialized_view: SerializedViewWithAlias;
};

export type RankedOption = AbstractRankedOption &
	(
		| {
				type: "click_link";

				window_id: string;
				target_path: string;
		  }
		| {
				type: "action";

				window_id: string;
		  }
		| {
				type: "close_window";

				window_id: string;
		  }
		| {
				type: "idle";
		  }
	);

// Here are the types of the iterative builder

// Define types for the views scaffolding
export type ViewType = "generic" | "list" | "detail" | "form" | "dashboard" | "home";

export interface AgentViewComponent {
	name: string;
	type: string;
	purpose: string;
	props: Record<string, any>;
	children?: string[];
	styling: Record<string, any>;
}

export interface AgentViewDefinition {
	pageName: string;
	path: string;
	layout: string | AstNodeDefinition;
	components?: AgentViewComponent[];
	dataRequirements?: string[];
	userInteractions?: string[];
}

/**
 * Define the field definition interface for entity fields
 */
export interface AgentFieldDefinition {
	name: string;
	label?: string; // Human-readable name
	type: string; // string, number, boolean, date, etc.
	required: boolean;
	description?: string;
	is_relation?: boolean; // Indicates if this field is a relation to another entity
	is_list?: boolean; // Indicates if this is a one-to-many relation
}

/**
 * Define the entity definition interface for the data model
 */
export interface EntityDefinition {
	name: string;
	label?: string; // Human-readable name
	description: string;
	emoji: string; // Emoji representing the entity
	fields: AgentFieldDefinition[];
	isSystemEntity?: boolean;
}

/**
 * Define the state machine state definition
 */
export interface StateDefinition {
	name: string;
	label?: string;
	description: string;
	isInitial?: boolean;
	isFinal?: boolean;
}

/**
 * Define the state machine transition definition
 */
export interface TransitionDefinition {
	name: string;
	from: string;
	to: string;
	description: string;
	guardCondition?: string;
}

/**
 * Define the state machine for an entity
 */
export interface EntityStateMachine {
	entityName: string;
	states: StateDefinition[];
	transitions: TransitionDefinition[];
}

/**
 * Define the action definition for CRUD and state machine operations
 */
export interface ActionDefinition {
	name: string;
	type: "create" | "read" | "update" | "delete" | "reach_state" | "on_state_change";
	description: string;
	entityName: string;
	targetState?: string; // For reach_state actions
	sourceState?: string; // For on_state_change actions
	parameters?: {
		name: string;
		type: string;
		description: string;
		required: boolean;
	}[];
}

/**
 * Define a page/route in the application
 */
export interface PageDefinition {
	name: string;
	path: string;
	title: string;
	description: string;
	parentPage?: string; // For hierarchical navigation
}

/**
 * Define the navigation structure
 */
export interface NavigationDefinition {
	type: "sidebar" | "topbar" | "tabs" | "menu";
	items: {
		pageName: string;
		icon?: string;
	}[];
}

/**
 * Define a basic AST node for view scaffolding
 */
export interface AstNodeDefinition {
	type: string;
	props: Record<string, any>;
	children: AstNodeDefinition[];
}

/**
 * Define the view for a page
 */
export interface ViewDefinition {
	pageName: string;
	path: string;
	layout: string | AstNodeDefinition;
	components?: AgentViewComponent[];
	dataRequirements?: string[];
	userInteractions?: string[];
}

/**
 * Define the color palette / theme
 */
export interface ColorPalette {
	primary: {
		base: string;
		hover: string;
		text: string;
	};
	secondary: {
		base: string;
		hover: string;
		text: string;
	};
	accent: {
		base: string;
		hover: string;
		text: string;
	};
	entity_colors: Array<{
		background: string;
		text: string;
		border: string;
		darkBackground: string;
		darkText: string;
		darkBorder: string;
	}>;
}

/**
 * Define the complete app state that holds all information about the application
 */
export interface IterativeAppBuilderState {
	// Step 1: Application Brief
	projectBrief?: string;
	requirements?: string[];
	appDescription?: string;
	currentStep: string;
	lastAction: string | null;
	userQuery?: string; // Store the initial user query

	// Step 2: UI Theme
	colorPalette?: ColorPalette | null;

	// Step 3: Data modeling
	importedEntities?: EntityDefinition[];
	entities?: EntityDefinition[];

	// Step 4: State machines
	stateMachines?: EntityStateMachine[];

	// Step 5: Actions
	actions?: ActionDefinition[];

	// Step 6: Navigation
	pages?: PageDefinition[];
	navigation?: NavigationDefinition;

	// Step 7: Views
	views?: ViewDefinition[];

	// Color mapping for entities
	entity_color_map?: Record<
		string,
		{
			background: string;
			text: string;
			border: string;
			darkBackground: string;
			darkText: string;
			darkBorder: string;
		}
	> | null;
}

// App Configuration Types
export interface AppConfig {
	name: string;
	description: string;
	icon: string;
	tabs: AppTabConfig[];
}

export interface AppTabConfig {
	path: string;
	label: string;
	description: string;
	tab_name: string;
	components: AppComponentConfig[];
}

export type AppComponentConfig = TextInputConfig | InstancesListConfig;

export interface TextInputConfig {
	type: "text_input";
	path: string;
	label: string;
	description: string;
}

export interface InstancesListConfig {
	type: "instances_list";
	path: string;
	label: string;
	description: string;
	can_create: boolean;
	prototype: string;
}

export interface AppsInstallConfig {
	apps: AppConfig[];
}

export interface BackgroundJobReport {
	id: string;
	// Optional link to the originating action (if any)
	action_id?: string;
	job_type: string; // e.g. "download", "training", "deployment"
	description?: string;

	status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
	progress_percentage: number; // 0-100

	created_at: string;
	started_at?: string;
	finished_at?: string;
}

export interface Prerequisite {
	id: string;
	agent_id: string;
	// Optional link to the originating action (if any)
	action_id?: string;

	prompt: string; // Plain-text question / follow-up requested by the agent
	created_at: string;

	status: "pending" | "answered" | "dismissed";
	// Filled when answered
	answer_text?: string;
	answered_at?: string;
}

export interface PermissionRequest {
	id: string;
	agent_id: string;
	requested_scope: string; // e.g. "delete_customer", "external_api_call"
	context?: string; // Free-form justification or JSON stringified data

	created_at: string;
	status: "pending" | "approved" | "denied";

	resolved_at?: string;
	approved_by?: "user" | "policy";
	remember?: boolean; // If true the decision is stored for future identical requests
}

export interface ActionApprovalRequest {
	id: string;
	action_id: string;
	window_id: string;
	confidence: number; // 0-1 estimated by agent

	created_at: string;
	status: "pending" | "approved" | "rejected";
	resolved_at?: string;
	approved_by?: "user" | "agent";
}

export interface RelationshipChoiceReport {
	id: string;
	action_id: string;
	window_id: string;
	field_subpath: string; // Path of the relation field being filled

	candidates: Array<{
		object_id: string;
		label: string;
		description?: string;
		score: number; // Relevance/probability suggested by the agent
	}>;

	status: "pending" | "selected" | "cancelled";
	selected_object_id?: string;

	created_by: "agent" | "user";
	created_at: string;
	resolved_at?: string;
}

export interface ActionChoiceReport {
	id: string;
	window_id: string;
	agent_id: string;

	options: Array<{
		action_path: string;
		label: string;
		description: string;
		score: number;
	}>;

	status: "pending" | "selected" | "cancelled";
	chosen_action_path?: string;

	created_by: "agent" | "user";
	created_at: string;
	resolved_at?: string;
}
