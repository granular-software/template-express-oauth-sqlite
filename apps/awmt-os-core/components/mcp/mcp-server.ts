import { Effect } from "effect";
import { native_model } from "../../native/native_model";
import CATEGORY from "../../native/feature_categories";

export const mcpServer = native_model
	.path("mcp_server")
	.label("McpServer")
	.has({
		url: {
			instance_of: ["string"],
		},
		tools: {
			submodel_templates: ["mcp_tool"],
		},
		resources: {
			submodel_templates: ["mcp_resource"],
		},
	});
