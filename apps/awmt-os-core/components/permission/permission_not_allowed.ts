import { Effect } from "effect";
import { native_model } from "../../native/native_model";
import CATEGORY from "../../native/feature_categories";

export const permissionNotAllowed = native_model.path("permission_not_allowed").label("PermissionNotAllowed").has({
	of: {},
});


