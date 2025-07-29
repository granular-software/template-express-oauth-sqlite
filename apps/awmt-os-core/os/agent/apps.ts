import sdk, { api } from "awmt-sdk";
import { type MutationPromiseChain, type QueryPromiseChain } from "awmt-sdk/api/schema";
import {
	type SerializedView,
	// type RenderedAction,
	type RenderedLink,
	type RenderedViewComponent,
	type TriggerableAction,
} from "@joshu/os-types";



export interface ButtonViewComponent extends RenderedViewComponent {
	type: "button";
}

export const ButtonComponent = ({ path, label, description, action }: { path: string; label: string; description: string; action: TriggerableAction }): ButtonViewComponent => ({
	path,
	type: "button",
	label,
	description,
	triggerable_actions: [action],
	rendered_links: [],
	children_keys: [],
});

export interface TextInputViewComponent extends RenderedViewComponent {
	type: "text_input";
}

export const TextInputComponent = ({ path, label, description }: { path: string; label: string; description: string }): TextInputViewComponent => ({
	path,
	type: "text_input",
	label,
	description,
	triggerable_actions: [],
	rendered_links: [],
	children_keys: [],
});

export interface InstancesListViewComponent extends RenderedViewComponent {
	type: "instances_list";

	can_create: boolean;

	prototype: string;
}

export const InstancesListComponent = ({ path, label, description, can_create, prototype }: { path: string; label: string; description: string; can_create: boolean; prototype: string }): InstancesListViewComponent => ({
	path,
	type: "instances_list",
	label,
	description,
	can_create,
	prototype,
	triggerable_actions: [],
	rendered_links: [],
	children_keys: [],
});

export interface LinkViewComponent extends RenderedViewComponent {
	type: "link";

	view: string;
}

export const LinkComponent = ({ path, label, description, view }: { path: string; label: string; description: string; view: string }): LinkViewComponent => ({
	path,
	type: "link",
	label,
	description,
	view,
	triggerable_actions: [],
	rendered_links: [
		{
			label,
			description,
			router_path: view,
			clicked: false,
		},
	],
	children_keys: [],
});

export interface ModelDisplayViewComponent extends RenderedViewComponent {
	type: "model_display";

	model: string;
}

export const ModelDisplayComponent = ({ path, label, description, model }: { path: string; label: string; description: string; model: string }): ModelDisplayViewComponent => ({
	path,
	type: "model_display",
	label,
	description,
	model,
	triggerable_actions: [],
	rendered_links: [],
	children_keys: [],
});

export interface DesktopViewComponent extends RenderedViewComponent {
	type: "desktop";
}

export const DesktopComponent = ({ path, label, description, tabs }: { path: string; label: string; description: string; tabs: AppTabViewComponent[] }): DesktopViewComponent => ({
	path,
	type: "desktop",
	label,
	description,
	triggerable_actions: [],
	rendered_links: [],
	children_keys: [],
});

export interface AppRootViewComponent extends RenderedViewComponent {
	type: "app_root";

	tabs: AppTabViewComponent[];
}

export const AppRootComponent = ({ path, label, description, tabs }: { path: string; label: string; description: string; tabs: AppTabViewComponent[] }): AppRootViewComponent => ({
	path,
	type: "app_root",
	label,
	description,
	tabs,
	triggerable_actions: [],
	rendered_links: [],
	children_keys: ["tabs"],
});

export interface AppTabViewComponent extends RenderedViewComponent {
	type: "app_tab";
	tab_name: string;

	components: ViewComponent[];
}

export const AppTabComponent = ({ path, label, description, tab_name, components }: { path: string; label: string; description: string; tab_name: string; components: ViewComponent[] }): AppTabViewComponent => ({
	path,
	type: "app_tab",
	label,
	description,
	tab_name,
	components,
	triggerable_actions: [],
	rendered_links: [],
	children_keys: [],
});

export type ViewComponent = ButtonViewComponent | TextInputViewComponent | InstancesListViewComponent | LinkViewComponent | ModelDisplayViewComponent | DesktopViewComponent | AppRootViewComponent | AppTabViewComponent;

interface ApplicationConfig {
	name: string;
	description: string;
	icon: string;
}

const query = api.chain.query as QueryPromiseChain;
const mutation = api.chain.mutation as MutationPromiseChain;

