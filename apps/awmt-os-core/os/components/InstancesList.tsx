import { BaseAstNode, JsElement, ViewNode, RenderParams, GetReactProps, TriggerableAction } from "../backend/common_types";
import { register_bundle, generateUUID } from "../backend/registry";
import { BuildAst, RenderView } from "./utils";

export interface InstancesListAstNode extends BaseAstNode {
	node_type: "instances_list";
	prototype: string;
	can_create: boolean;
}

type InstancesListProps = GetReactProps<InstancesListAstNode>;

export function InstancesList({ prototype, can_create }: InstancesListProps) {
	return (
		<div>
			{prototype} instances list
			{can_create && <button>Create new {prototype}</button>}
		</div>
	);
}

const build_ast: BuildAst<InstancesListAstNode> = function(element: JsElement<InstancesListProps>, recurse: (e: JsElement) => BaseAstNode): Omit<InstancesListAstNode, "uuid"> {
	return {
		node_type: "instances_list",
		prototype: element.props.prototype ?? "",
		can_create: element.props.can_create ?? false,
	};
}

const render_view: RenderView<InstancesListAstNode> = async function(node: InstancesListAstNode, params: RenderParams): Promise<Omit<ViewNode, "uuid" | "ast_node_uuid"> & { children?: ViewNode[] }> {
	const instances = params.api
		? await params.api.getInstances(node.prototype)
		: [
				{ id: "aaa", name: "My instance 1" },
				{ id: "bbb", name: "My instance 2" },
			];

	const list_items: ViewNode[] = instances.map((instance: any) => ({
		uuid: generateUUID(),
		ast_node_uuid: node.uuid,
		kind: "list_item",
		props: {
			id: instance.id,
			name: instance.name || instance.id || "Unnamed instance",
		},
		children: [
			{
				uuid: generateUUID(),
				ast_node_uuid: node.uuid,
				kind: "text",
				props: { value: instance.name || instance.id || "Unnamed instance" },
				children: [],
				triggerable_actions: [],
				links: [],
			},
		],
		triggerable_actions: [],
		links: [],
	}));

	const main_triggerable_actions: TriggerableAction[] = [];
	if (node.can_create) {
		main_triggerable_actions.push({
			// action_id: `create_new_${node.prototype}`,
			label: `Create new ${node.prototype}`,
			// display_name: `Create new ${node.prototype}`,
			// shape: "button",
			app: params.api?.current_app_id || "unknown_app",
			router_path: params.router_path || "/",
			action_path: `${node.prototype}/create`,
			description: `Create a new instance of ${node.prototype}`,
			fields: [],
			output_type: {
				defined: false,
				type: "relation_array",
				prototype: node.prototype,
				value: null,
			},
		});
	}

	return {
		kind: "list",
		props: {
			title: `${node.prototype} Instances`,
			prototypeName: node.prototype,
			canCreate: node.can_create,
		},
		children: list_items,
		triggerable_actions: main_triggerable_actions,
		links: [],
	};
}

register_bundle<InstancesListAstNode>({
	component_name: "InstancesList",
	build_ast,
	render_view,
});
