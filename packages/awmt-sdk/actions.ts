

export type ActionResult = {
	name: string;
	type: "string" | "number" | "boolean" | "date" | "object";
};

export type StringActions = {
	set_value: () => ActionResult;
	update_value: () => ActionResult;
};

export type NumberActions = {
	set_value: () => ActionResult;
	increment_by: () => ActionResult;
	decrement_by: () => ActionResult;
};

export type BooleanActions = {
	set_value: () => ActionResult;
	human_validation: () => ActionResult;
};

export type DateActions = {
	select_date: () => ActionResult;
    select_now: () => ActionResult;
};

export type ObjectActions = {
	select: () => ActionResult;
};

export function getFieldActions(type: string) {
	if (type === "string") {
		return getStringActions();
	} else if (type === "number") {
		return getNumberActions();
	} else if (type === "boolean") {
		return getBooleanActions();
	} else if (type === "date") {
		return getDateActions();
	} else {
		return getObjectActions();
	}
}

function getStringActions(): StringActions {
	return {
		set_value: () => ({ name: "string_set_value", type: "string" }),
		update_value: () => ({ name: "action_string_update_value", type: "string" }),
	};
}

function getNumberActions(): NumberActions {
	return {
		set_value: () => ({ name: "action_number_set_value", type: "number" }),
		increment_by: () => ({ name: "action_number_increment_by", type: "number" }),
		decrement_by: () => ({ name: "action_number_decrement_by", type: "number" }),
	};
}

function getBooleanActions(): BooleanActions {
	return {
		set_value: () => ({ name: "action_boolean_set_value", type: "boolean" }),
		human_validation: () => ({ name: "action_boolean_human_validation", type: "boolean" }),
	};
}

function getDateActions(): DateActions {
	return {
		select_date: () => ({ name: "action_date_select_date", type: "date" }),
        select_now: () => ({ name: "action_date_select_now", type: "date" }),
	};
}

function getObjectActions(): ObjectActions {
	return {
		select: () => ({ name: "action_select", type: "object" }),
	};
}
