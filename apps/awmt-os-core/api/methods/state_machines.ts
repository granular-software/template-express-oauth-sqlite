import { asUnit } from "effect/Exit";
import { Ant, GraphNode } from "../Ant";
import { graph_query, graph_query_on_nodes } from "../graph";
import { find_siblings, get_value_object } from "./queries";
import { queries } from ".";
import { Effect } from "effect";

export async function prototypes() {
	const resp = await graph_query<{
		id: number;
		label: string;
		path: string;
		name: string;
		value_type: string;
		value: string | number | boolean;
	}>(`
		MATCH (model:Model) WHERE NOT (model)-[:INSTANCE_OF]->() AND NOT (model)<-[:FEATURE_TEMPLATE]-()	

		RETURN
			model.label as label,
			model.name as path,
			id(model) as id,
			model.value_type as value_type,
			model.value as value
	`);

	return resp
		.filter((m) => m.path.split(":").length === 1 && m.label)
		.map(
			(model) =>
				new Ant(
					[
						{
							id: model.id,
							introspection: [],
							own_label: model.label,
							own_value: get_value_object(model.value_type, model.value),
						},
					],
					model.path,
				),
		);
}

export async function count_active_objects(ant: Ant) {
	const _name = await Effect.runPromise(ant.at("name"));

	if (!_name) {
		throw "Name not found (state State)";
	}

	const name = await Effect.runPromise(_name.string_value());

	const query = `
		MATCH (state_machine_instance)-[:INSTANCE_OF]->(state_machine:Model) WHERE state_machine.name = $state_machine

        MATCH (state_machine_instance)-[:WHERE_THE]->(current_submodel)-[:REF]->()-[:INSTANCE_OF]->(leaf)-[:INSTANCE_OF]->(state) WHERE current_submodel.name = 'current' AND state.name = 'state'

		RETURN count(state) as count
	`;

	const resp = await graph_query<{
		count: number;
	}>(query, {
		state_machine: name,
	});

	console.log("COUNT ACTIVE OBJECTS", ant.path, resp);

	if (resp.length === 0) {
		return 0;
	}

	return resp[0].count;
}

export async function count_finalized_objects(ant: Ant) {
	const _name = await Effect.runPromise(ant.at("name"));

	if (!_name) {
		throw "Name not found (state State)";
	}

	const name = await Effect.runPromise(_name.string_value());

	const query = `
		MATCH (state_machine_instance)-[:INSTANCE_OF]->(state_machine:Model) WHERE state_machine.name = $state_machine

        MATCH (state_machine_instance)-[:WHERE_THE]->(current_submodel)-[:REF]->()-[:INSTANCE_OF]->(leaf)-[:INSTANCE_OF]->(state) WHERE current_submodel.name = 'current' AND state.name = 'finale_state'

		RETURN count(state) as count
	`;

	const resp = await graph_query<{
		count: number;
	}>(query, {
		state_machine: name,
	});

	if (resp.length === 0) {
		return 0;
	}

	console.log("COUNT FINALIZED OBJECTS", ant.path, resp);

	return resp[0].count;
}

