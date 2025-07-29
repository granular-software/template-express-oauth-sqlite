import { Effect } from "effect";
import CATEGORY from "../../native/feature_categories";
import { Ant, QueueAnt } from "../Ant";
import { graph_query, graph_query_on_nodes } from "../graph";
import { queries, mutations } from ".";
import { get_mutable_path_end } from "./utils";
import { get_value_object } from "./queries";

export const size = async (queue: QueueAnt) => {
	const elements = await graph_query_on_nodes<{ size: number }>(
		`
			MATCH (root) WHERE id(root) = $node
			MATCH (root)-[:CONTAINS]->(element: Model)

			RETURN COUNT(element) AS size
		`,
		queue.node_ids,
	);

	return elements[0].size;
};

export const push_path = async (path: string) => {};

export const push_element = async (element: Ant) => {};

export const create_element = async (queue: QueueAnt) => {
	const templates = await queries.features(queue, CATEGORY.SET_TEMPLATE);
	if (templates.length === 0) {
		console.trace();
		throw new Error("No template set for queue " + queue.path);
	}

	const template = templates[0];

	const element = await mutations.create_model();

	const mutable = await Effect.runPromise(await element.mutable());

	await Effect.runPromise(await mutable.set_class(template.model.path));

	const mutable_path_end = await get_mutable_path_end(queue);

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

	return element;
};

export const peek_n = async (queue: QueueAnt, n: number) => {
	const elements = await graph_query_on_nodes<{
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

            RETURN 
                element.name as path,
                id(element) as id,
                element.label as label,
				element.value_type as value_type,
				element.value as value

            ORDER BY element.id
            LIMIT $n
        `,
		queue.node_ids,
		{ n: n || 1 },
	);
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

export const contains = async (queue: QueueAnt, path: string) => {
	const elements = await graph_query_on_nodes<{ path: string }>(
		`
			MATCH (root) WHERE id(root) = $node
			MATCH (root)-[:CONTAINS]->(element: Model)

			WHERE element.name = $path

			RETURN element.name as path
		`,
		queue.node_ids,
		{ path: path },
	);

	return elements.length > 0;
};

export const find_queue_from_task = async (task: Ant) => {
	const q = `
	MATCH (task) WHERE id(task) = $node
	MATCH (task)<-[:CONTAINS]-(queue: Model)
	RETURN id(queue) as id, queue.name as path, queue.label as label, queue.value_type as value_type, queue.value as value
`;

	const queues = await graph_query_on_nodes<{
		id: number;
		path: string;
		label: string;
		value_type: string;
		value: string;
	}>(q, task.node_ids);

	if (queues.length === 0) {
		throw new Error("Task " + task.path + " has no queue");
	}

	const queue = queues[0];

	return new QueueAnt(
		[
			{
				id: queue.id,
				own_label: queue.label,
				introspection: [],
				own_value: get_value_object(queue.value_type, queue.value),
			},
		],
		queue.path,
	);
};
