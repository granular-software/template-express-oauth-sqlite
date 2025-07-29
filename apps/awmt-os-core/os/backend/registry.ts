import { BaseAstNode, ComponentBundle, JsElement, RenderParams, ViewNode } from "./common_types";
import { isRouteMatch, resolveRoutePath } from "../components/utils"; // Import routing helpers

// Placeholder for UUID generation - replace with actual import if available
// import { randomUUID } from 'crypto'; // Node.js
export const generateUUID = (): string => {
	// In a browser environment, crypto.randomUUID is available
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	// Fallback for environments without crypto.randomUUID (like older Node.js or specific runtimes)
	// This is a simple a very basic pseudo-random UUID, NOT for production security.
	let d = new Date().getTime();
	let d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		let r = Math.random() * 16;
		if (d > 0) {
			r = (d + r) % 16 | 0;
			d = Math.floor(d / 16);
		} else {
			r = (d2 + r) % 16 | 0;
			d2 = Math.floor(d2 / 16);
		}
		return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	});
};

// Use type erasure for the maps since we can't store different generic types in the same map
const bundle_map = new Map<string, ComponentBundle<any>>();
const node_type_map = new Map<string, ComponentBundle<any>>();

export function register_bundle<N extends BaseAstNode = BaseAstNode>(bundle: ComponentBundle<N>): void {
	// Register by component name (for JS to AST conversion)
	if (bundle_map.has(bundle.component_name)) {
		throw new Error(`bundle "${bundle.component_name}" already registered`);
	}
	bundle_map.set(bundle.component_name, bundle);
	
	// Also register by node_type for AST to view conversion
	// Extract node_type from the build_ast function's return value
	// This is a bit hacky but works for our simple case
	const dummyElement: JsElement = {
		type: bundle.component_name,
		props: {},
		children: []
	};
	
	try {
		// Try to get the node_type from a dummy conversion
		// The dummy recurse function should return a full BaseAstNode, as that's what the component's build_ast expects for recursion.
		const dummyRecurse = (_e: JsElement): BaseAstNode => ({ node_type: "dummy_child_for_type_detection", uuid: generateUUID() });
		const dummyAstOmitted = bundle.build_ast(dummyElement, dummyRecurse);
		// The component's build_ast returns Omit<N, "uuid">, so we add a UUID here for the dummy AST.
		const dummyAst = { ...dummyAstOmitted, uuid: generateUUID() } as N; // Cast to N
		const nodeType = dummyAst.node_type;
		
		// Register by node_type
		node_type_map.set(nodeType, bundle);
		console.log(`Registered bundle for component "${bundle.component_name}" with node_type "${nodeType}"`);
	} catch (error) {
		console.warn(`Could not determine node_type for ${bundle.component_name}, using component name as fallback`);
		// Fallback: use component name as node_type
		node_type_map.set(bundle.component_name.toLowerCase(), bundle);
	}
}

/* ---------- public helpers ------------------------------------------- */

function resolve_bundle_for_js(element: JsElement): ComponentBundle<any> {
	if (!element) {
		throw new Error("Element is undefined or null");
	}
	
	if (!element.type) {
		console.error("Invalid element:", element);
		throw new Error("Element has no type property");
	}
	
	// console.log("Resolving bundle for element:", element);

	const key = typeof element.type === "string" ? element.type : element.type.name;
	if (!key) {
		console.error("Element type has no name:", element.type);
		throw new Error(`Cannot resolve component name from type: ${String(element.type)}`);
	}
	
	const bundle = bundle_map.get(key);
	if (!bundle) {
		console.error("Available bundles:", Array.from(bundle_map.keys()));
		throw new Error(`No bundle for component "${key}"`);
	}
	
	return bundle;
}

export function parse_ast(root: JsElement): BaseAstNode {
	try {
		if (typeof root.type === "function") {
			// It's a functional component. Check if it has a bundle.
			const componentName = root.type.name;
			if (bundle_map.has(componentName)) {
				// This functional component has a bundle (e.g., Box, Text).
				// Use its bundle's build_ast directly.
				// console.log(`Functional component ${componentName} has a bundle. Using its build_ast.`);
				const bundle = bundle_map.get(componentName)!;
				const builtNode = bundle.build_ast(root, parse_ast); // Returns Omit<N, "uuid">
				// Add uuid. Ensure children processed by parse_ast also get UUIDs.
				return { ...builtNode, uuid: generateUUID() } as BaseAstNode; // Cast as BaseAstNode after adding uuid
			} else {
				// This functional component does NOT have a bundle (e.g., NewNote).
				// Execute it to get its actual JsElement tree and parse that.
				// console.log(`Executing functional component ${componentName} (no bundle).`);
				const propsWithChildren = { ...root.props, children: root.children };
				const returnedElement = root.type(propsWithChildren) as JsElement;

				if (!returnedElement) {
					// console.warn(`Functional component ${componentName} returned null/undefined`);
					return { node_type: "empty_fragment", uuid: generateUUID() };
				}
				// Recursively parse, then add UUID
				const parsedNode = parse_ast(returnedElement);
				return { ...parsedNode, uuid: parsedNode.uuid || generateUUID() };
			}
		} else if (typeof root.type === "string") {
			// It's a string type (e.g., from an HTML-like element returned by a bundled component, or a root string type).
			// These should have a bundle (e.g. "Box" component string, or a future "div" bundle if we add one).
			const bundle = resolve_bundle_for_js(root);
			// console.log(`Using bundle for "${bundle.component_name}" (string type) to convert JS to AST`);
			// The bundle's build_ast should handle its own children and their UUIDs.
			// We add the UUID to the node returned by build_ast.
			const builtNode = bundle.build_ast(root, parse_ast); // Returns Omit<N, "uuid">
			return { ...builtNode, uuid: generateUUID() } as BaseAstNode; // Cast as BaseAstNode after adding uuid
		} else {
			// Should not happen if JsElement.type is always string or function
			console.error("Unexpected root.type:", root.type);
			throw new Error("Invalid JsElement type");
		}
	} catch (error) {
		console.error("Error converting JS tree to AST:", error);
		throw error;
	}
}

