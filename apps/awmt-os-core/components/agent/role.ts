import { Effect } from "effect";
import { native_model } from "../../native/native_model";
import CATEGORY from "../../native/feature_categories";
import { permissionAllowed } from "../permission/permission_allowed";
import { permissionNotAllowed } from "../permission/permission_not_allowed";
import { permissionIfSure } from "../permission/permission_if_sure";
import { permissionAskValidation } from "../permission/permission_ask_validation";

export const role = native_model.path("role").label("Role");

role.feature(permissionAllowed, CATEGORY.PERMISSION);
role.feature(permissionNotAllowed, CATEGORY.PERMISSION);
role.feature(permissionIfSure, CATEGORY.PERMISSION);
role.feature(permissionAskValidation, CATEGORY.PERMISSION);