export async function get_state_instances(ant: Ant) {
	const _name = await Effect.runPromise(ant.at("name"));

	if (!_name) {
		throw "Name not found (state State)";
	}

	const name = await Effect.runPromise(_name.string_value());

	const _machine = await Effect.runPromise(ant.at("machine"));

	if (!_machine) {
		throw "State machine not found";
	}

	const machine = await Effect.runPromise(_machine.reference());

	if (!machine) {
		throw "State machine reference not found";
	}

	// console.log("Trying to get instances in state : " + ant.path, name);

	// console.log("Machine", machine.path);

	const query = `
        MATCH (state_machine_instance)-[:INSTANCE_OF]->(state_machine:Model) WHERE state_machine.name = $state_machine

        MATCH (state_machine_instance)-[:WHERE_THE]->(current_submodel)-[:REF]->()-[:INSTANCE_OF]->(leaf)-[:WHERE_THE]->(name_submodel) WHERE current_submodel.name = 'current' AND name_submodel.name = 'name' AND name_submodel.value = $state_name

        MATCH (resp)-[:WHERE_THE|EXTENDS*0..]->(virtual)-[rel:FEATURE]->()-[:EXTENDS*0..]->(state_machine_instance)

        RETURN
            resp.name as path,
            resp.label as label,
            collect(id(resp)) as ids,
            resp.label as root,
			resp.name as root_path,
			resp.value_type as value_type,
			resp.value as value,
			[] as introspection,
             leaf.name as leaf_name

    `;

	const resp = await graph_query<{
		path: string;
		label: string;
		ids: number[];
		root: string;
		root_path: string;
		value_type: string;
		value: string | number | boolean;
		introspection: string[];
		leaf_name: string;
	}>(query, {
		state_machine: machine.path,
		state_name: name,
	});

	const features = resp.map((r) => {
		return new Ant(
			[
				{
					id: r.ids[0],
					introspection: [],
					own_label: r.label,
					own_value: get_value_object(r.value_type, r.value),
				},
			],
			r.path,
		);
	});
	return features;
}

export async function count_state_instances(ant: Ant) {
	const _name = await Effect.runPromise(ant.at("name"));

	if (!_name) {
		throw "Name not found (state State)";
	}

	const name = await Effect.runPromise(_name.string_value());

	const _machine = await Effect.runPromise(ant.at("machine"));

	if (!_machine) {
		throw "State machine not found";
	}

	const machine = await Effect.runPromise(_machine.reference());

	if (!machine) {
		throw "State machine reference not found";
	}

	// console.log("Trying to get instances in state : " + ant.path, name);

	// console.log("Machine", machine.path);

	const query = `
        MATCH (state_machine_instance)-[:INSTANCE_OF]->(state_machine:Model) WHERE state_machine.name = $state_machine

        MATCH (state_machine_instance)-[:WHERE_THE]->(current_submodel)-[:REF]->()-[:INSTANCE_OF]->(leaf)-[:WHERE_THE]->(name_submodel) WHERE current_submodel.name = 'current' AND name_submodel.name = 'name' AND name_submodel.value = $state_name

        MATCH (resp)-[:WHERE_THE|EXTENDS*0..]->(virtual)-[rel:FEATURE]->()-[:EXTENDS*0..]->(state_machine_instance)

        RETURN count(resp) as count	

    `;

	const resp = await graph_query<{
		count: number;
	}>(query, {
		state_machine: machine.path,
		state_name: name,
	});

	if (resp.length === 0) {
		return 0;
	}

	return resp[0].count;
}

export async function set_transition_shortcut(start_path: string, end_path: string, name: string) {
	const query = `
        MATCH (start:Model) WHERE start.name = $start_path
        MATCH (end:Model) WHERE end.name = $end_path

        MERGE (start)-[tr:TRANSITION]->(end) ON CREATE SET tr.name = $name, tr.weight = 1

        RETURN tr
    `;

	const resp = await graph_query<{ tr: GraphNode }>(query, {
		start_path: start_path,
		end_path: end_path,
		name: name,
	});

	console.log("CREATED TRANSITION SHORTCUT BETWEEN", start_path, end_path, name, resp);

	return resp;
}

export async function outcomes(start_state: string) {
	const query = `
		MATCH (start:Model) WHERE start.name = $start_state

		MATCH path = (start)-[:INSTANCE_OF|REF|TRANSITION*0..]->(resp:Model)-[:INSTANCE_OF]->(finale_state:Model) WHERE finale_state.name = 'finale_state'

		// RETURN outcome.name as outcome

		RETURN
            resp.name as path,
            resp.label as label,
            collect(id(resp)) as ids,
            resp.label as root,
			resp.name as root_path,
			resp.value_type as value_type,
			resp.value as value,
			[] as introspection
	
	`;

	const resp = await graph_query<{
		path: string;
		label: string;
		ids: number[];
		root: string;
		root_path: string;
		value_type: string;
		value: string | number | boolean;
		introspection: string[];
	}>(query, {
		start_state: start_state,
	});

	return resp.map((r) => {
		return new Ant(
			[
				{
					id: r.ids[0],
					introspection: [],
					own_label: r.label,
					own_value: get_value_object(r.value_type, r.value),
				},
			],
			r.path,
		);
	});
}

