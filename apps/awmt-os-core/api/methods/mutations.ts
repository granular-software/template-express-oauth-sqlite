import { Effect } from "effect";
import CATEGORY from "../../native/feature_categories";
import clean_name, { clean_feature_name, clean_submodel_name } from "../../utils/clean_name";
import { get_tail, is_root } from "../../utils/path";
import { Ant, GraphNode as Node } from "../Ant";
import { DeclarationQueue, ModelDeclaration } from "../boot";
import handle_declaration from "../declaration";
import { graph_query, graph_query_on_nodes } from "../graph";
import { description, direct_classes, find_model, group_siblings } from "./queries";
import { get_mutable_path_end } from "./utils";

export async function mutable(ant: Ant) {
	let query = "";

	const model_path = ant.path;

	// console.log("MUTABLE", model_path);

	if (!model_path) {
		console.trace();
		throw new Error("Model path is undefined");
	}

	const [origin, ...tail] = model_path.split(":");

	query += " MATCH (origin:Model { name: '" + origin + "' })\n";

	let last_node = "origin";

	for (let i = 0; i < tail.length; i++) {
		const next_node = "_" + tail.slice(0, i + 1).join("_");
		query += `MERGE (${last_node})-[:WHERE_THE]->(${next_node}:VirtualSubmodel { name: '${tail[i]}' })\n`;
		last_node = next_node;
	}

	query += `
		WITH *, ${last_node} AS last, origin \n

		MATCH path = (origin)-[:WHERE_THE*0..]->(last)

		UNWIND nodes(path) as node

		RETURN id(node) as id, node.name as node_name, node.label as label
	`;

	let start = Date.now();
	const result = await graph_query<{ id: number; node_name: string; label: string }>(query);

	// console.log(query, result, Date.now() - start);

	return result;
}

export async function create_model(name?: string, label?: string, declaration?: ModelDeclaration) {
	const clean_path = clean_name(name);

	// console.log("CREATE_MODEL", clean_path);

	// check if model already exists

	// const existing = await graph_query<{ id: number }>(
	// 	`
	// 	MATCH (model:Model { name: $name })
	// 	SET model.label = $label

	// 	RETURN id(model) as id
	// `,
	// 	{
	// 		name: clean_path,
	// 		label: label || clean_path,
	// 	},
	// );

	// if (existing.length) {
	// 	console.log("MODEL EXISTS", clean_path);
	// 	const new_model = await find_model(clean_path);

	// 	if (!new_model) {
	// 		throw new Error("Could not find model " + clean_path);
	// 	}

	// 	if (declaration) {
	// 		const ret = await handle_declaration(new DeclarationQueue(), new_model.path, declaration).poll_all(50, 50);
	// 	}

	// 	return new_model;
	// }

	// console.log("CREATE_MODEL", clean_path);

	const result = await graph_query<{
		new_id: number;
		new_label: string;
	}>(
		`
		MERGE (new:Model { name: $name })
		ON CREATE SET new.label = $label
		RETURN id(new) as new_id, new.label as new_label
	`,
		{
			name: clean_path,
			label: label || null,
		},
	);

	const new_node: Node = {
		id: result[0].new_id,
		own_label: label || clean_path,
		introspection: [],
		own_value: undefined,
	};

	const new_model = new Ant([new_node], clean_path);

	if (declaration) {
		const ret = await handle_declaration(new DeclarationQueue(), new_model.path, declaration).poll_all(50, 50);
	}

	const refresh = await Ant.object_from_path(new_model.path);

	if (!refresh) {
		throw new Error("Could not refresh model " + new_model.path);
	}

	return refresh;
}

export async function create_submodel(ant: Ant, subpath?: string, label?: string, prototype?: string) {
	const mutable_path_end = await get_mutable_path_end(ant);

	const clean_name = clean_submodel_name(subpath);

	const nodes = await graph_query<{
		id: number;
		last_node_name: string;
		last_node_label: string;
	}>(
		`
		MATCH (target) WHERE id(target) = $target_id

		WITH target

		MERGE (target)-[:WHERE_THE]->(virtual_submodel:VirtualSubmodel {name: $name, label: $label})
		
		RETURN 
			id(virtual_submodel) as id, 
			$name as last_node_name, 
			$label as last_node_label
		`,
		{
			name: clean_name,
			label: label || clean_name,
			target_id: mutable_path_end,
		},
	);

	const new_nodes = nodes.map((n) => ({
		id: n.id,
		own_label: n.last_node_label,
		introspection: [],
		own_value: undefined,
	}));

	if (!new_nodes.length) {
		throw new Error("Could not create submodel");
	}

	const new_node = new_nodes[0];

	const relative_path = nodes[0].last_node_name;

	const new_ant = ant.advance(new_nodes, relative_path, {
		id: new_node.id,
		label: new_node.own_label,
		node_name: relative_path,
	});

	if (prototype) {
		if (prototype === "string" || prototype === "number" || prototype === "boolean" || prototype === "date") {
			await Effect.runPromise(new_ant.set_class(prototype));
		} else await Effect.runPromise(new_ant.add_prototype_constraint(prototype));
	}

	return new_ant;
}

