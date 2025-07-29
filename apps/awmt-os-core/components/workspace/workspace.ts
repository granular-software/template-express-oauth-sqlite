import { Effect } from "effect";
import { native_model } from "../../native/native_model";
import CATEGORY from "../../native/feature_categories";
import { agent } from "../agent/agent";
import { mcpServer } from "../mcp/mcp-server";
import { role } from "../agent/role";

export const workspace = native_model.path("workspace").label("Workspace");
// .has({
// 	mcp_servers: {
// 		submodel_templates_from_prototypes: ["mcp_server"],
// 	},
// });

workspace.feature(agent, CATEGORY.AGENT);

workspace.feature(mcpServer, CATEGORY.APPLICATION);

workspace.feature(role, CATEGORY.ROLE);