export async function render_view(node: BaseAstNode, params: RenderParams = {}): Promise<ViewNode> {
	if (!node) {
		throw new Error("Node is undefined or null");
	}
	
	if (!node.node_type) {
		console.error("Invalid node:", node);
		throw new Error("Node has no node_type property");
	}
	
	// Try to find bundle by exact node_type first
	let bundle = node_type_map.get(node.node_type);
	
	// If not found, try case-insensitive lookup
	if (!bundle) {
		// console.log(`No exact match for node_type "${node.node_type}", trying case-insensitive lookup`);
		for (const [key, value] of node_type_map.entries()) {
			if (key.toLowerCase() === node.node_type.toLowerCase()) {
				bundle = value;
				break;
			}
		}
	}
	
	if (!bundle) {
		console.error("Available node types:", Array.from(node_type_map.keys()));
		throw new Error(`No renderer for node_type "${node.node_type}"`);
	}

	// Use the render_view function to fetch data and create the view
	// bundle.render_view now returns Promise<Omit<ViewNode, "ast_node_uuid">>
	const viewNodeOmitted = await bundle.render_view(node, params, (n) => render_view(n, params));

	// Automatically add ast_node_uuid and the ViewNode's own uuid
	return {
		...viewNodeOmitted, 
		uuid: generateUUID(), // Add the ViewNode's own UUID
		ast_node_uuid: node.uuid, 
		// Children returned by viewNodeOmitted should already be full ViewNodes (with their own uuids/ast_node_uuids)
		// if the component created them directly.
		// If children were created via recurse(), they also got full UUIDs from deeper render_view calls.
		children: viewNodeOmitted.children // No mapping needed here if components adhere to the contract
	};
}

// Function to find an AST node by its UUID
function find_ast_node_by_uuid(node: BaseAstNode, uuid: string): BaseAstNode | null {
	if (node.uuid === uuid) {
		return node;
	}
	if (node.children) {
		for (const child of node.children) {
			const found = find_ast_node_by_uuid(child, uuid);
			if (found) {
				return found;
			}
		}
	}
	return null;
}

// Function to update a part of the view
// This is a recursive function that traverses the current_view and replaces the node(s)
// that match the new_partial_view's ast_node_uuid.
function update_view_node_recursive(current_view_node: ViewNode, new_partial_view_node: ViewNode): ViewNode {
	// If the current view node is the one that was re-rendered, replace it entirely.
	if (current_view_node.ast_node_uuid === new_partial_view_node.ast_node_uuid) {
		return new_partial_view_node;
	}

	// Otherwise, recursively update its children, if any.
	if (current_view_node.children && current_view_node.children.length > 0) {
		const updated_children = current_view_node.children.map(child_view_node => {
			// We only dive deeper if the child_view_node could potentially contain the node we are looking for.
			// A simple check: does the new_partial_view_node's AST UUID appear anywhere under this child_view_node?
			// This is a simplification. A more robust way would be to know the AST hierarchy.
			// For now, we will assume that if ast_node_uuid doesn't match, we check children.
			return update_view_node_recursive(child_view_node, new_partial_view_node);
		});
		return { ...current_view_node, children: updated_children };
	}

	// If no children or the node wasn't found in this branch, return the current node as is.
	return current_view_node;
}

export async function rerender(
	ast_root: BaseAstNode,
	current_view: ViewNode,
	ast_node_id_to_rerender: string | null,
	params: RenderParams = {}
): Promise<ViewNode> {
	if (ast_node_id_to_rerender === null) {
		// Rerender the whole view
		return render_view(ast_root, params);
	}

	const ast_node_to_rerender = find_ast_node_by_uuid(ast_root, ast_node_id_to_rerender);
	if (!ast_node_to_rerender) {
		console.warn(`AST node with ID "${ast_node_id_to_rerender}" not found for rerender. Returning current view.`);
		return current_view; // Or throw an error
	}

	// Rerender the specific AST node (and its children)
	const new_partial_view = await render_view(ast_node_to_rerender, params);

	// Now, we need to integrate this new_partial_view into the existing current_view
	// This requires finding where the old view part (generated by ast_node_id_to_rerender) was and replacing it.
	return update_view_node_recursive(current_view, new_partial_view);
}