export async function create_submodel_template(ant: Ant, template: string) {
	const mutable_path_end = await get_mutable_path_end(ant);

	const clean_name = clean_submodel_name(template);

	await create_model(template);

	await graph_query(
		`
			MATCH (target) WHERE id(target) = $target_id WITH target
			MATCH (template:Model) WHERE template.name = $template
			MERGE (target)-[:HAS_SUBMODEL_TEMPLATE]->(template)
			RETURN template.label as label, template.name as path, id(template) as id
			`,
		{
			name: clean_name,
			template: template,
			target_id: mutable_path_end,
		},
	);

	return ant;
}

export async function create_submodel_template_from_prototype(ant: Ant, template: string) {
	const mutable_path_end = await get_mutable_path_end(ant);

	const clean_name = clean_submodel_name(template);

	await create_model(template);

	await graph_query(
		`
			MATCH (target) WHERE id(target) = $target_id WITH target
			MATCH (template:Model) WHERE template.name = $template
			MERGE (target)-[:HAS_SUBMODEL_TEMPLATE_FROM_PROTOTYPE]->(template)
			RETURN template.label as label, template.name as path, id(template) as id
			`,
		{
			name: clean_name,
			template: template,
			target_id: mutable_path_end,
		},
	);

	return ant;
}

export async function create_submodel_from_prototype(ant: Ant, template: string, subpath?: string, label?: string, as_reference?: boolean, instantiate: boolean = true, array: boolean = false) {
	const clean_subpath = clean_submodel_name(subpath);

	get_mutable_path_end(ant);

	console.log("create_submodel_from_prototype", { template, subpath, label, as_reference, instantiate, array });

	if (array && as_reference) {
		const new_set = await create_model();
		await Effect.runPromise(new_set.set_class("set"));
		await Effect.runPromise(new_set.use_existing_feature(template, CATEGORY.SET_TEMPLATE));
		const new_submodel = await create_submodel(ant, clean_subpath, label);
		await Effect.runPromise(new_submodel.set_reference(new_set.path));
		return new_submodel;
	} else if (array) {
		const submodel = await create_submodel(ant, clean_subpath, label);
		await Effect.runPromise(submodel.mutable());
		await Effect.runPromise(submodel.use_existing_feature(template, CATEGORY.SET_TEMPLATE));
		return submodel;
	}

	// if (as_reference && !instantiate) {
	// 	throw new Error("Cannot create a reference without instantiating the model");
	// }

	if (as_reference && !instantiate) {
		const new_model = await create_model();
		const submodel = await create_submodel(ant, clean_subpath, label);

		await Effect.runPromise(submodel.add_prototype_constraint(template));

		await Effect.runPromise(submodel.set_reference(new_model.path));
		return new_model;
	} else if (as_reference && instantiate) {
		const new_model = await create_model();
		const submodel = await create_submodel(ant, clean_subpath, label);

		await Effect.runPromise(new_model.add_prototype_constraint(template));
		await Effect.runPromise(new_model.set_class(template));

		await Effect.runPromise(submodel.set_reference(new_model.path));

		// console.log("created submodel from prototype", submodel.path, "with reference to", new_model.path);

		return new_model;
	} else {
		const submodel = await create_submodel(ant, clean_subpath, label);

		await Effect.runPromise(submodel.add_prototype_constraint(template));

		if (instantiate) {
			await Effect.runPromise(submodel.set_class(template));
		}

		return submodel;
	}
}

// export async function _use_submodel_template(ant: Ant, template: string, subpath?: string, label?: string, as_reference?: boolean, as_constraint?: boolean, array: boolean = false) {
// 	const clean_subpath = clean_submodel_name(subpath);

// 	get_mutable_path_end(ant);

// 	// if (as_reference && array) {
// 	// 	const new_model = await create_model();
// 	// 	const submodel = await create_submodel(ant, clean_subpath, label);

