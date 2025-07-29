import { z } from "zod";
import { AllStates, AwmtStateMachine, StateDefinition } from "./AwmtStateMachine";
import { FieldDefinitionOutput } from "./";

export type ConditionResult =
	| {
			name: string;
			type: "string" | "number" | "boolean" | "date" | "object";
			value?: any;
			value_type?: "string" | "number" | "boolean" | "date";
	  }
	| {
			name: string;
			type: "object";
			value_type: "state_machine";
			state_machine: string;
			state: AllStates<any, any> | "entry";
	  };

export type StringConditions = {
	not_null: () => ConditionResult;
	contains: (value: string) => ConditionResult;
	not_contains: (value: string) => ConditionResult;
	starts_with: (value: string) => ConditionResult;
	ends_with: (value: string) => ConditionResult;
	equal_to: (value: string) => ConditionResult;
	length_greater_than: (value: number) => ConditionResult;
	length_less_than: (value: number) => ConditionResult;
};

export type NumberConditions = {
	not_null: () => ConditionResult;
	null: () => ConditionResult;
	greater_than: (value: number) => ConditionResult;
	less_than: (value: number) => ConditionResult;
	equal_to: (value: number) => ConditionResult;
};

export type BooleanConditions = {
	not_null: () => ConditionResult;
	null: () => ConditionResult;
	equal_to: (value: boolean) => ConditionResult;
};

export type DateConditions = {
	not_null: () => ConditionResult;
	null: () => ConditionResult;
	before_date: (value: Date) => ConditionResult;
	after_date: (value: Date) => ConditionResult;
	older_than_seconds: (value: number) => ConditionResult;
	newer_than_seconds: (value: number) => ConditionResult;
};

export type ObjectConditions = {
	not_null: () => ConditionResult;
	null: () => ConditionResult;
	is: (value: string) => ConditionResult;
	in_state: <
		A extends StateDefinition,
		B extends StateDefinition,
		C extends z.ZodObject<any>,
		D extends Record<string, FieldDefinitionOutput>,
		E extends AllStates<A, B> | "entry"
	>(
		state_machine: AwmtStateMachine<A, B, C, D>,
		state: E
	) => ConditionResult;
};

export function getFieldConditions(type: string) {
	if (type === "string") {
		return getStringConditions();
	} else if (type === "number") {
		return getNumberConditions();
	} else if (type === "boolean") {
		return getBooleanConditions();
	} else if (type === "date") {
		return getDateConditions();
	} else {
		return getObjectConditions();
	}
}

function getStringConditions(): StringConditions {
	return {
		not_null: () => ({ name: "string_not_null_condition", type: "string" }),
		contains: (value) => ({
			name: "string_contains_condition",
			type: "string",
			value,
			value_type: "string",
		}),
		not_contains: (value) => ({
			name: "string_not_contains_condition",
			type: "string",
			value,
			value_type: "string",
		}),
		starts_with: (value) => ({
			name: "string_starts_with_condition",
			type: "string",
			value,
			value_type: "string",
		}),
		ends_with: (value) => ({
			name: "string_ends_with_condition",
			type: "string",
			value,
			value_type: "string",
		}),
		equal_to: (value) => ({
			name: "string_equals_condition",
			type: "string",
			value,
			value_type: "string",
		}),
		length_greater_than: (value) => ({
			name: "string_length_greater_than_condition",
			type: "string",
			value,
			value_type: "number",
		}),
		length_less_than: (value) => ({
			name: "string_length_less_than_condition",
			type: "string",
			value,
			value_type: "number",
		}),
	};
}

function getNumberConditions(): NumberConditions {
	return {
		not_null: () => ({ name: "number_not_null_condition", type: "number" }),
		null: () => ({ name: "number_null_condition", type: "number" }),
		greater_than: (value) => ({
			name: "number_greater_than_condition",
			type: "number",
			value,
			value_type: "number",
		}),
		less_than: (value) => ({
			name: "number_less_than_condition",
			type: "number",
			value,
			value_type: "number",
		}),
		equal_to: (value) => ({
			name: "number_equal_to_condition",
			type: "number",
			value,
			value_type: "number",
		}),
	};
}

