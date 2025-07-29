import { BaseAstNode, JsElement, ViewNode, RenderParams, GetReactProps } from "../backend/common_types";
import { register_bundle } from "../backend/registry";
import { ClickableLink } from "../types";
import { BuildAst, RenderView } from "./utils";

export interface LinkAstNode extends BaseAstNode {
	node_type: "link";
	label: string;
	path: string;
}

type LinkProps = GetReactProps<LinkAstNode>;

export function Link({ label, path }: LinkProps) {
	return <span>{label}</span>;
}

const build_ast: BuildAst<LinkAstNode> = function(element: JsElement<LinkProps>, recurse: (e: JsElement) => BaseAstNode): Omit<LinkAstNode, "uuid"> {
	return {
		node_type: "link",
		label: element.props.label ?? element.props.path ?? "Unnamed link",
		path: element.props.path ?? "/",
	};
}

// Helper function to resolve link paths
function resolveLinkPath(basePath: string, linkPath: string): string {
	// If linkPath is an absolute path (starts with '/'), it's typically considered relative to the application root.
	if (linkPath.startsWith('/')) {
		return linkPath;
	}

	// For relative paths, resolve against the basePath.
	// Normalize basePath: remove trailing slash if present, unless it's the root "/"
	let normalizedBasePath = basePath;
	if (normalizedBasePath !== '/' && normalizedBasePath.endsWith('/')) {
		normalizedBasePath = normalizedBasePath.slice(0, -1);
	}

	// Split segments and process
	const baseSegments = normalizedBasePath.split('/').filter(s => s.length > 0);
	const linkPathSegments = linkPath.split('/');

	let finalSegments = [...baseSegments];

	for (const segment of linkPathSegments) {
		if (segment === "..") {
			// Go up one level, but not beyond the root an empty segment might imply root if base was ""
			if (finalSegments.length > 0) {
				finalSegments.pop();
			}
		} else if (segment !== "." && segment !== "") {
			finalSegments.push(segment);
		} else if (segment === "" && finalSegments.length === 0 && linkPathSegments.length === 1) {
			// Handles case where linkPath is just "" or "." on root, should stay root
			// No push needed, will result in "/"
		}
	}
	
	// Construct the final path
	let resolved = '/' + finalSegments.join('/');
	
	// If the original linkPath ended with a slash and the resolved path doesn't (and isn't just "/"), add it back.
	// This is for preserving trailing slashes if they were intentional for directory-like links.
	if (linkPath.endsWith('/') && resolved !=='/' && !resolved.endsWith('/')) {
		resolved += '/';
	}
	// Handle the case where the path resolves to empty segments (e.g. /../../ -> /)
	if (resolved === "//") return "/";

	return resolved;
}

const render_view: RenderView<LinkAstNode> = async function(node: LinkAstNode, params: RenderParams) {
	const currentPath = params.router_path || "/";
	const fullPath = resolveLinkPath(currentPath, node.path);
	
	const clickableLink: ClickableLink = {
		name: node.label,
		description: `Link to ${fullPath}`,
		window_id: "", // This should be provided by the system
		router_path: fullPath,
		clicked: false
	};
	
	return {
		kind: "link",
		props: {
			label: node.label,
			path: fullPath,
			fontSize: (params.text_scale ?? 1) * 14,
		},
		children: [],
		triggerable_actions: [],
		links: [clickableLink]
	};
}

register_bundle<LinkAstNode>({
	component_name: "Link",
	build_ast,
	render_view,
});