// 	// 	await Effect.runPromise(new_model.set_class("set"));

// 	// 	await Effect.runPromise(new_model.use_existing_feature(template, CATEGORY.SET_TEMPLATE));

// 	// 	await Effect.runPromise(submodel.set_reference(new_model.path));

// 	// 	return submodel;
// 	if (as_reference) {
// 		const new_model = await create_model();
// 		const submodel = await create_submodel(ant, clean_subpath, label);

// 		await Effect.runPromise(new_model.set_class(template));
// 		await Effect.runPromise(submodel.set_reference(new_model.path));

// 		return new_model;
// 	} else if (array) {
// 		const submodel = await create_submodel(ant, clean_subpath, label);

// 		await Effect.runPromise(submodel.mutable());

// 		await Effect.runPromise(submodel.use_existing_feature(template, CATEGORY.SET_TEMPLATE));

// 		return submodel;
// 	} else {
// 		const submodel = await create_submodel(ant, clean_subpath, label);

// 		await Effect.runPromise(await submodel.set_classes([template]));

// 		return submodel;
// 	}
// }

export async function set_classes(ant: Ant, class_names: string[]) {
	const mutable_path_end = await get_mutable_path_end(ant);

	const current_direct_classes = (await direct_classes(ant)).map((expl) => expl.path);

	const request = (class_name: string) =>
		graph_query<{
			id: number;
			last_node_name: string;
			last_node_label: string;
		}>(
			`
		MATCH (target) WHERE id(target) = $target_id WITH target

		MATCH (cl:Model { name: $name })
        MERGE (target)-[:INSTANCE_OF]->(cl)
		`,
			{
				name: clean_name(class_name),
				label: clean_name(class_name),
				target_id: mutable_path_end,
			},
		);

	const new_classes = class_names.filter((class_name) => !current_direct_classes.includes(class_name));
	const classes_to_link = new_classes.map(request);

	try {
		await Promise.all(classes_to_link);

		// if (new_classes.includes("entity")) {
		// 	await Effect.runPromise(
		// 		Ant.assert("entity").pipe(
		// 			Effect.flatMap((standalone) => standalone.mutable()),
		// 			Effect.flatMap((standalone) => standalone.create_submodel_template(ant.path)),
		// 		),
		// 	);

		// 	const object_parser = await get_mutable_ant("object_parser");

		// 	const make_as_submodel_template = Effect.tap((tpl: Ant) => object_parser.create_submodel_template(tpl.path));

		// 	let effects = [];

		// 	// Embedded object
		// 	effects.push(
		// 		Ant.create_model(undefined, undefined, {
		// 			instance_of: ["entity_object_parser"],
		// 			has: {
		// 				key: { instance_of: ["string"] },
		// 				input_type: string_value("object"),
		// 				output_type: string_value(ant.path),
		// 				is_array: boolean_value(false),
		// 				of: {
		// 					ref: { path: ant.path },
		// 				},
		// 			},
		// 		}).pipe(make_as_submodel_template),
		// 	);

		// 	// Embedded array of objects
		// 	effects.push(
		// 		Ant.create_model(undefined, undefined, {
		// 			instance_of: ["entity_object_parser"],
		// 			has: {
		// 				key: { instance_of: ["string"] },
		// 				input_type: string_value("array<object>"),
		// 				output_type: string_value(ant.path),
		// 				is_array: boolean_value(true),
		// 				of: {
		// 					ref: { path: ant.path },
		// 				},
		// 			},
		// 		}).pipe(make_as_submodel_template),
		// 	);

		// 	// Object FK
		// 	effects.push(
		// 		Ant.create_model(undefined, undefined, {
		// 			instance_of: ["string_parser"],
		// 			has: {
		// 				key: { instance_of: ["string"] },
		// 				input_type: string_value("string"),
		// 				output_type: string_value(ant.path),
		// 				is_array: boolean_value(false),
		// 				of: {
		// 					ref: { path: ant.path },
		// 				},
		// 			},
		// 		}).pipe(make_as_submodel_template),
		// 	);

		// 	// Array of object FK
		// 	effects.push(
		// 		Ant.create_model(undefined, undefined, {
		// 			instance_of: ["string_parser"],
		// 			has: {
		// 				key: { instance_of: ["string"] },
		// 				input_type: string_value("array<string>"),
		// 				output_type: string_value(ant.path),
		// 				is_array: boolean_value(true),
		// 				of: {
		// 					ref: { path: ant.path },
		// 				},
		// 			},
		// 		}).pipe(make_as_submodel_template),
		// 	);

		// 	await Effect.runPromise(Effect.all(effects));
		// }

		return Effect.runPromise(Ant.safe_from_path(ant.path));
	} catch (error) {
		console.error(error);
		throw error;
	}
}

