import CATEGORY from "../../native/feature_categories";
import { native_model } from "../../native/native_model";
import { permissionAllowed } from "../permission/permission_allowed";
import { permissionAskValidation } from "../permission/permission_ask_validation";
import { permissionIfSure } from "../permission/permission_if_sure";
import { permissionNotAllowed } from "../permission/permission_not_allowed";

export const agent = native_model
	.path("agent")
	.label("Agent")
	.has({
		authentication_token: {
			instance_of: ["string"],
		},

		stopped: {
			instance_of: ["boolean"],
			boolean_value: false,
		},
	});

agent.feature(permissionAllowed, CATEGORY.PERMISSION);
agent.feature(permissionNotAllowed, CATEGORY.PERMISSION);
agent.feature(permissionIfSure, CATEGORY.PERMISSION);
agent.feature(permissionAskValidation, CATEGORY.PERMISSION);