export class Application {
	private name: string;
	private description: string;
	private icon: string;
	private tabs: AppTabViewComponent[] = [];

	constructor(config: ApplicationConfig) {
		this.name = config.name;
		this.description = config.description;
		this.icon = config.icon;
	}

	async create(views: AppTabViewComponent[]) {
		const original_path = "desktop:apps";

		async function traverse_view(view: ViewComponent, parent_path: string) {
			const get_model = await query.model({ path: view.path }).execute({
				path: true,
			});

			if (!get_model) {
				const prototype: "button_view_component" | "text_input_view_component" | "link_view_component" | "instances_list_view_component" | "model_display_view_component" | "desktop_view_component" | "app_tab_view_component" | "app_root_view_component" =
					view.type === "button" ? "button_view_component" : view.type === "text_input" ? "text_input_view_component" : view.type === "instances_list" ? "instances_list_view_component" : view.type === "link" ? "link_view_component" : view.type === "model_display" ? "model_display_view_component" : view.type === "desktop" ? "desktop_view_component" : view.type === "app_tab" ? "app_tab_view_component" : "app_root_view_component";

				// console.log('SDK -> Created view', { path: view.path, label: view.label, prototype });

				const created_model = await mutation
					.at({ path: prototype })
					.instantiate({
						path: view.path,
						label: view.label,
					})
					.set_description({
						description: view.description,
					})
					.execute({
						model: { path: true },
					});

				// console.log('SDK -> Created view', { path: view.path, label: view.label, created_model });

				// const result = await mutation
				// 	.create_model({
				// 		path: view.path,
				// 		label: view.label,
				// 		prototype: prototype,
				// 	})
				// 	.set_description({
				// 		description: view.description,
				// 	})
				// 	.execute({
				// 		model: { path: true },
				// 	});

				const link_to_parent = await mutation
					.at({ path: parent_path })
					.create_submodel({
						subpath: view.path,
					})
					.execute({
						model: { path: true },
					});

				// console.log('SDK -> Linked view to parent', { path: view.path, label: view.label, link_to_parent });

				if (link_to_parent && link_to_parent.model) {
					await mutation
						.at({ path: link_to_parent.model?.path })
						.set_reference({
							reference: view.path,
						})
						.execute({
							model: { path: true },
						});
				} else {
					// console.log('SDK -> Failed to link view to parent', { path: view.path, label: view.label, link_to_parent });
				}

				// return created_model.model;
			} else {
				// console.log('SDK -> View already exists', { path: view.path, label: view.label });
			}

			if (view.type === "button") {
				const { triggerable_actions } = view;
				const action = triggerable_actions[0];

				return view;
			} else if (view.type === "text_input") {
				const {} = view;
				return view;
			} else if (view.type === "instances_list") {
				const { can_create, prototype } = view;

				await mutation
					.at({ path: view.path + ":can_create" })
					.set_boolean_value({
						value: can_create,
					})
					.execute({
						model: { path: true },
					});

				await mutation.create_model({ path: prototype }).execute({
					model: { path: true },
				});

				const proto = await mutation
					.at({ path: view.path + ":prototype" })
					.set_reference({
						reference: prototype,
					})
					.execute({
						model: { path: true },
					});

				console.log("Set reference of path ", view.path + ":prototype to", prototype);

				return view;
			} else if (view.type === "link") {
				const { view: target_view_path } = view;

				await mutation
					.at({ path: view.path + ":view" })
					.set_reference({
						reference: target_view_path,
					})
					.execute({
						model: { path: true },
					});
				return view;
			} else if (view.type === "model_display") {
				const { model } = view;

				await mutation
					.at({ path: view.path + ":model" })
					.set_reference({
						reference: model,
					})
					.execute({
						model: { path: true },
					});
				return view;
			} else if (view.type === "desktop") {
				const {} = view;
				return view;
			} else if (view.type === "app_root") {
				const { tabs } = view;

				await Promise.all(tabs.map((tab) => traverse_view(tab, view.path + ":tabs")));

				return view;
			} else if (view.type === "app_tab") {
				const { components } = view;

				await Promise.all(components.map((component) => traverse_view(component, view.path + ":components")));

				return view;
			}
		}

		return await Promise.all(views.map((view) => traverse_view(view, original_path)));
	}
}