export async function instantiate(ant: Ant, path?: string, label?: string, description?: string) {
	if (!is_root(ant.path)) {
		throw new Error("Only root models can be instantiated");
	}

	const start = Date.now();

	if (path) {
		const clean_path = clean_name(path);

		const query = `
			MATCH (prototype) WHERE id(prototype) = $node

			WITH prototype

			MATCH (instance)-[:INSTANCE_OF]->(prototype) WHERE instance.name = $path

			RETURN 
				id(instance) as id
		
		`;

		const find_instance = await graph_query_on_nodes<{
			id: number;
			path: string;
			label: string;
		}>(query, ant.node_ids, {
			path: clean_path,
		});

		// console.log("searching for existing instance", query, ant.node_ids, {
		// 	path: path,
		// });

		if (find_instance.length) {
			// console.log("found existing instance", find_instance, "in", Date.now() - start, "ms");

			const ants = await group_siblings(find_instance.map((f) => f.id));

			if (ants.length) {
				// console.log("returning existing instance", ants[0].path, "in", Date.now() - start, "ms");
				return ants[0];
			}
		}
	}

	const instance = await create_model(path);

	// console.log("created instance", instance.path, "in", Date.now() - start, "ms");

	const mutable_path_end = await get_mutable_path_end(instance);

	await graph_query_on_nodes(
		`
		MATCH (instance) WHERE id(instance) = $target_id

		MATCH (prototype:Model) WHERE id(prototype) = $node
		MERGE (instance)-[:INSTANCE_OF]->(prototype)
	`,
		ant.node_ids,
		{
			// nodes: ant.node_ids,
			target_id: mutable_path_end,
		},
	);

	if (label) {
		await set_label(instance, label);
	}

	// get the STATE_MACHINES feature_prototypes of the model. Then for each, use the feature_prototype, and set the state to the entry state,

	const state_machines = await Effect.runPromise(instance.feature_prototypes(CATEGORY.STATE_MACHINE));

	for (const state_machine of state_machines) {
		console.log("Found state machine to instantiate", state_machine.model.path);

		const feature = await Effect.runPromise(instance.use_feature_prototype(state_machine.model.path));

		// const f = await Effect.runPromise(ant.features(CATEGORY.STATE_MACHINE));

		console.log("CREATED FEATURE INSTANCE", feature.path, "INSTANCE OF", state_machine.model.path);

		const history = await Effect.runPromise(feature.at("history"));

		if (!history) {
			throw new Error("History not found");
		}

		const entry_state = await Effect.runPromise(feature.at("entry_state"));

		if (!entry_state) {
			throw new Error("Entry state not found");
		}

		const entry_state_ref = await Effect.runPromise(entry_state.reference());

		if (!entry_state_ref) {
			throw new Error("Entry state reference not found");
		}

		const entry_state_instance = await Effect.runPromise(entry_state_ref.instantiate());

		if (!entry_state_instance) {
			throw new Error("Entry state instance not found");
		}

		// const created_snapshot_in_history = await Effect.runPromise(history.create_submodel_from_prototype(entry_state_ref.path, undefined, undefined, true, true));

		// console.log({ created_snapshot_in_history });

		console.log("Feature path", feature.path, "Entry state ref", entry_state_ref.path, "instance : ", entry_state_instance.path);

		const curr = await Effect.runPromise(feature.at("current"));

		if (!curr) {
			throw new Error("Current state not found");
		}

		await Effect.runPromise(Effect.logInfo(`Setting reference of current to ${entry_state_instance.path}`));

		await Effect.runPromise(curr.set_reference(entry_state_instance.path));

		console.log("Set the current_ref to entry_state_ref", curr.path, entry_state_instance.path);

		const delay = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

		// await delay(10000);

		// const date = await Effect.runPromise(curr.at("date"));

		// if (!date) {
		// 	throw new Error("Date not found");
		// }

		// await Effect.runPromise(date.set_number_value(new Date().getTime()));

		console.log("Instantiated state machine", state_machine.model.path, "with entry state", entry_state_ref.path, "in", Date.now() - start, "ms");
	}

	return await find_model(instance.path);
}

