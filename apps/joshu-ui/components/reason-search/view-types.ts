import { TriggerableAction } from '@joshu/os-types';

interface TokenUsage {
	input: number;
	output: number;
	cost: number;
}


export interface SelectedOption {
	name: string;
	score: number;
}

// export interface RenderedAction {
// 	path: string;
// 	label: string;
// 	description: string;
// }

export interface RenderedLink {
	path: string;
	label: string;
	description: string;
	router_path: string;
}

export interface RenderedViewComponent {
	path: string;
	type: string;
	label: string;
	description: string;
	triggerable_actions: TriggerableAction[];
	rendered_links: RenderedLink[];
	children_keys: string[];
}

export interface DesktopViewComponent extends RenderedViewComponent {
	type: 'desktop';
}

export interface AppRootViewComponent extends RenderedViewComponent {
	type: 'app_root';
	children_keys: ['tabs'];
	tabs: AppTabViewComponent[];
}

export interface AppTabViewComponent extends RenderedViewComponent {
	type: 'app_tab';
	tab_name: string;
	children_keys: ['components'];
	components: ViewComponent[];
}

export interface ButtonViewComponent extends RenderedViewComponent {
	type: 'button';
}

export interface TextInputViewComponent extends RenderedViewComponent {
	type: 'text_input';
}

export interface InstancesListViewComponent extends RenderedViewComponent {
	type: 'instances_list';
}

export interface LinkViewComponent extends RenderedViewComponent {
	type: 'link';
	view: string;
}

export interface ModelDisplayViewComponent extends RenderedViewComponent {
	type: 'model_display';
	model: string;
}

export type ViewComponent =
	| DesktopViewComponent
	| AppRootViewComponent
	| AppTabViewComponent
	| ButtonViewComponent
	| TextInputViewComponent
	| InstancesListViewComponent
	| LinkViewComponent
	| ModelDisplayViewComponent;

export interface ThoughtUpdate {
	type: 'thought';
	data: {
		id: string;
		date: number;
		thought: string;
		timestamp: number;
		overwrite: boolean;
		is_done: boolean;
	};
}

// export interface LoadedViewsUpdate {
// 	type: 'loaded_views';
// 	data: {
// 		id: string;
// 		date: number;
// 		windows: Array<{
// 			id: string;
// 			view: SerializedView;
// 		}>;
// 	};
// }

export interface NavigateToPathUpdate {
	type: 'navigate_to_path';
	data: {
		window_id: string;
		path: string;
	};
}

export interface OpenWindowUpdate {
	type: 'open_window';
	data: {
		app_name: string;
		path: string;
	};
}

export interface SelectedOptionsUpdate {
	type: 'selected_options';
	data: {
		id: string;
		date: number;
		options: Array<{
			name: string;
			serialized_view: {
				name: string;
				description: string;
				clickable_links: Array<{
					name: string;
					description: string;
					router_path: string;
					alias: string;
				}>;
				actions: Array<{
					label: string;
					description: string;
					fields: Array<{
						name: string;
						description: string;
						type: string;
					}>;
				}>;
			};
			is_action: boolean;
			is_link: boolean;
			score: number;
			token: string;
		}>;
	};
}

// export interface ActionParametersFilledUpdate {
// 	type: 'action_parameters_filled';
// 	data: {
// 		action_id: string;
// 		parameters: Array<{
// 			name: string;
// 			type: 'string' | 'number' | 'boolean';
// 			value: string | number | boolean;
// 		}>;
// 	};
// }

export interface ExecutionPlanUpdate {
	type: 'execution_plan_update';
	data: {
		id: string;
		date: number;
		tasks: Array<{
			id: string;
			title: string;
			description: string;
			status: string;
			priority: string;
			progress_percentage: number;
			is_done: boolean;
			/* outcomes: Array<{
        id: string;
        name: string;
        description: string;
        type: string;
        is_list: boolean;
      }>; */
			depends_on?: {
				task_id: string;
				outcome_id: string;
			};
			subtasks: Array<{
				id: string;
				title: string;
				description: string;
				is_done: boolean;
				status?: string;
				priority?: string;
				progress_percentage?: number;
				/* outcomes: Array<{
          id: string;
          name: string;
          description: string;
          type: string;
          is_list: boolean;
        }>; */
				prerequisites?: Array<{
					id: string;
					name: string;
					description: string;
				}>;
			}>;
			prerequisites?: Array<{
				id: string;
				name: string;
				description: string;
			}>;
		}>;
		validation?: {
			valid: boolean;
			issues: string[];
		};
		stats?: {
			total_tasks: number;
			completed_tasks: number;
			in_progress_tasks: number;
			blocked_tasks: number;
			not_started_tasks: number;
			total_progress_percentage: number;
		};
	};
}

export interface WorkDoneUpdate {
	type: 'work_done';
	data: {
		id: string;
		agent_id: string;
		date: number;
	};
}

export interface LoopEndUpdate {
	type: 'loop_end';
	data: {
		id: string;
		date: number;
	};
}

export type TokenUsageUpdate = {
	type: 'token_usage';
	data: {
		usage: TokenUsage;
	};
};

export type RecordedEvent =
	| SelectedOptionsUpdate
	// | LoadedViewsUpdate
	| ThoughtUpdate
	| ExecutionPlanUpdate
	// | ActionParametersFilledUpdate
	| WorkDoneUpdate
	| TokenUsageUpdate
	| LoopEndUpdate
	| NavigateToPathUpdate
	| OpenWindowUpdate;
