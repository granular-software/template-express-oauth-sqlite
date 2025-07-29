import { Effect } from "effect";
import { native_model } from "../../native/native_model";
import CATEGORY from "../../native/feature_categories";

export const permissionAllowed = native_model.path("permission_allowed").label("PermissionAllowed").has({
	of: {},
});