export async function extend(ant: Ant, path?: string, label?: string) {
	if (!is_root(ant.path)) {
		throw new Error("Only root models can be extended");
	}

	const subclass = await create_model(path, label);

	const mutable_path_end = await get_mutable_path_end(subclass);

	const r = await graph_query_on_nodes(
		`
		MATCH (subclass) WHERE id(subclass) = $target_id

		MATCH (superclass) WHERE id(superclass) = $node
		MERGE (subclass)-[q:EXTENDS]->(superclass)

		RETURN subclass, superclass, q
	`,
		ant.node_ids,
		{
			// nodes: ant.node_ids,
			target_id: mutable_path_end,
		},
	);

	console.log("EXTENDED", r);

	return find_model(subclass.path) as Promise<Ant>;
}

export async function add_superclass(subclass: Ant, superclass: string) {
	const mutable_path_end = await get_mutable_path_end(subclass);

	if (get_tail(superclass)) {
		throw new Error("Superclass should not be a path with length > 1");
	}
	const r = await graph_query(
		`
		MATCH (subclass) WHERE id(subclass) = $target_id

		MATCH (superclass:Model { name: $name })
		MERGE (subclass)-[:EXTENDS]->(superclass)

		RETURN subclass, superclass
	`,
		{
			name: superclass,
			target_id: mutable_path_end,
		},
	);

	console.log("ADDED SUPERCLASS", superclass, "TO", subclass.path);

	return subclass;
}

export async function add_prototype(instance: Ant, prototype: string) {
	const mutable_path_end = await get_mutable_path_end(instance);

	if (get_tail(prototype)) {
		// throw new Error("Prototype should not be a path with length > 1");
		return false;
	}

	const prototype_exists = await graph_query<{ id: number }>(
		`
		MATCH (prototype:Model { name: $name })
		RETURN id(prototype) as id
	`,
		{
			name: prototype,
		},
	);

	if (!prototype_exists.length) {
		return false;
	}

	const result = await graph_query(
		`
		MATCH (instance) WHERE id(instance) = $target_id

		MATCH (prototype:Model { name: $name })
		MERGE (instance)-[:INSTANCE_OF]->(prototype)

		RETURN id(prototype) as id
	`,
		{
			name: prototype,
			target_id: mutable_path_end,
		},
	);

	return true;
}

export async function set_label(ant: Ant, new_label: string) {
	if (ant.label === new_label) {
		return ant;
	}

	const mutable_path_end = await get_mutable_path_end(ant);

	await graph_query<{ id: number }>(
		`
		MATCH (target) WHERE id(target) = $target_id WITH target
		SET target.label = $label
		RETURN id(target) as id
		`,
		{
			label: new_label,
			target_id: mutable_path_end,
		},
	);

	ant.label = new_label;

	return ant;
}

import { OpenAIEmbeddings } from "@langchain/openai";

export async function set_description(ant: Ant, new_description: string) {
	const mutable_path_end = await get_mutable_path_end(ant);

	// console.log("set_description", ant.path, new_description);

	const current_description = await description(ant);

	if (current_description === new_description) {
		// console.log("Description is the same", new_description, current_description, ant.path)

		return ant;
	}

	// console.log("\n", ant.path, current_description, new_description);

	// const llm = new OpenAIEmbeddings({
	// 	modelName: "text-embedding-3-large",
	// 	dimensions: 128,
	// });

	// const embeddings = await llm.embedQuery(new_description);

	// console.log("Updated description", new_description);

	if (description === null) {
		console.log("Description is null", new_description, ant.path);
	}

	const resp = await graph_query<{ id: number }>(
		`
		MATCH (target) WHERE id(target) = $target_id WITH target
		SET target.description = $description
		// SET target.vect = vecf32($embeddings)
		RETURN id(target) as id, target.description as description
		// , target.vect as embeddings
		`,
		{
			description: new_description,
			target_id: mutable_path_end,
			// embeddings: embeddings,
		},
	);

	// console.log(resp);

	return ant;
}

import { reference as get_reference } from "./queries";

export async function set_reference(ant: Ant, reference: string) {
	const mutable_path_end = await get_mutable_path_end(ant);

	if (reference.split(":").length > 1) {
		const referenced_model = await find_model(reference);

		if (!referenced_model) {
			throw new Error("Reference target must be a model, not a submodel");
		}

		const target = await get_reference(referenced_model);

		if (target) {
			reference = target.path;
		}
	}

	const clean_name = clean_submodel_name(reference);

	await graph_query<{ id: number }>(
		`
		MATCH (target) WHERE id(target) = $target_id WITH target
		MERGE (target)-[rel:REF]->(reference)
		DELETE rel
		RETURN id(reference) as id
		`,
		{
			reference: clean_name,
			target_id: mutable_path_end,
		},
	);

	await graph_query<{ id: number }>(
		`
		MATCH (target) WHERE id(target) = $target_id WITH target
		MATCH (reference:Model {name: $reference})
		MERGE (target)-[:REF]->(reference)
		RETURN id(reference) as id
		`,
		{
			reference: clean_name,
			target_id: mutable_path_end,
		},
	);

	return ant;
}