export async function has_path_between_states(start_state: string, end_state: string) {
	const query = `
		MATCH (start:Model) WHERE start.name = $start_state
		MATCH (end:Model) WHERE end.name = $end_state

		MATCH path = (start)-[:INSTANCE_OF|REF|TRANSITION*0..]->(end)

		RETURN path
	`;

	const resp = await graph_query<{ path: GraphNode[] }>(query, {
		start_state: start_state,
		end_state: end_state,
	});

	console.log(
		{
			start_state: start_state,
			end_state: end_state,
		},
		resp,
	);

	return resp.length > 0;
}

export async function get_transitions_to_path(current_state: Ant, target: string) {
	// const query = `
	// 	MATCH (machine_snapshot) WHERE id(machine_snapshot) = $node
	// 	WITH machine_snapshot

	// 	MATCH (machine_snapshot)-[:WHERE_THE]->(curr) WHERE curr.name = 'current'

	// 	MATCH (curr)-[:REF]->(state_snap)-[:INSTANCE_OF]->(current_state:Model)-[:INSTANCE_OF]->(st) WHERE st.name = 'state' OR st.name = 'finale_state'

	// 	MATCH (target:Model {name: $target_state_path})

	// 	WITH current_state as current, target

	// 	CALL algo.SPpaths( {sourceNode: current, targetNode: target, relTypes: ['TRANSITION'], pathCount: 0, weightProp: 'dist'} ) YIELD path, pathWeight

	// 	WITH nodes(path) as states

	// 	UNWIND states as transitions

	// 	RETURN id(transitions) as id,
	// 		transitions.name as last_node_label,
	// 		transitions.name as path,
	// 		transitions.value_type as value_type,
	// 		transitions.value as value,
	// 		[] as introspection
	// `;

	const query = `
		MATCH (current_state) WHERE id(current_state) = $node
		WITH current_state
	
		// MATCH (machine_snapshot)-[:WHERE_THE]->(curr) WHERE curr.name = 'current'

		// MATCH (curr)-[:REF]->(state_snap)-[:INSTANCE_OF]->(current_state:Model)-[:INSTANCE_OF]->(st) WHERE st.name = 'state' OR st.name = 'finale_state'

		MATCH (target:Model {name: $target_state_path}) 

		WITH current_state as current, target

		CALL algo.SPpaths( {sourceNode: current, targetNode: target, relTypes: ['TRANSITION'], pathCount: 0, weightProp: 'dist'} ) YIELD path, pathWeight 
		
		WITH nodes(path) as states 

		UNWIND states as transitions
		

		RETURN id(transitions) as id,
			transitions.name as last_node_label,
			transitions.name as path,
			transitions.value_type as value_type,
			transitions.value as value,
			[] as introspection
	`;

	const resp = await graph_query_on_nodes<{
		id: number;
		last_node_label: string;
		path: string;
		value_type: string;
		value: string | number | boolean;
		introspection: string[];
	}>(query, current_state.node_ids, {
		target_state_path: target,
	});

	console.log(
		{
			node_ids: current_state.node_ids,
		},
		{
			target_state_path: target,
		},
	);

	console.log(resp);

	return resp.map((r) => {
		return new Ant(
			[
				{
					id: r.id,
					introspection: [],
					own_label: r.last_node_label,
					own_value: get_value_object(r.value_type, r.value),
				},
			],
			r.path,
		);
	});
}
