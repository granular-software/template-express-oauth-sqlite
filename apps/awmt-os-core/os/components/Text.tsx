import { BaseAstNode, JsElement, ViewNode, RenderParams, GetReactProps, TriggerableAction } from "../backend/common_types";
import { register_bundle } from "../backend/registry";
import { BuildAst, RenderView } from "./utils";

export interface TextAstNode extends BaseAstNode {
	node_type: "Text";
	value: string;
	onClick?: () => void;
}

export function Text({ value, onClick }: GetReactProps<TextAstNode>) {
	return <span onClick={onClick}>{value}</span>;
}

const build_ast: BuildAst<TextAstNode> = function(element: JsElement<GetReactProps<TextAstNode>>, recurse: (e: JsElement) => BaseAstNode): Omit<TextAstNode, "uuid"> {
	return {
		node_type: "Text",
		value: element.props.value as string,
		// Note: onClick handlers on AST nodes are tricky as functions don't serialize well.
		// This was likely illustrative; actual click handling is often via triggerable_actions in the ViewNode.
		// onClick: element.props.onClick as (() => void) | undefined, // Ensure it can be undefined
	};
}

const render_view: RenderView<TextAstNode> = async function(node: TextAstNode, params: RenderParams): Promise<Omit<ViewNode, "uuid" | "ast_node_uuid"> & { children?: ViewNode[] }> {
	const triggerable_actions: TriggerableAction[] = [];
	// if (node.onClick) {
	// 	triggerable_actions.push({
	// 		label: "Click me",
	// 		description: "Click me",
	// 		fields: [],
	// 		output_type: {
	// 			defined: false,
	// 			type: "relation_array",
	// 			prototype: "Text",
	// 			value: null,
	// 		},
	// 		app: params.api?.current_app_id || "unknown_app",
	// 		router_path: params.router_path || "/",
	// 		action_path: `${node.node_type}/click`,
	// 	});
	// }

	return {
		kind: "text",
		props: {
			value: node.value,
			fontSize: (params.text_scale ?? 1) * 14,
		},
		children: [],
		triggerable_actions,
		links: [],
		// uuid and ast_node_uuid will be added by the registry
	};
}

register_bundle<TextAstNode>({
	component_name: "Text",
	build_ast,
	render_view,
});