export async function remove_reference(ant: Ant) {
	const mutable_path_end = await get_mutable_path_end(ant);

	await graph_query<{ id: number }>(
		`
		MATCH (target) WHERE id(target) = $target_id WITH target
		MATCH (target)-[ref:REF]->(reference:Model)
		DELETE ref
		RETURN id(reference) as id
		`,
		{
			target_id: mutable_path_end,
		},
	);

	return ant;
}

export async function create_feature_prototype(ant: Ant, feature_name: string, kind: CATEGORY, abstraction_depth_target: number = 1) {
	const mutable_path_end = await get_mutable_path_end(ant);

	const clean_name = clean_submodel_name(feature_name);

	const resp = await graph_query<{
		id: number;
		feature_category: string;
		label: string;
		path: string;
	}>(
		`
		MATCH (target) WHERE id(target) = $target_id WITH target
		MERGE (feature_prototype:Model { name: $feature_name })
		MERGE (target)-[template:FEATURE_TEMPLATE]->(feature_prototype)
		ON CREATE SET feature_prototype.label = $feature_name, template.feature_category = $kind, template.abstraction_depth = $abstraction_depth_target
		RETURN id(feature_prototype) as id, template.feature_category as feature_category, feature_prototype.label as label, feature_prototype.name as path
		`,
		{
			feature_name: clean_name,
			target_id: mutable_path_end,
			kind,
			abstraction_depth_target,
		},
	);

	// console.log("created feature prototype", feature_name, "of category", kind, "on", ant.path, "with id", resp[0].id);

	// return ant;

	const new_nodes: Node[] = resp.map((n) => ({
		id: n.id,
		own_label: n.label,
		introspection: [],
		own_value: undefined,
	}));

	const feature = await Effect.runPromise(new Ant(new_nodes, resp[0].path).mutable());

	return feature;
}

export async function use_feature_prototype(ant: Ant, feature_prototype_name: string, name?: string) {
	const mutable_path_end = await get_mutable_path_end(ant);

	const feature_path = clean_feature_name(name);
	const result = await graph_query<{
		id: number;
		path: string;
		label: string;
	}>(
		`
			MATCH (target) WHERE id(target) = $target_id WITH target

			MATCH (template:Model {name: $template})

			MATCH (template)<-[rel:FEATURE_TEMPLATE]-()

			CREATE (target)-[f:FEATURE { feature_category: rel.feature_category, abstraction_depth: rel.abstraction_depth }]->(feature:Model)
			// SET feature.kind = template.kind

			MERGE (feature)-[:INSTANCE_OF]->(template)

			WITH feature

			SET feature.name = $feature_id
			SET feature.clean_name = $feature_id

			RETURN id(feature) as id, feature.name as path, feature.label as label
		`,
		{
			target_id: mutable_path_end,
			template: feature_prototype_name,
			feature_id: feature_path,
		},
	);

	// console.log("used feature", result);

	const new_nodes: Node[] = result.map((n) => ({
		id: n.id,
		own_label: n.label,
		introspection: [],
		own_value: undefined,
	}));

	if(!result.length) {
		throw new Error("Feature not found " + feature_prototype_name);
	}

	const feature = await Effect.runPromise(new Ant(new_nodes, result[0].path).mutable());

	return feature;
}

export async function use_existing_feature(ant: Ant, feature_path: string, kind: CATEGORY) {
	const mutable_path_end = await get_mutable_path_end(ant);

	const feature_model = await find_model(feature_path);

	// console.log("get feature path", feature_path, feature_model?.label);

	if (!feature_model) {
		throw new Error(`Feature ${feature_path} not found`);
	}

	const resp = await graph_query_on_nodes(
		`
			MATCH (target) WHERE id(target) = $target_id WITH target
			MATCH (feature) WHERE id(feature) = $node
			MERGE (target)-[f:FEATURE]->(feature)
			// SET feature.kind = $kind
			SET f.feature_category = $kind
			SET f.abstraction_depth = 0
			RETURN id(feature) as id
		`,
		feature_model.node_ids,
		{
			target_id: mutable_path_end,
			kind: kind,
		},
	);

	return ant;
}

