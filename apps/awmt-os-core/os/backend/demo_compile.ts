import { load_all_components } from "./load_components";
import { parse_ast, render_view, rerender, navigate } from "./registry";
import { transpile_file } from "./transpile";
import { BaseAstNode, ViewNode, RenderParams } from "./common_types";

async function main(): Promise<void> {
	await load_all_components();

	console.log("\n--- Initial Transpile and AST Parse ---");
	const tsx_code = await transpile_file("./os/apps/notes_app.tsx");
	const ast: BaseAstNode = parse_ast(tsx_code);
	console.log("AST:", JSON.stringify(ast));

	console.log("\n--- Initial Render ---");
	const initialRenderParams: RenderParams = {
		router_path: "/note/123/edit",
		// text_scale: 1.0, // Keep params minimal for clarity unless testing specific effects
	};
	const initialView: ViewNode = await render_view(ast, initialRenderParams);
	console.log(JSON.stringify(initialView));

	// Store the initial view and its params for later comparison or use
	let currentView: ViewNode = initialView;
	let currentRenderParams: RenderParams = initialRenderParams;

	console.log("\n--- Navigate --- ");
	const newPath = "/note/456/delete";
	// Pass currentRenderParams (which contains the old path) to navigate.
	// The new_router_path argument specifies the target path.
	const navigatedView: ViewNode = await navigate(ast, currentView, newPath, currentRenderParams);
	console.log(JSON.stringify(navigatedView));
	currentView = navigatedView; // Update currentView
	// Update currentRenderParams to reflect the state after navigation
	currentRenderParams = { ...currentRenderParams, router_path: newPath };

	console.log("\n--- Partial Rerender --- ");
	let targetNodeIdForRerender: string | null = null;

	// Try to find an active Route node's AST UUID to target for rerender for a more meaningful demo.
	function findActiveRouteAstUuid(viewNode: ViewNode): string | null {
		if (viewNode.kind === 'route' && viewNode.props.isMatch === true) {
			return viewNode.ast_node_uuid;
		}
		if (viewNode.children) {
			for (const child of viewNode.children) {
				const found = findActiveRouteAstUuid(child);
				if (found) return found;
			}
		}
		return null;
	}
	console.log("\nDemo complete.");
}

main().catch((err) => {
	console.error("Error in demo:", err);
	process.exit(1);
});
