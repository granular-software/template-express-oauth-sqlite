import type { SerializedView, ViewComponent } from "@joshu/os-types";
import { MutationPointer, Pointer } from "./pointer";
import { Action } from "./action";

export class View {
	constructor(
		public app_name: string,
		public rendered_path: string,
		public mode: "dev" | "app"
	) {
		return this;
	}

	public _loaded: boolean = false;
	public _label: string = "";
	public _description: string = "";

	public _view_component: ViewComponent | null = null;

	get loaded() {
		return this._loaded;
	}

	get description() {
		return this._description;
	}

	get label() {
		return this._label;
	}

	async render() {
		const model = await new Pointer(this.app_name).execute({
			path: true,
			label: true,
			description: true,
		});

		if (!model) {
			throw new Error("Model not found");
		}

		const view_pointer = new Pointer(this.app_name).interface("View");

		const view = await view_pointer.execute({
			render: [
				{
					mode: this.mode,
					rendered_path: this.rendered_path,
				},
			],
		});

		if (!view) {
			throw new Error("View not found");
		}

		const _render = view.render;

		const render = JSON.parse(_render) as ViewComponent;

		this._view_component = render;

		this._loaded = true;

		return this;
	}

	async start_action(action_path: string) {
		const model = await new Pointer(this.app_name).execute({
			path: true,
			label: true,
			description: true,
		});

		if (!model) {
			throw new Error("Model not found");
		}

		const view_pointer = new MutationPointer(this.app_name).interface("ViewMutation");

		const action = await view_pointer.execute({
			trigger_action: [
				{
					action_path: action_path,
				},

				{
					// id: true,
					// created_at: true,
					// fields: true,
					model: {
						path: true,
						label: true,
						description: true,
					},
					// output: true,
					// state: true,
				},
			],
		});

		if (!action) {
			throw new Error("Action report not found");
		}

		// const action_report = {
		// 	...partial_action_report,
		// };

		// return action_report;

		const action_model = action.trigger_action.model;

		if (!action_model) {
			throw new Error("Action model not found");
		}

		return new Action(action_model.path!);
	}

	public print: () => Promise<SerializedView> = async () => {
		const view_component = this._view_component;

		if (!view_component || !this._loaded) {
			throw new Error("View component not found");
		}

		const serialize_component = (component: ViewComponent): SerializedView => {
			const serialized: SerializedView = {
				type: component.type,
				// path: component.path,
				// model_path: this.model_path,

				view_model: component.path,
				router_path: this.rendered_path,

				name: component.label || "",
				description: component.description || "",
				components: [],

				clickable_links: component.rendered_links.map((link) => ({
					name: link.label,
					description: link.description,
					// target_view: link.target_view,
					// alias: link.target_view,
					alias: link.router_path,
					// window_id: link.window_id,
					router_path: link.router_path,
					is_already_opened: link.clicked || false,
				})),
				// actions: component.triggerable_actions.map((action) => ({
				// 	label: action.label,
				// 	description: action.description,
				// 	alias: action.label,
				// 	fields: action.fields.map((field) => ({
				// 		name: field.name,
				// 		description: field.description,
				// 		type: field.type as "string" | "number" | "boolean" | "date",
				// 		required: field.required,
				// 	})),
				// 	output_type: action.output_type || "void",
				// 	is_already_opened: false,
				// })),

				actions: component.triggerable_actions.map((action) => ({
					...action,
					alias: action.action_path,
				})),
			};

			if (component.type === "app_tab") {
				serialized.components = component.components.map((child) => serialize_component(child));
			}

			return serialized;
		};

		const resp = {
			...serialize_component(view_component),
			// model_path: this.model_path,
			view_model: view_component.path,
			router_path: this.rendered_path,
		};

		// console.log("SERIALIZED", resp);

		return resp;
	};
}