export async function remove(ant: Ant) {
	if (!is_root(ant.path)) {
		throw new Error("Only a root model can be removed");
	}

	const mutable_path_end = await get_mutable_path_end(ant);

	await graph_query<{ id: number }>(
		`
		MATCH (target) WHERE id(target) = $target_id WITH target
		DETACH DELETE target
		RETURN id(target) as id
		`,
		{
			target_id: mutable_path_end,
		},
	);

	return true;
}

export async function provide_interface(ant: Ant, interface_name: string, abstraction_depth: number = 1) {
	const mutable_path_end = await get_mutable_path_end(ant);

	await graph_query<{ id: number }>(
		/* Cypher */ `
		MATCH (target) WHERE id(target) = $target_id WITH target
		MERGE (interface:Interface { name: $interface_name  })
		MERGE (target)-[rel:HAS_PROVIDED_INTERFACE]->(interface)
		SET rel.on = $model_path, rel.abstraction_depth = $abstraction_depth
		RETURN id(target) as id
		`,
		{
			target_id: mutable_path_end,
			interface_name,
			model_path: ant.path,
			abstraction_depth,
		},
	);

	return ant;
}

export async function set_value(_ant: Ant, value: string | number | boolean | string[] | number[] | boolean[] | undefined, value_type: "string" | "boolean" | "number" | "string_array" | "number_array" | "boolean_array") {
	// console.log("SET VALUE", _ant.path, value, value_type);

	if (value === undefined) return _ant;

	if (value === _ant.value) {
		// console.log("Value is the same", value, _ant.value, _ant.path);
		return _ant;
	}

	if (value_type === "number" && isNaN(value as number)) {
		return _ant;
	}

	try {
		const mutable_path_end = await get_mutable_path_end(_ant);

		const query = `
			MATCH (root) WHERE id(root) = $target_id
			SET root.value = $value, root.value_type = $value_type
			SET root:Value

			RETURN id(root) as id, root.value as value, root.value_type as value_type
		`;

		const r = await graph_query(query, {
			target_id: mutable_path_end,
			value,
			value_type,
		});

		// console.log("SET VALUE", r);

		if (value_type === "string") {
			_ant.cached_string_value = value as string;
		}

		if (value_type === "number") {
			_ant.cached_number_value = value as number;
		}

		if (value_type === "boolean") {
			_ant.cached_boolean_value = value as boolean;
		}

		if (value_type === "string_array") {
			_ant.cached_string_array_value = value as string[];
		}

		if (value_type === "number_array") {
			_ant.cached_number_array_value = value as number[];
		}

		if (value_type === "boolean_array") {
			_ant.cached_boolean_array_value = value as boolean[];
		}

		return _ant;
	} catch (error) {
		console.error(error);
		throw error;
	}
}

export async function set_string_value(ant: Ant, value: string) {
	return set_value(ant, value, "string");
}

export async function set_number_value(ant: Ant, value: number) {
	return set_value(ant, value, "number");
}

export async function set_boolean_value(ant: Ant, value: boolean) {
	return set_value(ant, value, "boolean");
}

export async function set_string_array_value(ant: Ant, value: string[]) {
	return set_value(ant, value, "string_array");
}

export async function set_number_array_value(ant: Ant, value: number[]) {
	return set_value(ant, value, "number_array");
}

export async function set_boolean_array_value(ant: Ant, value: boolean[]) {
	return set_value(ant, value, "boolean_array");
}

export async function unlink_value(ant: Ant) {
	const mutable_path_end = await get_mutable_path_end(ant);

	await graph_query(
		`
			MATCH (root) WHERE id(root) = $target_id
			// MATCH (root)-[rel:HAS_VALUE]->(value)
			// DELETE rel

			UNSET root.value
			UNSET root.value_type

			RETURN id(root) as id
		`,
		{
			target_id: mutable_path_end,
		},
	);

	return ant;
}

export async function add_interface_constraint(ant: Ant, interface_name: string) {
	const mutable_path_end = await get_mutable_path_end(ant);

	await graph_query(
		`
			MATCH (root) WHERE id(root) = $target_id
			MATCH (interface:Interface { name: $interface_name })
			MERGE (root)-[:SHOULD_IMPLEMENT_INTERFACE]->(interface)
			RETURN id(interface) as id
		`,
		{
			target_id: mutable_path_end,
			interface_name,
		},
	);

	return ant;
}

