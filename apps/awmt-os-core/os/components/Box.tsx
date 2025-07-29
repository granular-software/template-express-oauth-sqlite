import { BaseAstNode, JsElement, RenderParams, ViewNode, GetReactProps } from "../backend/common_types";
import { register_bundle } from "../backend/registry";
import { process_children, BuildAst, RenderView } from "./utils";

export interface BoxAstNode extends BaseAstNode {
	node_type: "Box";
	padding: number;
	background: string;
}

type BoxProps = GetReactProps<BoxAstNode>;

export function Box({ children, padding, background }: BoxProps) {
	return (
		<div
			style={{
				padding,
				background,
			}}
		>
			{children}
		</div>
	);
}

const build_ast: BuildAst<BoxAstNode> = function(element: JsElement<BoxProps>, recurse: (e: JsElement) => BaseAstNode): Omit<BoxAstNode, "uuid"> {
	return {
		node_type: "Box",
		padding: element.props.padding ?? 0,
		background: element.props.background ?? "#ffffff",
		children: process_children(element, recurse),
	};
}

const render_view: RenderView<BoxAstNode> = async function(node: BoxAstNode, params: RenderParams, recurse: (n: BaseAstNode) => Promise<ViewNode>): Promise<Omit<ViewNode, "uuid" | "ast_node_uuid"> & { children?: ViewNode[] }> {
	const viewNodeContent: Omit<ViewNode, "uuid" | "ast_node_uuid"> & { children?: ViewNode[] } = {
		kind: "box",
		props: { 
			padding: node.padding, 
			background: node.background 
		},
		children: [],
		triggerable_actions: [],
		links: [],
	};

	if (node.children && node.children.length > 0) {
		viewNodeContent.children = await Promise.all(node.children.map(recurse));
	}

	return viewNodeContent;
}

register_bundle<BoxAstNode>({
	component_name: "Box",
	build_ast,
	render_view,
});
