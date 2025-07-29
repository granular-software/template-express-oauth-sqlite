import type { OsDocument, RankedOption, ExecutionPlanData, FieldDefinition, ActionReport, ActionOutput, AppsInstallConfig, AppConfig, AppTabConfig, AppComponentConfig } from "@joshu/os-types";
import Agent from "./agent";
import ApplicationBuilderAgent from "./agent/app_builder_agent";
import EffectsStream from "./effects_stream";
import { View } from "./agent/view";
import { Application, AppTabComponent, InstancesListComponent, TextInputComponent } from "./agent/apps";
import type { TokenUsage } from "./types";
import { Action } from "./agent/action";
import IterativeAppBuilderAgent from "./agent/iterative_app_builder";
import CompositeAgent from "./agent/composite";

export interface Window {
	window_id: string;
	mode: string;
	view: View;
}

export default class Os {
	private _agent: CompositeAgent | null = null;
	private effectsStream: EffectsStream;
	private doc: OsDocument;

	readonly windows_open: Window[] = [];

	constructor(effectsStream: EffectsStream, doc: OsDocument) {
		this.effectsStream = effectsStream;
		// this.effectsStream.agent().thought("Initializing OS...");

		this.doc = doc;
	}

	push_window(window: Window) {
		this.windows_open.push(window);
	}

	update_window(window: Window) {
		const index = this.windows_open.findIndex((w) => w.window_id === window.window_id);
		if (index !== -1) {
			this.windows_open[index] = window;
		}
	}

	bind_agent() {

		const agent = new CompositeAgent(this, this.doc);
		this._agent = agent;
	}

	get agent() {
		return this._agent;
	}

	async start_agent(query: string) {
		await this.load_desktop();

		if (!this.agent) {
			this.bind_agent();
		}

		console.log("STARTING THE AGENT, QUERY : ", query, "WITH WINDOWS : ", this.windows_open.length);

		return await this.agent?.start(query);
	}

	async start_desktop() {
		await this.load_desktop();

		// this.effectsStream.work_done();
		return this;
	}

	private async load_desktop() {
		// console.log("Loading desktop...");

		const desktop = await new View("desktop", "/", "app").render();

		// console.log("Desktop loaded", desktop);

		this._open_window(desktop);

		return desktop;
	}

	private async _open_window(view: View) {
		const new_window = { window_id: crypto.randomUUID() as string, view, mode: view.mode };
		this.windows_open.push(new_window);

		// console.log("OPENING WINDOW", new_window.window_id, "WITH VIEW", view.rendered_path, "IN MODE", view);

		const serialized_view = await view.print();

		if (this.doc && !this.doc.windows.some((w) => w.id === new_window.window_id)) {
			this.doc.windows.push({
				id: new_window.window_id,
				// mode: new_window.mode,
				view: serialized_view,
			});
		}

		this.effectsStream.open_window(new_window.window_id, view.rendered_path, serialized_view);
	}

	private async _navigate(window_id: string, router_path: string, view: View) {
		const window = this.windows_open.find((window) => window.window_id === window_id);
		if (!window) {
			throw new Error("Window not found");
		}

		window.view = view;

		const serialized_view = await view.print();

		this.effectsStream.navigate_to_path(window_id, router_path, serialized_view);
	}

	async close_window(window_id: string) {
		const window = this.windows_open.find((window) => window.window_id === window_id);
		if (!window) {
			throw new Error("Window not found");
		}

		this.effectsStream.close_window(window_id);

		return true;
	}

	async open_app(app_name: string) {
		console.log("OPENING APP", app_name);

		const app = new View(app_name, "/", "app");
		await app.render();

		this._open_window(app);
	}

	async navigate(window_id: string, path: string) {
		console.log("NAVIGATING", window_id, path);

		const window = this.windows_open.find((window) => window.window_id === window_id);

		if (!window) {
			throw new Error("Window not found");
		}

		const view = new View(window.view.app_name, path, "app");
		await view.render();

		console.log("RENDERED VIEW", view, "IN WINDOW", window_id);

		this._navigate(window_id, path, view);
	}

	async refresh_window(window_id: string) {
		const window = this.windows_open.find((window) => window.window_id === window_id);
		if (!window) {
			throw new Error("Window not found");
		}

		const view = new View(window.view.app_name, window.view.rendered_path, "app");
		await view.render();

		this._navigate(window_id, window.view.rendered_path, view);
	}

	/* //////////////////////////////////////////////////////////////// */
	/* //////////////////////   Actions  ////////////////////////////// */
	/* //////////////////////////////////////////////////////////////// */

	async start_action(window_id: string, router_path: string, action_path: string, created_by: "user" | "agent") {
		const window = this.windows_open.find((w) => w.window_id === window_id);

		if (!window) {
			throw new Error("Window not found");
		}

		const view = new View(window.view.app_name, router_path, "app");

		const action = await view.start_action(action_path);

		const _action_report = await action.get_report();
		
		const action_report: ActionReport = {
			created_by: created_by,
			window_id,

			..._action_report,
		};

		this.effectsStream.start_action(action_report);
	}