export async function remove_interface_constraint(ant: Ant, interface_name: string) {
	const mutable_path_end = await get_mutable_path_end(ant);

	await graph_query(
		`
			MATCH (root) WHERE id(root) = $target_id
			MATCH (root)-[rel:SHOULD_IMPLEMENT_INTERFACE]->(interface:Interface { name: $interface_name })
			DELETE rel
			RETURN id(interface) as id
		`,
		{
			target_id: mutable_path_end,
			interface_name,
		},
	);

	return ant;
}

export async function add_prototype_constraint(ant: Ant, prototype_path: string) {
	const mutable_path_end = await get_mutable_path_end(ant);

	const prototype = await Ant.object_from_path(prototype_path);

	if (!prototype) {
		// throw new Error(`Prototype ${prototype_path} not found`);
		return false;
	}

	await graph_query_on_nodes(
		`
			MATCH (root) WHERE id(root) = $target_id
			MATCH (prototype) WHERE id(prototype) = $node
			MERGE (root)-[:SHOULD_INSTANTIATE]->(prototype)
			RETURN id(prototype) as id
		`,
		prototype.node_ids,
		{
			target_id: mutable_path_end,
			// nodes: prototype.node_ids,
		},
	);

	return ant;
}

export async function remove_prototype_constraint(ant: Ant, prototype_path: string) {
	const mutable_path_end = await get_mutable_path_end(ant);

	const prototype = await Ant.object_from_path(prototype_path);

	if (!prototype) {
		throw new Error(`Prototype ${prototype_path} not found`);
	}

	await graph_query_on_nodes(
		`
			MATCH (root) WHERE id(root) = $target_id
			MATCH (root)-[rel:SHOULD_INSTANTIATE]->(prototype) WHERE id(prototype) = $node
			DELETE rel
			RETURN id(prototype) as id
		`,
		prototype.node_ids,
		{
			target_id: mutable_path_end,
		},
	);

	return ant;
}

export async function add_superclass_constraint(ant: Ant, superclass_path: string) {
	const mutable_path_end = await get_mutable_path_end(ant);

	const superclass = await Ant.object_from_path(superclass_path);

	if (!superclass) {
		throw new Error(`Superclass ${superclass_path} not found`);
	}

	await graph_query_on_nodes(
		`
			MATCH (root) WHERE id(root) = $target_id
			MATCH (superclass) WHERE id(superclass) = $node
			MERGE (root)-[:SHOULD_EXTEND]->(superclass)
			RETURN id(superclass) as id
		`,
		superclass.node_ids,
		{
			target_id: mutable_path_end,
			// nodes: superclass.node_ids,
		},
	);

	return ant;
}

export async function remove_superclass_constraint(ant: Ant, superclass_path: string) {
	const mutable_path_end = await get_mutable_path_end(ant);

	const superclass = await Ant.object_from_path(superclass_path);

	if (!superclass) {
		throw new Error(`Superclass ${superclass_path} not found`);
	}

	await graph_query_on_nodes(
		`
			MATCH (root) WHERE id(root) = $target_id
			MATCH (root)-[rel:SHOULD_EXTEND]->(superclass) WHERE id(superclass) = $node
			DELETE rel
			RETURN id(superclass) as id
		`,
		superclass.node_ids,
		{
			target_id: mutable_path_end,
		},
	);

	return ant;
}

export async function create_state_machine(ant: Ant, name: string, entry_state: string) {
	// create a new model, that is an instance of "state"
}

export async function __delete_everything() {
	const r = await graph_query(
		`
			MATCH (n)
			DETACH DELETE n
		`,
		{},
	);

	console.log(r);

	try {
		// await graph_query(`DROP VECTOR INDEX FOR (p:Model) ON (p.vect)`, {});

		await graph_query(`CREATE INDEX FOR (n:Model) ON (n.name)`, {});
		await graph_query(`CREATE VECTOR INDEX FOR (p:Model) ON (p.vect) OPTIONS { dimension: 128, similarityFunction: 'euclidean' }`, {});
	} catch (error) {
		// console.error(error);
	}

	console.warn("Everything deleted, goodbye");

	process.exit(0);
}

// await graph_query(`DROP VECTOR INDEX FOR (p:Model) ON (p.vect)`, {}).then(console.log)
// await graph_query(`CREATE VECTOR INDEX FOR (p:Model) ON (p.vect) OPTIONS { dimension: 128, similarityFunction: 'euclidean' }`, {});