// Helper function to recursively reconstruct the view during navigation
async function reconstruct_view_for_navigation(
	currentViewNode: ViewNode,
	astRoot: BaseAstNode, // Root of the AST tree to find AST nodes
	parentCalculatedAbsolutePath: string, // The absolute path context for the current AST node
	newGlobalPath: string, // The target global path for navigation
	newGlobalRenderParams: RenderParams // Base RenderParams for the new path
): Promise<ViewNode> {
	const astNode = find_ast_node_by_uuid(astRoot, currentViewNode.ast_node_uuid);

	if (!astNode) {
		console.warn(`AST node ${currentViewNode.ast_node_uuid} not found during navigation. Returning current view node.`);
		return currentViewNode;
	}

	if (astNode.node_type === 'route') {
		const routeAstNode = astNode as any; // Assuming RouteAstNode structure with 'subpath'
		const routeSubpath = routeAstNode.subpath || "";
		const thisRouteEffectivePath = resolveRoutePath(parentCalculatedAbsolutePath, routeSubpath);

		const evalNew = isRouteMatch(thisRouteEffectivePath, newGlobalPath);
		const oldIsMatch = currentViewNode.props.isMatch as boolean;

		if (evalNew.match !== oldIsMatch) {
			// isMatch flipped, rerender this Route AST node entirely
			console.log(`Route ${thisRouteEffectivePath} (AST: ${astNode.uuid}) isMatch changed from ${oldIsMatch} to ${evalNew.match}. Rerendering.`);
			// Pass merged route_params down for the rerender
			const paramsForRerender: RenderParams = {
				...newGlobalRenderParams,
				route_params: { ...(newGlobalRenderParams.route_params || {}), ...evalNew.params }
			};
			return render_view(astNode, paramsForRerender); // render_view will assign a new ViewNode UUID
		} else {
			// isMatch is stable
			if (!evalNew.match) {
				// Was false, is still false. Return current node (should have no rendered children / be minimal)
				return currentViewNode;
			}

			// Was true, is still true. Process children with remaining path.
			const routeSegments = thisRouteEffectivePath.split('/').filter(Boolean);
			const newGlobalPathSegments = newGlobalPath.split('/').filter(Boolean);
			let remainingNewPathSegment = '/' + newGlobalPathSegments.slice(routeSegments.length).join('/');
			if (remainingNewPathSegment === "//") remainingNewPathSegment = "/";

			let childrenChanged = false;
			const newChildrenPromises = (currentViewNode.children || []).map(async (childView) => {
				const processedChild = await reconstruct_view_for_navigation(
					childView,
					astRoot,
					thisRouteEffectivePath, // Parent path for children is this route's effective path
					remainingNewPathSegment,  // Children operate on the remaining path segment
					newGlobalRenderParams     // Pass base new render params (route_params are set by routes)
				);
				if (processedChild !== childView) {
					childrenChanged = true;
				}
				return processedChild;
			});
			const newChildren = await Promise.all(newChildrenPromises);

			if (childrenChanged || JSON.stringify(currentViewNode.props.params) !== JSON.stringify(evalNew.params)) {
				// Children changed or route params for this active route changed
				return { ...currentViewNode, props: { ...currentViewNode.props, isMatch: true, params: evalNew.params }, children: newChildren };
			} else {
				return currentViewNode; // No change in this active route's children or its own params
			}
		}
	} else {
		// Not a route node, just process children
		let childrenChanged = false;
		const newChildrenPromises = (currentViewNode.children || []).map(async (childView) => {
			const processedChild = await reconstruct_view_for_navigation(
				childView,
				astRoot,
				parentCalculatedAbsolutePath, // Path context remains the same for non-route children
				newGlobalPath,            // Global path is still the main target for any nested routes further down
				newGlobalRenderParams
			);
			if (processedChild !== childView) {
				childrenChanged = true;
			}
			return processedChild;
		});
		const newChildren = await Promise.all(newChildrenPromises);

		if (childrenChanged) {
			return { ...currentViewNode, children: newChildren }; // Return new object with new children array, UUID preserved
		} else {
			return currentViewNode; // No change in this subtree
		}
	}
}

export async function navigate(
	ast_root: BaseAstNode,
	current_view: ViewNode,
	new_router_path: string,
	old_render_params: RenderParams // Params used to render current_view, must include old router_path
): Promise<ViewNode> {
	const old_router_path = old_render_params.router_path || "/";

	if (old_router_path === new_router_path) {
		console.log("Navigate: old path is same as new path. No change.");
		return current_view;
	}

	console.log(`Navigate: from ${old_router_path} to ${new_router_path}`);

	const new_render_params: RenderParams = {
		...old_render_params, // Carry over other params like api, text_scale
		router_path: new_router_path,
		route_params: {} // Reset top-level route_params; they'll be populated by routes
	};

	return reconstruct_view_for_navigation(current_view, ast_root, "/", new_router_path, new_render_params);
}
