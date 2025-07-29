import { BaseAstNode, JsElement, ViewNode, RenderParams, GetReactProps } from "../backend/common_types";
import { register_bundle } from "../backend/registry";
import { process_children, BuildAst, RenderView, isRouteMatch, resolveRoutePath } from "./utils";

export interface RouteAstNode extends BaseAstNode {
	node_type: "route";
	subpath: string;
}

type RouteProps = GetReactProps<RouteAstNode>;

export function Route({ subpath, children }: RouteProps) {
	return (
		<div>
			Route: {subpath}
			{children}
		</div>
	);
}

const build_ast: BuildAst<RouteAstNode> = function(element: JsElement<RouteProps>, recurse: (e: JsElement) => BaseAstNode): Omit<RouteAstNode, "uuid"> {
	const routeNode: Omit<RouteAstNode, "uuid"> = {
		node_type: "route",
		subpath: element.props.subpath ?? "",
	};

	// Process children if they exist
	const children = process_children(element, recurse);
	if (children.length > 0) {
		routeNode.children = children;
	}

	return routeNode;
}

// Helper function to replace parameters in text
function replaceParamsInText(text: string, params: Record<string, string>): string {
	if (!text || !params || Object.keys(params).length === 0) {
		return text;
	}
	
	return text.replace(/:(\w+)/g, (match, paramName) => {
		return params[paramName] || match;
	});
}

async function render_view(
	node: RouteAstNode, 
	params: RenderParams, 
	recurse: (n: BaseAstNode) => Promise<ViewNode>
): Promise<Omit<ViewNode, "uuid" | "ast_node_uuid"> & { children?: ViewNode[] }> {
	// Get the current router path from params, default to "/" if not provided
	const currentPath = params.router_path || "/";
	const routePath = node.subpath;
	
	// Check if the route matches the current path
	const { match, params: routeParams } = isRouteMatch(routePath, currentPath);
	
	let remainingPath = currentPath;
	let basePathForDirectChildren = params.router_path || "/"; // Path context this Route operates in from its parent
	let childrenResults: ViewNode[] = []; // Declare childrenResults here

	if (match) {
		const routeSegments = routePath.split('/').filter(Boolean);
		const currentSegments = currentPath.split('/').filter(Boolean);

		// Determine the actual path segment that this route matched
		if (routeSegments.length > 0) {
			basePathForDirectChildren = '/' + currentSegments.slice(0, routeSegments.length).join('/');
		} else if (routePath === "/" || routePath === "") {
            // If this route is a root route ("/") or an empty subpath (relative to parent),
            // its base path for its children is effectively the path it matched.
            // For subpath="", basePathForDirectChildren is already correct (parent's path)
            // For subpath="/", if currentPath is "/", then it's "/".
            if (routePath === "/") basePathForDirectChildren = "/"; 
            // else for "", it remains as parent's path (params.router_path)
        }

		// Calculate remainingPath for nested routes
		const remainingSegments = currentSegments.slice(routeSegments.length);
		remainingPath = '/' + remainingSegments.join('/');
		if (remainingPath === "//") remainingPath = "/"; // Normalize if it becomes //
	}
	
	// Create the children elements for the route
	let children: ViewNode[] = [];
	
	// If we have children in the AST node, recursively render them
	if (node.children && node.children.length > 0) {
		const render_view_imported = await import("../backend/registry").then(m => m.render_view);
		
		childrenResults = await Promise.all(
			node.children.map(childAstNode => {
				let paramsForChild;
				if (childAstNode.node_type === "route") {
					// Nested Route: use remainingPath for its router_path context
					paramsForChild = {
						...params,
						router_path: remainingPath, 
						route_params: { ...(params.route_params || {}), ...routeParams }
					};
				} else {
					// Non-Route Child (e.g., Link, Text): use basePathForDirectChildren as their router_path context
					paramsForChild = {
						...params,
						router_path: basePathForDirectChildren, 
						route_params: { ...(params.route_params || {}), ...routeParams } // Pass merged params
					};
				}
				return render_view_imported(childAstNode, paramsForChild);
			})
		);
		
		// Replace parameter placeholders in text nodes
		children = childrenResults.map((child: ViewNode) => { // Add type for child
			// If this is a text node with a value property
			if (child.kind === "text" && child.props.value && typeof child.props.value === "string") {
				// Replace parameters in the text
				const mergedParams = { ...params.route_params, ...routeParams };
				return {
					...child,
					props: {
						...child.props,
						value: replaceParamsInText(child.props.value as string, mergedParams)
					}
				};
			}
			// For other nodes, process recursively
			if (child.children && child.children.length > 0) {
				return {
					...child,
					children: child.children.map((grandchild: ViewNode) => { // Add type for grandchild
						if (grandchild.kind === "text" && grandchild.props.value && typeof grandchild.props.value === "string") {
							const mergedParams = { ...params.route_params, ...routeParams };
							return {
								...grandchild,
								props: {
									...grandchild.props,
									value: replaceParamsInText(grandchild.props.value as string, mergedParams)
								}
							};
						}
						return grandchild;
					})
				};
			}
			return child;
		});
	}
	
	// If the route doesn't match, we can return a minimal ViewNode 
	// or one that explicitly states it's an inactive route section.
	// For now, let's return a node without children, indicating it shouldn't render its content.
	if (!match) {
		return {
			kind: "route",
			props: {
				subpath: node.subpath,
				isMatch: false,
				params: routeParams,
			},
			children: [],
			triggerable_actions: [],
			links: [],
		};
	}

	// Create the view node - only include children if the route matches
	return {
		kind: "route", 
		props: {
			subpath: node.subpath,
			isMatch: true,
			params: routeParams,
		},
		children: children, // children are full ViewNodes from render_view_imported
		triggerable_actions: [],
		links: [],
	};
}

register_bundle<RouteAstNode>({
	component_name: "Route",
	build_ast,
	render_view,
}); 