	async fill_fields(action_id: string, fields: FieldDefinition[]) {
		const _action = this.doc.actions.find((action) => action.id === action_id);

		if (!_action) {
			throw new Error("Action not found");
		}

		const action = new Action(_action.id);
		
		await action.fill_fields(fields);

		const _report = await action.get_report();

		const report: ActionReport = {
			..._report,
			window_id: _action.window_id,
			created_by: _action.created_by,
		};

		this.effectsStream.fill_fields(report);
	}

	async apply_action(action_id: string) {
		const _action = this.doc.actions.find((action) => action.id === action_id);

		if (!_action) {
			throw new Error("Action not found");
		}

		const action = new Action(_action.id);

		const result = await action.apply();

		const report: ActionReport = {
			...result,
			window_id: _action.window_id,
			created_by: _action.created_by,
		};

		this.effectsStream.apply_action(report);
	}

	async install_apps(config: AppsInstallConfig) {
		console.log("Installing apps from config:", config);
		
		for (const appConfig of config.apps) {
			console.log("Installing app:", appConfig.name);
			
			const app = new Application({
				name: appConfig.name,
				description: appConfig.description,
				icon: appConfig.icon,
			});

			const tabs = appConfig.tabs.map((tab: AppTabConfig) => {
				const components = tab.components.map((component: AppComponentConfig) => {
					if (component.type === "text_input") {
						return TextInputComponent({
							path: component.path,
							label: component.label,
							description: component.description,
						});
					} else if (component.type === "instances_list") {
						return InstancesListComponent({
							path: component.path,
							label: component.label,
							description: component.description,
							can_create: component.can_create,
							prototype: component.prototype,
						});
					}
					throw new Error(`Unknown component type: ${(component as any).type}`);
				});

				return AppTabComponent({
					path: tab.path,
					label: tab.label,
					description: tab.description,
					tab_name: tab.tab_name,
					components: components,
				});
			});

			await app.create(tabs);
		}
	}

	emit_agent_effect = {
		thought: (agent_id: string, thought: string) => {
			this.effectsStream.agent(agent_id).thought(thought);
		},
		received_user_query: (agent_id: string, query: string) => {
			this.effectsStream.agent(agent_id).received_user_query(query);
		},
		work_done: (agent_id: string) => {
			this.effectsStream.agent(agent_id).work_done();
		},
		selected_options: (agent_id: string, options: RankedOption[]) => {
			this.effectsStream.agent(agent_id).selected_next_steps(options);
		},
		token_usage: (agent_id: string, usage: TokenUsage) => {
			this.effectsStream.agent(agent_id).token_usage(usage);
		},
		update_pause_state: (agent_id: string, paused: boolean) => {
			this.effectsStream.agent(agent_id).update_pause_state(paused);
		},
		update_agent_state: (agent_id: string, state: Record<string, any>) => {
			this.effectsStream.agent(agent_id).update_agent_state(state);
		},
		register_agent: (agent_id: string, agent_type: string, initialState: Record<string, any>) => {
			this.effectsStream.register_agent(agent_id, agent_type, initialState);
		},
	};
}

async function install_apps() {
	const notes = new Application({
		name: "Notes",
		description: "An application to keep the user notes and write new ones",
		icon: "📝",
	});

	await notes.create([
		AppTabComponent({
			path: "app_notes_application",
			label: "Notes",
			description: "An application to keep the user notes and write new ones",
			tab_name: "Notes",
			components: [
				TextInputComponent({
					path: "app_note_description",
					label: "Description",
					description: "This is an application to keep user notes",
				}),

				InstancesListComponent({
					path: "app_notes_list",
					label: "Notes",
					description: "This is a list of all the notes that can be opened",
					can_create: true,
					prototype: "note",
				}),
			],
		}),
	]);

	const browser = new Application({
		name: "Browser",
		description: "A simple internet browser. When possible unless explicitely asked to, first search in the user local context with other relevant apps.",
		icon: "🌐",
	});

	await browser.create([
		AppTabComponent({
			path: "app_browser_application",
			label: "Browser",
			description: "A simple browser",
			tab_name: "Browser",
			components: [
				InstancesListComponent({
					path: "app_browser_list",
					label: "Browser",
					description: "This is a list of all previous searches",
					can_create: true,
					prototype: "browser_search",
				}),
			],
		}),
	]);

	const agenda = new Application({
		name: "Agenda",
		description: "An application to keep the user agenda and write new ones",
		icon: "📅",
	});

	await agenda.create([
		AppTabComponent({
			path: "app_agenda_application",
			label: "Agenda",
			description: "An application to keep the user agenda and write new ones",
			tab_name: "Agenda",
			components: [
				// InstancesListComponent({
				// 	path: 'app_agenda_list',
				// 	label: 'Agenda',
				// 	description: 'This is a list of all the agenda that can be opened',
				// 	can_create: true,
				// 	prototype: 'agenda',
				// }),
			],
		}),
	]);
}

// install_apps();
