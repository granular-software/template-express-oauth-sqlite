import { BaseAstNode, GetReactProps, JsElement, RenderParams, ViewNode } from "../backend/common_types";

export function process_children(element: JsElement, recurse: (e: JsElement) => BaseAstNode): BaseAstNode[] {
	function clean_element_children(element: JsElement): JsElement[] {
		let childrenToProcess = element.children;

		if (element.props.children && typeof element.props.children === "object") {
			if (Array.isArray(element.props.children)) {
				childrenToProcess = element.props.children as JsElement[];
			} else {
				childrenToProcess = [element.props.children as JsElement];
			}
		}

		return childrenToProcess;
	}

	const childrenToProcess = clean_element_children(element);

	const children = childrenToProcess.map((child) => {
		if (child && typeof child === "object") {
			return recurse(child as JsElement);
		}
	});

	return children.filter((node): node is BaseAstNode => node !== null && node !== undefined) || [];
}

export type BuildAst<NodeType extends BaseAstNode> = 
    (element: JsElement<GetReactProps<NodeType>>, recurse: (e: JsElement) => BaseAstNode) => Omit<NodeType, "uuid">;

export type RenderView<NodeType extends BaseAstNode> = 
    (
        node: NodeType, 
        params: RenderParams, 
        recurse: (n: BaseAstNode) => Promise<ViewNode>  // recurse itself will return a full ViewNode with UUIDs
    ) => Promise<Omit<ViewNode, "uuid" | "ast_node_uuid"> & { children?: ViewNode[] }>; // Component returns main node structure; registry adds uuid/ast_node_uuid to it. Children provided by component are full ViewNodes.

// Routing utility functions (moved from Route.tsx)
export function isRouteMatch(routePath: string, currentPath: string): { match: boolean; params: Record<string, string> } {
	const routeSegments = routePath.split("/").filter(Boolean);
	const pathSegments = currentPath.split("/").filter(Boolean);

	if (routeSegments.length === 0) {
		return { match: pathSegments.length === 0, params: {} };
	}

	if (pathSegments.length < routeSegments.length) {
		return { match: false, params: {} };
	}

	const params: Record<string, string> = {};
	
	for (let i = 0; i < routeSegments.length; i++) {
		const routeSegment = routeSegments[i];
		const pathSegment = pathSegments[i];
		
		if (routeSegment.startsWith(":")) {
			const paramName = routeSegment.substring(1);
			params[paramName] = pathSegment;
			continue;
		}
		
		if (routeSegment !== pathSegment) {
			return { match: false, params: {} };
		}
	}
	
	return { match: true, params };
}

export function resolveRoutePath(basePath: string, subpath: string): string {
	if (subpath.startsWith("/")) {
		return subpath;
	}
	
	let resolvedPath = basePath;
	
	if (resolvedPath !== '/' && !resolvedPath.endsWith("/")) {
		resolvedPath += "/";
	} else if (resolvedPath === "/") {
        // if base is "/" and subpath is "foo", result should be "/foo"
        // if subpath is empty or also "/", result is "/"
        if (subpath === "" || subpath === "/") return "/";
    }

    // Avoid double slash if subpath somehow starts with one after logic above (e.g. base "/", subpath "/foo")
    const cleanSubpath = subpath.startsWith("/") ? subpath.substring(1) : subpath;
    
    // Special case: if base is "/" and we added a trailing slash, but cleanSubpath is empty, avoid "//"
    if (resolvedPath.endsWith("/") && cleanSubpath === "") {
        return resolvedPath.slice(0,-1) || "/";
    }
	return resolvedPath + cleanSubpath;
}
