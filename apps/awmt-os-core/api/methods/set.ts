import { Effect } from "effect";
import { mutations, queries } from ".";
import CATEGORY from "../../native/feature_categories";
import { Ant, SetAnt } from "../Ant";
import { graph_query, graph_query_on_nodes } from "../graph";
import { get_mutable_path_end } from "./utils";
import { get_value_object } from "./queries";

export const size = async (set: SetAnt) => {
	const elements = await graph_query_on_nodes<{ size: number }>(
		`
			MATCH (root) WHERE id(root) = $node
			MATCH (root)-[:CONTAINS]->(element: Model)

			RETURN COUNT(element) AS size
		`,
		set.node_ids,
	);

	return elements[0].size;
};

// export const push_path = async (path: string) => {};

// export const push_element = async (element: Ant) => {};

export const create_element = async (set: SetAnt) => {
	const templates = await queries.features(set, CATEGORY.SET_TEMPLATE);
	if (templates.length === 0) {
		console.trace();
		throw new Error("No template set for queue " + set.path);
	}

	console.log("create set element", set.path);

	const template = templates[0].model;

	const element = await mutations.create_model();

	const mutable = await Effect.runPromise(await element.mutable());

	await Effect.runPromise(await mutable.set_class(template.path));

	const mutable_path_end = await get_mutable_path_end(set);

	const element_mutable_path_end = await get_mutable_path_end(element);

	await graph_query<{ id: number }>(
		`
			MATCH (target) WHERE id(target) = $target_id WITH target
			MATCH (element) WHERE id(element) = $element_id
			MERGE (target)-[:CONTAINS]->(element)
			RETURN id(element) as id
		`,
		{
			element_id: element_mutable_path_end,
			target_id: mutable_path_end,
		},
	);

	console.log("created set element", element.path);

	return element;
};

export const push_element = async (set: SetAnt, element: Ant) => {
	const mutable_path_end = await get_mutable_path_end(set);

	const element_mutable_path_end = await get_mutable_path_end(element);

	// console.log("pushing element", element_mutable_path_end, mutable_path_end);

	const resp = await graph_query<{ id: number }>(
		`
			MATCH (target) WHERE id(target) = $target_id WITH target
			MATCH (element) WHERE id(element) = $element_id
			MERGE (target)-[:CONTAINS]->(element)
			RETURN id(element) as id
		`,
		{
			element_id: element_mutable_path_end,
			target_id: mutable_path_end,
		},
	);

	// console.log(resp);
	return element;
};

export const get_n = async (set: SetAnt, n: number) => {
	const _elements = await graph_query_on_nodes<{
		path: string;
		id: number;
		label: string;
		value_type: string;
		value: string;
	}>(
		`
            MATCH (root) WHERE id(root) = $node
            MATCH (root)-[:CONTAINS]->(elements: Model)

            UNWIND elements AS element

			WITH DISTINCT element.name as path, element

			RETURN 
				element.name as path,
				id(element) as id,
				element.label as label,
				element.value_type as value_type,
				element.value as value

            ORDER BY element.id
            LIMIT $n
        `,
		set.node_ids,
		{ n: n || 20 },
	);

	// merge elements, group by path, merge the other properties

	let elements: any[] = [];

	for (let _element of _elements) {
		let element = elements.find((e) => e.path === _element.path);

		if (!element) {
			element = _element;
			elements.push(element);
		}
	}

	return elements.map(
		(element) =>
			new Ant(
				[
					{
						id: element.id,
						own_label: element.label,
						introspection: [],
						own_value: get_value_object(element.value_type, element.value),
					},
				],
				element.path,
			),
	);
};