function getBooleanConditions(): BooleanConditions {
	return {
		not_null: () => ({ name: "boolean_not_null_condition", type: "boolean" }),
		null: () => ({ name: "boolean_null_condition", type: "boolean" }),
		equal_to: (value) => ({
			name: "boolean_equals_condition",
			type: "boolean",
			value,
			value_type: "boolean",
		}),
	};
}

function getDateConditions(): DateConditions {
	return {
		not_null: () => ({ name: "date_not_null_condition", type: "date" }),
		null: () => ({ name: "date_null_condition", type: "date" }),
		before_date: (value) => ({
			name: "date_before_condition",
			type: "date",
			value,
			value_type: "date",
		}),
		after_date: (value) => ({
			name: "date_after_condition",
			type: "date",
			value,
			value_type: "date",
		}),
		older_than_seconds: (value) => ({
			name: "date_older_than_seconds_condition",
			type: "number",
			value,
			value_type: "number",
		}),
		newer_than_seconds: (value) => ({
			name: "date_newer_than_seconds_condition",
			type: "number",
			value,
			value_type: "number",
		}),
	};
}

function getObjectConditions(): ObjectConditions {
	return {
		not_null: () => ({ name: "not_null_condition", type: "object" }),
		null: () => ({ name: "null_condition", type: "object" }),
		in_state: (state_machine, state) => ({
			name: "in_state_condition",
			type: "object",

			value_type: "state_machine",
			state_machine: state_machine.name,
			state: state,
		}),
		is: (value) => ({
			name: "object_is_condition",
			type: "object",
			value,
			value_type: "string",
		}),
	};
}

// Rewrite the above code, but for actions instead of conditions, and witht the following actions :
// string_set_value
// action_string_update_value
// action_number_set_value
// action_number_increment_by
// action_number_decrement_by
// action_boolean_set_value
// action_boolean_human_validation
// action_date_select_date
// // action_select

// export type ActionResult = {
// 	name: string;
// 	type: "string" | "number" | "boolean" | "date" | "object";
// };

// export type StringActions = {
// 	set_value: () => ActionResult;
// 	update_value: () => ActionResult;
// };

// export type NumberActions = {
// 	set_value: () => ActionResult;
// 	increment_by: () => ActionResult;
// 	decrement_by: () => ActionResult;
// };

// export type BooleanActions = {
// 	set_value: () => ActionResult;
// 	human_validation: () => ActionResult;
// };

// export type DateActions = {
// 	select_date: () => ActionResult;
// };

// export type ObjectActions = {
// 	select: () => ActionResult;
// };

// export function getFieldActions(type: string) {
// 	if (type === "string") {
// 		return getStringActions();
// 	} else if (type === "number") {
// 		return getNumberActions();
// 	} else if (type === "boolean") {
// 		return getBooleanActions();
// 	} else if (type === "date") {
// 		return getDateActions();
// 	} else {
// 		return getObjectActions();
// 	}
// }

// function getStringActions(): StringActions {
// 	return {
// 		set_value: () => ({ name: "string_set_value", type: "string" }),
// 		update_value: () => ({ name: "action_string_update_value", type: "string" }),
// 	};
// }

// function getNumberActions(): NumberActions {
// 	return {
// 		set_value: () => ({ name: "action_number_set_value", type: "number" }),
// 		increment_by: () => ({ name: "action_number_increment_by", type: "number" }),
// 		decrement_by: () => ({ name: "action_number_decrement_by", type: "number" }),
// 	};
// }

// function getBooleanActions(): BooleanActions {
// 	return {
// 		set_value: () => ({ name: "action_boolean_set_value", type: "boolean" }),
// 		human_validation: () => ({ name: "action_boolean_human_validation", type: "boolean" }),
// 	};
// }

// function getDateActions(): DateActions {
// 	return {
// 		select_date: () => ({ name: "action_date_select_date", type: "date" }),
// 	};
// }

// function getObjectActions(): ObjectActions {
// 	return {
// 		select: () => ({ name: "action_select", type: "object" }),
// 	};
// }

// // Page company.ts

// import user from "./user.ts"

// const company = {
// 	name: "company",
// 	founder: user
// }

// export default company

// // Page user.ts

// import company from "./company.ts"

// const user = {
// 	name: "user",
// 	workf_for: company
// }

// export default user
