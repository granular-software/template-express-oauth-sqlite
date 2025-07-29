import { OpenAIEmbeddings } from "@langchain/openai";
import CATEGORY from "../../native/feature_categories";
import * as path_utils from "../../utils/path";
import { Ant, GraphNode as Node, Value, definition_node_id } from "../Ant";
import { InstanceSortInput, InstanceWhereInput } from "../filter";
import { graph_query, graph_query_on_nodes } from "../graph";
import { get_filter_rows, get_sort_rows } from "./filter";
import { StringFilter, NumberFilter, BooleanFilter, DateFilter, ReferenceFilter } from "..";

const cache = new Map<string, { date: Date; ant: Ant }>();

export const find_siblings = async (node: number): Promise<(Node & { path: string })[]> => {
	const start = new Date().getTime();
	const query = /* Cypher */ `
		MATCH (node) WHERE id(node) = $node
		WITH node
		MATCH path = (node)<-[:WHERE_THE*0..]-(root) WHERE root:Model

		WITH root, 
			 reduce(p = root.name, n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as absolute_path, 
			 [n IN relationships(path) WHERE type(n) = 'WHERE_THE'] as clean_path,
			 size([n IN relationships(path) WHERE type(n) = 'WHERE_THE']) as path_length

		MATCH siblings_path = (root)-[:WHERE_THE|EXTENDS|INSTANCE_OF|REF*0..]->(sibling) 
		
		WHERE size([n IN relationships(siblings_path) WHERE type(n) = 'WHERE_THE']) = path_length
		AND clean_path = [n IN relationships(siblings_path) WHERE type(n) = 'WHERE_THE']

		// AND reduce(p = root.name, n in relationships(siblings_path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) = absolute_path

		RETURN DISTINCT
			reduce(p = root.name, n in relationships(siblings_path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as path,
			sibling.label as label,
			id(sibling) as id,
			sibling.value_type as value_type,
			sibling.value as value,
			REDUCE(s = [], r IN RELATIONSHIPS(siblings_path) | s + TYPE(r)) as introspection
	`;

	const resp = await graph_query<{
		// absolute_path: string;
		id: number;
		label: string;
		path: string;
		value_type: string;
		value: string | number | boolean;
		introspection: string[];
	}>(query, {
		node,
	});
	// console.log("find_siblings", node, "in", new Date().getTime() - start, "ms", query);

	return resp.map((elt) => ({
		path: elt.path,
		id: elt.id,
		own_label: elt.label,
		introspection: elt.introspection,
		own_value: get_value_object(elt.value_type, elt.value),
	}));
};

export const group_siblings = async (nodes: number[]) => {
	const start = new Date().getTime();

	// console.log("GROUPING SIBLINGS", nodes);

	const _siblings = await Promise.all(nodes.map(find_siblings));

	// console.log(
	// 	"FOUND SIBLINGS",
	// 	_siblings.map((elt) => elt.map((e) => e.path)),
	// );

	const allSiblings = _siblings.flat();

	// Group by path first, then deduplicate within each path group
	const pathGroups = new Map<string, (Node & { path: string })[]>();

	for (const sibling of allSiblings) {
		if (!pathGroups.has(sibling.path)) {
			pathGroups.set(sibling.path, []);
		}
		
		const group = pathGroups.get(sibling.path)!;
		// Only add if this ID isn't already in this path group
		if (!group.find(existing => existing.id === sibling.id)) {
			group.push(sibling);
		}
	}

	// console.log(
	// 	"GROUPED BY PATH",
	// 	Array.from(pathGroups.entries()).map(([path, nodes]) => ({ path, count: nodes.length })),
	// );

	// console.log("found group_siblings", nodes, "in", new Date().getTime() - start, "ms");

	const ants: Ant[] = [];

	for (const [path, siblings] of pathGroups) {
		// console.log("CREATING ANT FOR PATH", path, "WITH", siblings.length, "NODES");
		ants.push(new Ant(siblings, path));
	}

	// console.log("finished group_siblings", nodes, "in", new Date().getTime() - start, "ms");

	return ants;
};

export async function find_model(path: string): Promise<Ant | null> {
	if (!path) {
		// console.error("Path is undefined " + path);
		// console.trace();
		return null;
		// throw new Error("Model path is undefined");
	}

	let start = new Date().getTime();

	const path_parts = path.split(":");
	let query = "";
	const array_path = path_parts;

	const path_origin = array_path[0];
	const path_tail = array_path.slice(1);

	if (path_utils.is_root(path)) {
		const root_query = `
			MATCH (m:Model {name: $path})
			RETURN 
				m.label as last_node_label, 	
				id(m) as id, 
				m.name as absolute_path, 
				m.value_type as value_type, 
				m.value as value
		`;

		const result = await graph_query<{
			id: number;
			last_node_label: string;
			absolute_path: string;
			value_type: string;
			value: string | number | boolean;
		}>(root_query, {
			path: path,
		});

		if (result.length === 0) {
			// return null;
			// console.trace();
			// throw new Error(`Model ${path} not found (methods.ts#find_model)`);

			return null;
		}

		let value = undefined;

		const ant = new Ant(
			result.map((elt) => ({
				id: elt.id,
				introspection: [],
				own_label: elt.last_node_label,
				own_value: get_value_object(elt.value_type, elt.value),
			})),
			path,
		);

		// cache.set(path, {
		// 	date: new Date(),
		// 	ant,
		// });

		return ant;
	}

	let last_node = path_origin;

	// console.log("Finding model", path);

	query += `MERGE (path_origin:Model {name: '${path_origin}'})\nWITH path_origin as ${last_node}\n`;

	query += `MATCH path = (${last_node})\n`;

	let i = 0;
	for (let elt of path_tail) {
		query += `  -[:EXTENDS|INSTANCE_OF|REF*0..]->()-[:WHERE_THE]->(elt_${i} {name: '${elt}'})\n`;
		last_node = `elt_${i}`;
		i++;
	}

	query += `RETURN DISTINCT
                ${last_node}.label as last_node_label,
                id(${last_node}) as id,
                reduce(p = ${path_origin}.name, n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as absolute_path,
				${last_node}.value_type as value_type,
				${last_node}.value as value
            `;

	const result = await graph_query<{
		id: number;
		last_node_label: string;
		absolute_path: string;
		value_type: string;
		value: string | number | boolean;
	}>(query);

	if (result.length === 0) {
		console.trace();
		console.error(`Model ${path} not found (methods.ts#find_model2)`);
		// throw new Error(`Model ${path} (methods.ts#find_model)`);

		return null;
	}

	const ant = new Ant(
		result.map((elt) => ({
			id: elt.id,
			introspection: [],
			own_label: elt.last_node_label,
			own_value: get_value_object(elt.value_type, elt.value),
		})),
		path,
	);

	cache.set(path, {
		date: new Date(),
		ant,
	});

	return ant;
}

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

const euclidian_distance = (a: number[], b: number[]) => {
	return Math.sqrt(a.reduce((acc, elt, index) => acc + Math.pow(elt - b[index], 2), 0));
};

export async function search_paths(query1: string, query2: string) {
	const llm = new OpenAIEmbeddings({
		modelName: "text-embedding-3-large",
		dimensions: 128,
	});

	const embeddings1 = await llm.embedQuery(query1);
	const embeddings2 = await llm.embedQuery(query2);

	const search = `
	CALL db.idx.vector.queryNodes('Model', 'vect', 20, vecf32($embeddings_1)) YIELD node as start
	CALL db.idx.vector.queryNodes('Model', 'vect', 20, vecf32($embeddings_2)) YIELD node as end

	MATCH p = allShortestPaths((start)-[*]->(end))

	RETURN
		nodes(p) as nodes,
		relationships(p) as relationships

`;

	const resp = await graph_query<{
		nodes: {
			properties: {
				name: string;
				description: string;
			};
		}[];
		relationships: {
			relationshipType: string;
		}[];
	}>(search, {
		embeddings_1: embeddings1,
		embeddings_2: embeddings2,
	});

	// console.log(
	// 	"Search",
	// 	resp.map((r) => ({
	// 		nodes: r.nodes.map((n) => n.properties.name),
	// 		relationships: r.relationships.map((r) => r.relationshipType),
	// 	})),
	// );

	return {};
}

async function compare_str(query1: string, query2: string) {
	const llm = new OpenAIEmbeddings({
		modelName: "text-embedding-3-small",
		dimensions: 128,
	});

	const embeddings1 = await llm.embedQuery(query1);
	const embeddings2 = await llm.embedQuery(query2);

	const eucl = euclidian_distance(embeddings1, embeddings2);

	// console.log({ query1, query2, eucl });
}

async function compare(str1: string, str2: string) {
	const start = new Date().getTime();
	async function query(data: any) {
		const response = await fetch("https://api-inference.huggingface.co/models/BAAI/bge-base-en-v1.5", {
			headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN || ""}` },
			method: "POST",
			body: JSON.stringify(data),
		});
		const result = await response.json();
		return result;
	}

	query({ inputs: [str1, str2] }).then((response) => {
		const res1 = response[0];
		const res2 = response[1];

		const duration = new Date().getTime() - start;

		const eucl = euclidian_distance(res1, res2);
		console.log("Query", duration, "ms");

		console.log({ str1, str2, eucl });
	});

	return true;
}

// query({
// 	inputs: {
// 		source_sentence: "That is a happy person",
// 		sentences: ["That is a happy dog", "That is a very happy person", "Today is a sunny day"],
// 	},
// }).then((response) => {
// 	console.log(JSON.stringify(response));
// });

export async function search_models(query: string) {
	const llm = new OpenAIEmbeddings({
		modelName: "text-embedding-3-large",
		dimensions: 128,
	});

	const embeddings = await llm.embedQuery(query);

	const search = `
		CALL db.idx.vector.queryNodes('Model', 'vect', 20, vecf32($embeddings)) YIELD node, score

		RETURN
			node.label as label,
			node.name as path,
			id(node) as id,
			node.value_type as value_type,
			node.value as value,
			score

`;

	const resp = await graph_query<{
		id: number;
		label: string;
		path: string;
		value_type: string;
		value: string | number | boolean;
		score: number;
	}>(search, {
		embeddings,
	});

	let response: {
		path: string;
		label: string;
		nodes: Node[];
		score: number;
	}[] = [];

	console.log("search_models", query, resp);

	for (const elt of resp) {
		const existing = response.find((r) => r.path === elt.path);

		if (existing) {
			existing.nodes.push({
				id: elt.id,
				introspection: [],
				own_label: elt.label,
				own_value: get_value_object(elt.value_type, elt.value),
			} as Node);
		} else {
			response.push({
				path: elt.path,
				label: elt.label,
				score: elt.score,
				nodes: [
					{
						id: elt.id,
						introspection: [],
						own_label: elt.label,
						own_value: get_value_object(elt.value_type, elt.value),
					} as Node,
				],
			});
		}
	}

	return response.map((model) => ({
		model: new Ant(model.nodes, model.path),
		score: model.score,
		// euclidian: eucl,
		// cosine: cosine,
	}));
}

export async function search_submodels(ant: Ant, query: string) {
	console.log("1Searching for ", query + " in ", ant.path);
	const llm = new OpenAIEmbeddings({
		modelName: "text-embedding-3-large",
		dimensions: 128,
	});

	const embeddings = await llm.embedQuery(query);

	console.log("2Searching for ", query + " in ", ant.path);

	const search = `
		MATCH (root) WHERE id(root) = $node WITH root

		MATCH sibl1 = (root)-[:INSTANCE_OF|EXTENDS|REF*0..]->(sbl)
		MATCH sibl2 = (sbl)-[ref:WHERE_THE]->(sbl2)
		MATCH sibl3 = (sbl2)-[:REF*0..]->(last_node2)

		WITH RELATIONSHIPS(sibl1) + RELATIONSHIPS(sibl2) + RELATIONSHIPS(sibl3) as path, last_node2 as last_node, vec.euclideanDistance(last_node2.vect, vecf32($embeddings)) as eucl
		
		RETURN
            DISTINCT reduce(p = '', n in path | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as relative_path,
            last_node.label as last_node_label,
            collect(id(last_node)) as ids,
			REDUCE(s = [], r IN path | s + TYPE(r)) as introspection,
			last_node.value_type as value_type,
			last_node.value as value,
			eucl as euclidian

		ORDER BY euclidian ASC LIMIT 5
    `;

	const resp = await graph_query_on_nodes<{
		ids: number[];
		last_node_label: string;
		relative_path: string;
		introspection: string[];
		value_type: string;
		value: string | number | boolean;
		euclidian: number;
	}>(search, ant.node_ids, {
		absolute_path: ant.path,
		embeddings,
	});

	console.log(resp);

	let unique_submodels: { relative_path: string; euclidian: number; nodes: Node[] }[] = [];

	for (let element of resp) {
		const existing = unique_submodels.find((r) => r.relative_path === element.relative_path);

		if (existing) {
			existing.nodes.push({
				id: element.ids[0],
				introspection: element.introspection,
				own_label: element.last_node_label,
				own_value: get_value_object(element.value_type, element.value),
			});
		} else {
			unique_submodels.push({
				relative_path: element.relative_path,
				euclidian: element.euclidian,
				nodes: [
					{
						id: element.ids[0],
						introspection: element.introspection,
						own_label: element.last_node_label,
						own_value: get_value_object(element.value_type, element.value),
					},
				],
			});
		}
	}

	let unordered_submodels = unique_submodels.map((model) => ({
		score: model.euclidian,
		model: new Ant(model.nodes, model.relative_path),
	}));

	return unordered_submodels.sort((a, b) => a.score - b.score);
}

export async function search_feature_prototypes(ant: Ant, query: string) {
	const llm = new OpenAIEmbeddings({
		modelName: "text-embedding-3-large",
		dimensions: 128,
	});

	console.log("Searching for ", query + " in ", ant.path);

	const embeddings = await llm.embedQuery(query);

	const search = `
		MATCH (root) WHERE id(root) = $node WITH root

		// MATCH sibl1 = (root)-[:INSTANCE_OF|EXTENDS|REF*0..]->(sbl)
		// MATCH sibl2 = (sbl)-[ref:WHERE_THE]->(sbl2)
		// MATCH sibl3 = (sbl2)-[:REF*0..]->(last_node2)

		MATCH path = (root)-[:INSTANCE_OF|EXTENDS|REF*0..]->()-[rel:FEATURE_TEMPLATE]->(template) WHERE template.vect IS NOT NULL

		WITH path, template, vec.euclideanDistance(template.vect, vecf32($embeddings)) as eucl, rel
		
		RETURN DISTINCT
			template.name as name,
			rel.feature_category as kind,
			template.label as label,
			template.value_type as value_type,
			template.value as value,
			collect(ID(template)) as ids,
			rel,
			eucl as euclidian

		ORDER BY euclidian ASC LIMIT 5
	`;
	const resp = await graph_query_on_nodes<{
		ids: number[];
		name: string;
		kind: string;
		compiler: string;
		label: string;
		value_type: string;
		value: string | number | boolean;
		euclidian: number;
	}>(search, ant.node_ids, {
		absolute_path: ant.path,
		embeddings,
	});

	console.log(resp);
	// console.log("feature_prototypes", resp);

	const unordered = resp
		.filter((feature, index, self) => self.findIndex((t) => t.name === feature.name) === index)
		.map((model) => ({
			score: model.euclidian,
			feature: {
				category: model.kind,
				model: new Ant(
					[
						{
							id: model.ids[0],
							introspection: [],
							own_label: model.label,
							own_value: get_value_object(model.value_type, model.value),
						},
					],
					model.name,
				),
			},
		}));

	return unordered.sort((a, b) => a.score - b.score);
}

function softmax(
	arr: {
		[index: string]: any;
		score: number;
	}[],
): {
	[index: string]: any;
	score: number;
}[] {
	const scores = arr.map((a) => a.score);
	const sum = scores.map((a) => Math.exp(-a)).reduce((a, b) => a + b, 0);
	return arr.map((a) => ({ ...a, score: Math.exp(-a.score) / sum }));
}

export async function find_instances_by_value(class_name: string, key: string, value: string) {
	const cl = await find_model(class_name);

	if (!cl) {
		console.log("Class not found", class_name);
		return [];
	}

	const query = `
		MATCH (target) where id(target) = $class_id

		WITH target

		MATCH (model:Model)-[:EXTENDS*0..]->()-[:INSTANCE_OF]->()-[:EXTENDS*0..]->(target)

		MATCH (model)-[:WHERE_THE]->(key {name: $key}) WHERE key.value = $value

		RETURN DISTINCT id(model) as id
	`;

	const resp = await graph_query<{
		id: number;
	}>(query, {
		class_id: await definition_node_id(cl),
		key,
		value,
	});

	return await group_siblings(resp.map((elt) => elt.id));
}

export async function breadcrumbs(ant: Ant): Promise<Ant[]> {
	const triangular = ant.path.split(":").reduce((acc, elt, index, arr) => {
		acc.push(arr.slice(0, index + 1).join(":"));
		return acc;
	}, [] as string[]);

	const resp = (await Promise.all(triangular.map(find_model))).filter((elt) => elt !== null) as Ant[];

	return resp;
}

export async function description(ant: Ant): Promise<string> {
	const query = `
		MATCH (root) WHERE id(root) = $node
		RETURN root.description as description
	`;

	const resp = await graph_query_on_nodes<{ description: string }>(query, ant.node_ids);

	// console.log(ant.path, resp.find((elt) => elt.description !== null)?.description || "");

	if (resp.length === 0) {
		return "";
	}
	return resp.sort((a, b) => b.description?.length - a.description?.length).find((elt) => elt.description !== null)?.description || "";
}

// export async function summary(ant: Ant): Promise<string> {

// 	const query = `
// 		MATCH (root) WHERE id(root) = $node
// 		RETURN root.summary as summary
// 	`;

// 	const resp = await graph_query_on_nodes<{ summary: string }>(query, ant.node_ids);

// 	if(resp.length === 0) {
// 		return "";
// 	}

// 	return resp[0].summary;
// }

export async function classes(ant: Ant): Promise<Ant[]> {
	const query = /* Cypher */ `
        MATCH (root) WHERE id(root) = $node
		WITH root
        MATCH path = (root)-[ref:EXTENDS|INSTANCE_OF|REF*1..]->(last_node)
        RETURN
            DISTINCT last_node.name as last_node_path,
			last_node.label as last_node_label,
            id(last_node) as id,
			last_node.value_type as value_type,
			last_node.value as value,
            reduce(p = $absolute_path, n in relationships(path) | p + CASE type(n) WHEN 'EXTENDS' THEN ':' + endNode(n).name WHEN 'INSTANCE_OF' THEN ':' + endNode(n).name ELSE '' END) as path
    `;
	const resp = await graph_query_on_nodes<{
		id: number;
		last_node_label: string;
		last_node_path: string;
		path: string;
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
	});

	let response: {
		path: string;
		label: string;
		nodes: Node[];
	}[] = [];

	for (const elt of resp) {
		const existing = response.find((r) => r.path === elt.last_node_path);

		if (existing) {
			existing.nodes.push({
				id: elt.id,
				introspection: [],
				own_label: elt.last_node_label,
				own_value: get_value_object(elt.value_type, elt.value),
			} as Node);
		} else {
			response.push({
				path: elt.last_node_path,
				label: elt.last_node_label,
				nodes: [
					{
						id: elt.id,
						introspection: [],
						own_label: elt.last_node_label,
						own_value: get_value_object(elt.value_type, elt.value),
					} as Node,
				],
			});
		}
	}

	return response.map((model) => new Ant(model.nodes, model.path));
}

export async function direct_classes(ant: Ant): Promise<Ant[]> {
	const query = `
        MATCH (root) WHERE id(root) = $node
		WITH root
        MATCH path = (root)-[:REF*0..]->()-[ref:EXTENDS|INSTANCE_OF]->(last_node)
        RETURN
            DISTINCT last_node.name as last_node_path,
			last_node.label as last_node_label,
            id(last_node) as id,
			last_node.value_type as value_type,
			last_node.value as value,
            reduce(p = $absolute_path, n in relationships(path) | p + CASE type(n) WHEN 'INSTANCE_OF' then ':' + endNode(n).name WHEN 'EXTENDS' THEN ':' + endNode(n).name ELSE '' END) as path
    `;
	const resp = await graph_query_on_nodes<{
		id: number;
		last_node_label: string;
		last_node_path: string;
		path: string;
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
	});

	let response: {
		path: string;
		label: string;
		nodes: Node[];
	}[] = [];

	for (const elt of resp) {
		const existing = response.find((r) => r.path === elt.last_node_path);

		if (existing) {
			existing.nodes.push({
				id: elt.id,
				introspection: [],
				own_label: elt.last_node_label,
				own_value: get_value_object(elt.value_type, elt.value),
			} as Node);
		} else {
			response.push({
				path: elt.last_node_path,
				label: elt.last_node_label,
				nodes: [
					{
						id: elt.id,
						introspection: [],
						own_label: elt.last_node_label,
						own_value: get_value_object(elt.value_type, elt.value),
					} as Node,
				],
			});
		}
	}

	return response.map((model) => new Ant(model.nodes, model.path));
}

export async function has_class(ant: Ant, class_name: string): Promise<boolean> {
	// return (await classes(ant)).some((model) => model.path === class_name);

	const query = /* Cypher */ `
        MATCH (root) WHERE id(root) = $node
		WITH root
        MATCH path = (root)-[ref:EXTENDS|INSTANCE_OF|REF*1..]->(last_node) WHERE last_node.name = $class_name
		RETURN
			DISTINCT last_node.name as last_node_path
    `;

	const resp = await graph_query_on_nodes<{
		last_node_path: string;
	}>(query, ant.node_ids, {
		class_name,
		// class_id: definition_node(ant)?.id,
	});

	return resp.length > 0;
}

export async function if_has_class(ant: Ant, class_name: string): Promise<Ant | null> {
	if (await has_class(ant, class_name)) {
		return ant;
	}

	return null;
}

export async function has_direct_class(ant: Ant, class_name: string): Promise<boolean> {
	// return (await direct_classes(ant)).some((model) => model.path === class_name);

	const query = /* Cypher */ `
		MATCH (root) WHERE id(root) = $node
		WITH root
		MATCH path = (root)-[:REF*0..]->()-[ref:EXTENDS|INSTANCE_OF]->(last_node) WHERE last_node.name = $class_name
			DISTINCT last_node.name as last_node_path
	`;

	const resp = await graph_query_on_nodes<{
		last_node_path: string;
	}>(query, ant.node_ids, {
		class_name,
		// class_id: definition_node(ant)?.id,
	});

	return resp.length > 0;
}

export async function instances(ant: Ant, page?: number, per_page?: number, string_filters?: StringFilter[], number_filters?: NumberFilter[], boolean_filters?: BooleanFilter[], date_filters?: DateFilter[], reference_filters?: ReferenceFilter[]): Promise<Ant[]> {
	const query = `
	MATCH (target) where id(target) = $class_id

    WITH target

    MATCH path = (model:Model)-[p:WHERE_THE|REF|INSTANCE_OF|EXTENDS*0..]->()-[:INSTANCE_OF|EXTENDS]->(target)

	${get_filter_rows(string_filters, number_filters, boolean_filters, date_filters, reference_filters)}

	RETURN DISTINCT id(model) as id

	${page ? `SKIP ${page * (per_page || 0)}` : ""}
	${per_page ? `LIMIT ${per_page}` : ""}
    `;

	const resp = await graph_query<{
		id: number;
		// path: string;
		// head: string;
		// label: string;
		// tail: string;
		// is_direct: boolean;
	}>(query, {
		// class_name: ant.path,
		class_id: await definition_node_id(ant),
	});

	return await group_siblings(resp.map((elt) => elt.id));

	// const get_classes = await find_models(resp);

	// return Promise.all(get_classes);
}

export async function direct_instances(ant: Ant, page?: number, per_page?: number, string_filters?: StringFilter[], number_filters?: NumberFilter[], boolean_filters?: BooleanFilter[], date_filters?: DateFilter[], reference_filters?: ReferenceFilter[]): Promise<Ant[]> {
	const query = `
	MATCH (target) where id(target) = $class_id

    WITH target

	MATCH path = (model:Model)-[p:REF*0..]->()-[:INSTANCE_OF|EXTENDS]->(target) 

	${get_filter_rows(string_filters, number_filters, boolean_filters, date_filters, reference_filters)}

	RETURN id(model) as id

		${page ? `SKIP ${page * (per_page || 0)}` : ""}
		${per_page ? `LIMIT ${per_page}` : ""}
	`;

	const resp = await graph_query<{
		// path: string;
		// head: string;
		// label: string;
		// tail: string;
		// is_direct: boolean;

		id: number;
	}>(query, {
		// class_name: ant.path,
		class_id: await definition_node_id(ant),
	});

	return await group_siblings(resp.map((elt) => elt.id));

	// const get_classes = await find_models(resp);

	// return Promise.all(get_classes);
}

export async function count_instances(ant: Ant): Promise<number> {
	const query = `
	MATCH (target) where id(target) = $class_id

    WITH target

	MATCH path = (model:Model)-[p:WHERE_THE|REF|INSTANCE_OF|EXTENDS*0..]->()-[:INSTANCE_OF|EXTENDS]->(target)

	RETURN count(DISTINCT head(nodes(path))) as count
	`;

	const resp = await graph_query<{ count: number }>(query, {
		// class_name: ant.path,
		class_id: await definition_node_id(ant),
	});

	return resp[0].count;
}

export async function count_direct_instances(ant: Ant): Promise<number> {
	const query = `
	MATCH (target) where id(target) = $class_id

    WITH target

	MATCH path = (model:Model)-[p:REF*0..]->()-[:INSTANCE_OF|EXTENDS]->(target)

	RETURN count(DISTINCT head(nodes(path))) as count
	`;

	const resp = await graph_query<{ count: number }>(query, {
		// class_name: ant.path,
		class_id: await definition_node_id(ant),
	});

	return resp[0].count;
}

export async function it2_subclasses(ant: Ant): Promise<Ant[]> {
	const query = `
	MATCH (target) where id(target) = $class_id

    WITH target

    MATCH path = (model:Model)-[:REF|INSTANCE_OF|EXTENDS*0..]->()-[:EXTENDS]->(target)

	RETURN DISTINCT id(target) as id

    // RETURN DISTINCT
    //     head(nodes(path)).name + reduce(p = '', n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as path,
    //     model.label as label,
    //     head(nodes(path)).name as head,
    //     reduce(p = '', n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as tail,
    //     reduce(p = true, n in relationships(path) | CASE type(n) WHEN 'EXTENDS' THEN false WHEN 'INSTANCE_OF' THEN false ELSE p END) as is_direct
    `;

	const resp = await graph_query<{
		// path: string;
		// head: string;
		// label: string;
		// tail: string;
		// is_direct: boolean;

		id: number;
	}>(query, {
		// class_name: ant.pat
		class_id: await definition_node_id(ant),
	});

	return await group_siblings(resp.map((elt) => elt.id));

	// const get_classes = await find_models(resp);

	// const classes = await Promise.all(get_classes);

	// let response: Ant[] = [];

	// for (let cl of classes) {
	// 	if (response.find((r) => r.path === cl.path)) {
	// 		continue;
	// 	}

	// 	response.push(cl);
	// }

	// return response;
}

export async function it2_superclasses(ant: Ant): Promise<Ant[]> {
	const query = `
	MATCH (root) WHERE id(root) = $node
	WITH root
	MATCH path = (root)-[ref:EXTENDS|REF*1..]->(last_node)
	RETURN
		DISTINCT last_node.name as last_node_path,
		last_node.label as last_node_label,
		id(last_node) as id,
		last_node.value_type as value_type,
		last_node.value as value,
		reduce(p = $absolute_path, n in relationships(path) | p + CASE type(n) WHEN 'EXTENDS' THEN ':' + endNode(n).name WHEN 'INSTANCE_OF' THEN ':' + endNode(n).name ELSE '' END) as path
`;

	const resp = await graph_query_on_nodes<{
		id: number;
		last_node_label: string;
		last_node_path: string;
		path: string;
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
	});

	let response: {
		path: string;
		label: string;
		nodes: Node[];
	}[] = [];

	for (const elt of resp) {
		const existing = response.find((r) => r.path === elt.last_node_path);

		if (existing) {
			existing.nodes.push({
				id: elt.id,
				introspection: [],
				own_label: elt.last_node_label,
				own_value: get_value_object(elt.value_type, elt.value),
			} as Node);
		} else {
			response.push({
				path: elt.last_node_path,
				label: elt.last_node_label,
				nodes: [
					{
						id: elt.id,
						introspection: [],
						own_label: elt.last_node_label,
						own_value: get_value_object(elt.value_type, elt.value),
					} as Node,
				],
			});
		}
	}

	return response.map((model) => new Ant(model.nodes, model.path));
}

export async function it2_instances(ant: Ant, depth?: number): Promise<Ant[]> {
	// the path contains exactly "depth" relationships of type "instance_of"()
	const depth_filter = depth ? `WHERE size([n IN relationships(path) WHERE type(n) = 'INSTANCE_OF']) = ${depth}` : `WHERE size([n IN relationships(path) WHERE type(n) = 'INSTANCE_OF']) > 0`;

	const query = `
	MATCH (target) where id(target) = $class_id

    WITH target

    MATCH path = (model:Model)-[p:INSTANCE_OF|EXTENDS*1..]->(target)
    // MATCH path = (model:Model)-[p:WHERE_THE|INSTANCE_OF|EXTENDS*0..]->()-[:INSTANCE_OF]->()-[p2:EXTENDS*0..]->(target)

	${depth_filter}

	RETURN DISTINCT id(model) as id, model.label, relationships(path) as relationships, nodes(path) as nodes

    // RETURN DISTINCT
    //     head(nodes(path)).name + reduce(p = '', n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as path,
    //     model.label as label,
    //     head(nodes(path)).name as head,
    //     reduce(p = '', n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as tail,
    //     reduce(p = true, n in relationships(path) | CASE type(n) WHEN 'EXTENDS' THEN false WHEN 'INSTANCE_OF' THEN false ELSE p END) as is_direct
    `;

	let start = new Date().getTime();

	const _resp = await graph_query<{
		// path: string;
		// label: string;
		id: number;
	}>(query, {
		// class_name: ant.path,
		class_id: await definition_node_id(ant),
	});

	console.log(JSON.stringify(_resp, null, 4));

	const siblings = await group_siblings(_resp.map((elt) => elt.id));

	// console.log(siblings.map((s) => s.nodes));

	return siblings;

	// filter out duplicates (by path)

	// const resp = _resp.filter((elt, index, self) => self.findIndex((t) => t.path === elt.path) === index);

	// const get_classes = await find_models(resp);

	// return Promise.all(get_classes);
}

export async function it2_prototypes(ant: Ant): Promise<Ant[]> {
	const query = `
	MATCH (root) WHERE id(root) = $node
	WITH root
	MATCH path = (root)-[:INSTANCE_OF]->(last_node)
	RETURN
		DISTINCT last_node.name as last_node_path,
		last_node.label as last_node_label,
		id(last_node) as id,
		last_node.value_type as value_type,
		last_node.value as value,
		reduce(p = $absolute_path, n in relationships(path) | p + CASE type(n) WHEN 'EXTENDS' THEN ':' + endNode(n).name WHEN 'INSTANCE_OF' THEN ':' + endNode(n).name ELSE '' END) as path
`;
	const resp = await graph_query_on_nodes<{
		id: number;
		last_node_label: string;
		last_node_path: string;
		path: string;
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
	});

	let response: {
		path: string;
		label: string;
		nodes: Node[];
	}[] = [];

	for (const elt of resp) {
		const existing = response.find((r) => r.path === elt.last_node_path);

		if (existing) {
			existing.nodes.push({
				id: elt.id,
				introspection: [],
				own_label: elt.last_node_label,
				own_value: get_value_object(elt.value_type, elt.value),
			} as Node);
		} else {
			response.push({
				path: elt.last_node_path,
				label: elt.last_node_label,
				nodes: [
					{
						id: elt.id,
						introspection: [],
						own_label: elt.last_node_label,
						own_value: get_value_object(elt.value_type, elt.value),
					} as Node,
				],
			});
		}
	}

	return response.map((model) => new Ant(model.nodes, model.path));
}

export async function it2_has_prototype(ant: Ant, prototype: string): Promise<boolean> {
	return (await it2_prototypes(ant)).some((model) => model.path === prototype);
}

export async function it2_has_direct_prototype(ant: Ant, prototype: string): Promise<boolean> {
	return (await it2_direct_prototypes(ant)).some((model) => model.path === prototype);

	const query = /* Cypher */ `
		MATCH (root) WHERE id(root) = $node
		MATCH path = (root)-[:REF*0..]->()-[:INSTANCE_OF]->(last_node) WHERE last_node.name = $prototype
		RETURN
			DISTINCT last_node.name as last_node_path
	`;

	const resp = await graph_query_on_nodes<{
		last_node_path: string;
	}>(query, ant.node_ids, {
		prototype,
	});

	return resp.length > 0;
}

export async function it2_direct_subclasses(ant: Ant): Promise<Ant[]> {
	const query = `
	MATCH (target) where id(target) = $class_id

    WITH target

    MATCH path = (model:Model)-[:EXTENDS|INSTANCE_OF*0..]->(target)

	WHERE size([n IN relationships(path) WHERE type(n) = 'EXTENDS']) = 1

	RETURN DISTINCT id(model) as id
	`;

	const resp = await graph_query<{
		id: number;
	}>(query, {
		class_id: await definition_node_id(ant),
	});

	console.log("DIRECT SUBCLASSES", JSON.stringify(resp, null, 4));

	return await group_siblings(resp.map((elt) => elt.id));

	// const get_classes = await find_models(resp);

	// const classes = await Promise.all(get_classes);

	// let response: Ant[] = [];

	// for (let cl of classes) {
	// 	if (response.find((r) => r.path === cl.path)) {
	// 		continue;
	// 	}

	// 	response.push(cl);
	// }

	// return response;
}

export async function it2_direct_superclasses(ant: Ant): Promise<Ant[]> {
	const query = `
	MATCH (root) WHERE id(root) = $node
	WITH root
	MATCH path = (root)-[ref:WHERE_THE|REF*0..]->()-[:EXTENDS]->(last_node)
	RETURN
		DISTINCT last_node.name as last_node_path,
		last_node.label as last_node_label,
		id(last_node) as id,
		last_node.value_type as value_type,
		last_node.value as value,
		reduce(p = $absolute_path, n in relationships(path) | p + CASE type(n) WHEN 'EXTENDS' THEN ':' + endNode(n).name WHEN 'INSTANCE_OF' THEN ':' + endNode(n).name ELSE '' END) as path
`;
	const resp = await graph_query_on_nodes<{
		id: number;
		last_node_label: string;
		last_node_path: string;
		path: string;
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
	});

	let response: {
		path: string;
		label: string;
		nodes: Node[];
	}[] = [];

	for (const elt of resp) {
		const existing = response.find((r) => r.path === elt.last_node_path);

		if (existing) {
			existing.nodes.push({
				id: elt.id,
				introspection: [],
				own_label: elt.last_node_label,
				own_value: get_value_object(elt.value_type, elt.value),
			} as Node);
		} else {
			response.push({
				path: elt.last_node_path,
				label: elt.last_node_label,
				nodes: [
					{
						id: elt.id,
						introspection: [],
						own_label: elt.last_node_label,
						own_value: get_value_object(elt.value_type, elt.value),
					} as Node,
				],
			});
		}
	}

	return response.map((model) => new Ant(model.nodes, model.path));
}

export async function it2_direct_instances(ant: Ant, filters?: InstanceWhereInput[], sort?: InstanceSortInput, page?: number, per_page?: number): Promise<Ant[]> {
	let start = new Date().getTime();

	// console.log("it2_direct_instances", ant.path);

	const query = `
	MATCH (target) where id(target) = $class_id

    WITH target

	MATCH path = (model:Model)-[:INSTANCE_OF|EXTENDS*0..]->(target) 

	WHERE size([n IN relationships(path) WHERE type(n) = 'INSTANCE_OF']) = 1

		${
			// get_filter_rows(filters)
			""
		}

	${get_sort_rows(sort).query}
	
	RETURN DISTINCT id(model) as id

	${get_sort_rows(sort).filter}
	
	${page ? `SKIP ${(page - 1) * (per_page || 0)}` : ""}
	${per_page ? `LIMIT ${per_page}` : ""}

	`;

	// console.log(query, {
	// 	// class_name: ant.path,
	// 	class_id: await definition_node_id(ant),
	// });

	const resp = await graph_query<{
		// path: string;
		// head: string;
		// label: string;
		// tail: string;
		// is_direct: boolean;

		id: number;
	}>(query, {
		// class_name: ant.path,
		class_id: await definition_node_id(ant),
	});
	console.log("resp", resp);

	const now = new Date().getTime();

	const s = await group_siblings(resp.map((elt) => elt.id));

	return s;

	// const get_classes = await find_models(resp);

	// return Promise.all(get_classes);
}

export async function it2_direct_prototypes(ant: Ant): Promise<Ant[]> {
	const start = new Date().getTime();
	const query = `
	MATCH (root) WHERE id(root) = $node
	WITH root
	MATCH path = (root)-[ref:REF|EXTENDS*0..]->()-[:INSTANCE_OF]->(last_node)
	RETURN
		DISTINCT last_node.name as last_node_path,
		last_node.label as last_node_label,
		id(last_node) as id,
		last_node.value_type as value_type,
		last_node.value as value,
		path as p
`;
	const resp = await graph_query_on_nodes<{
		id: number;
		last_node_label: string;
		last_node_path: string;
		path: string;
		value_type: string;
		value: string | number | boolean;
		p: string;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
	});

	let response: {
		path: string;
		label: string;
		nodes: Node[];
	}[] = [];

	for (const elt of resp) {
		const existing = response.find((r) => r.path === elt.last_node_path);

		if (existing) {
			existing.nodes.push({
				id: elt.id,
				introspection: [],
				own_label: elt.last_node_label,
				own_value: get_value_object(elt.value_type, elt.value),
			} as Node);
		} else {
			response.push({
				path: elt.last_node_path,
				label: elt.last_node_label,
				nodes: [
					{
						id: elt.id,
						introspection: [],
						own_label: elt.last_node_label,
						own_value: get_value_object(elt.value_type, elt.value),
					} as Node,
				],
			});
		}
	}

	return response.map((model) => new Ant(model.nodes, model.path));
}

export async function it2_count_instances(ant: Ant): Promise<number> {
	const query = `
	MATCH (target) where id(target) = $class_id

    WITH target

	MATCH path = (model:Model)-[p:WHERE_THE|REF|INSTANCE_OF|EXTENDS*0..]->()-[:INSTANCE_OF]->(target)

	RETURN count(DISTINCT head(nodes(path))) as count
	`;

	const resp = await graph_query<{ count: number }>(query, {
		// class_name: ant.path,
		class_id: await definition_node_id(ant),
	});

	return resp[0].count;
}

export async function it2_count_direct_instances(ant: Ant, filters?: InstanceWhereInput[]): Promise<number> {
	const query = `
	MATCH (target) where id(target) = $class_id

    WITH target

	MATCH path = (model:Model)-[p:EXTENDS*0..]->()-[:INSTANCE_OF]->()-[:EXTENDS*0..]->(target)

	${
		// get_filter_rows(filters)
		""
	}

	RETURN count(DISTINCT head(nodes(path))) as count
	`;

	// a.log(query);

	const resp = await graph_query<{ count: number }>(query, {
		// class_name: ant.path,
		class_id: await definition_node_id(ant),
	});

	return resp[0].count;
}

export async function aggregate_direct_instances(ant: Ant, kind: string, subpath: string, filters?: InstanceWhereInput[]): Promise<number> {
	function get_kind(kind: string) {
		switch (kind) {
			case "count":
				return "count";
			case "sum":
				return "sum";
			case "average":
				return "avg";
			case "min":
				return "min";
			case "max":
				return "max";
			default:
				return "count";
		}
	}

	const query = `
	MATCH (target) where id(target) = $class_id

    WITH target

	// MATCH path = (model:Model)-[p:WHERE_THE|REF|EXTENDS*0..]->()-[:INSTANCE_OF]->()-[:EXTENDS*0..]->(target)

		${
			// get_filter_rows(filters)
			""
		}

	WITH model

	MATCH sibl = (model)-[:INSTANCE_OF|EXTENDS|REF*0..]->(sbl)

	MATCH sibl2 = (sbl)-[ref:WHERE_THE]->(sbl2)

	MATCH sibl3 = (sbl2)-[:INSTANCE_OF|EXTENDS|REF*0..]->(last_node:Value)

	AND last_node.name = '${subpath}'
					
	RETURN  ${get_kind(kind)}(last_node.value) as aggregate

	`;

	// console.log(query, await definition_node_id(ant));

	const resp = await graph_query<{ aggregate: number }>(query, {
		// class_name: ant.path,
		class_id: await definition_node_id(ant),
	});

	return resp[0].aggregate;
}

export async function submodels(ant: Ant, class_name?: string): Promise<Ant[]> {
	const query = `
        MATCH (root) WHERE id(root) = $node
		WITH root
        MATCH path = (root)-[:INSTANCE_OF|EXTENDS|REF*0..]->()-[ref:WHERE_THE]->(last_node)
		${class_name ? `MATCH path_${class_name} = (last_node)-[:INSTANCE_OF|EXTENDS|REF*0..]->()-[:INSTANCE_OF|EXTENDS]->({name: '${class_name}'})\n\n` : ""}
        RETURN
            DISTINCT reduce(p = '', n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as relative_path,
            last_node.label as last_node_label,
            collect(id(last_node)) as ids,
			REDUCE(s = [], r IN RELATIONSHIPS(path) | s + TYPE(r)) as introspection,
			last_node.value_type as value_type,
			last_node.value as value
    `;

	const resp = await graph_query_on_nodes<{
		ids: number[];
		last_node_label: string;
		relative_path: string;
		introspection: string[];
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
	});

	let unique_submodels: { relative_path: string; nodes: Node[] }[] = [];

	for (let element of resp) {
		const existing = unique_submodels.find((r) => r.relative_path === element.relative_path);

		if (existing) {
			existing.nodes.push({
				id: element.ids[0],
				introspection: element.introspection,
				own_label: element.last_node_label,
				own_value: get_value_object(element.value_type, element.value),
			});
		} else {
			unique_submodels.push({
				relative_path: element.relative_path,
				nodes: [
					{
						id: element.ids[0],
						introspection: element.introspection,
						own_label: element.last_node_label,
						own_value: get_value_object(element.value_type, element.value),
					},
				],
			});
		}
	}

	return unique_submodels.map((model) => ant.advance(model.nodes, model.relative_path));
}

export async function submodel_templates(ant: Ant): Promise<Ant[]> {
	const query_submodels = /* Cypher */ `
		MATCH (root) WHERE id(root) = $node
		WITH root
		
		MATCH (root)-[:INSTANCE_OF|EXTENDS|REF*0..]->()-[:HAS_SUBMODEL_TEMPLATE]->(template)  

		RETURN DISTINCT id(template) as id

		// RETURN
		// 	DISTINCT template.name as path,
		// 	template.label as label,
		// 	collect(id(template)) as id
	`;

	const query_prototypes = /* Cypher */ `
		MATCH (root) WHERE id(root) = $node
		WITH root
		
		MATCH (root)-[:INSTANCE_OF|EXTENDS|REF*0..]->()-[:HAS_SUBMODEL_TEMPLATE_FROM_PROTOTYPE]->(template)  

		RETURN DISTINCT id(template) as id

		// RETURN
		// 	DISTINCT template.name as path,
		// 	template.label as label,
		// 	collect(id(template)) as id
	`;

	const resp_submodels = await graph_query_on_nodes<{
		// ids: number[];
		// label: string;
		// path: string;

		id: number;
	}>(query_submodels, ant.node_ids, {
		absolute_path: ant.path,
	});

	const resp_prototypes = await graph_query_on_nodes<{
		// ids: number[];
		// label: string;
		// path: string;

		id: number;
	}>(query_prototypes, ant.node_ids, {
		absolute_path: ant.path,
		// nodes: ant.node_ids,
	});

	// const get_templates = await find_models(resp_submodels);

	// const prototypes = await find_models(resp_prototypes);

	const get_templates = await group_siblings(resp_submodels.map((elt) => elt.id));

	const prototypes = await group_siblings(resp_prototypes.map((elt) => elt.id));

	let instances: Ant[] = [];

	for (const prototype of await prototypes) {
		const _instances = await it2_direct_instances(await prototype);

		instances.push(..._instances);
	}

	return [...(await Promise.all(get_templates)), ...instances];

	// return Promise.all(get_templates);
}

export async function at(ant: Ant, relative_path: string): Promise<Ant | null> {
	let query = `
        MATCH (root) WHERE id(root) = $node
		WITH root

		MATCH sibl1 = (root)-[:INSTANCE_OF|EXTENDS|REF*0..]->(sbl)

		MATCH sibl2 = (sbl)-[ref:WHERE_THE]->(sbl2)

		MATCH sibl3 = (sbl2)-[:INSTANCE_OF|EXTENDS|REF*0..]->(last_node2)
		WHERE last_node2.name = $submodel
		
		WITH RELATIONSHIPS(sibl1) + RELATIONSHIPS(sibl2) + RELATIONSHIPS(sibl3) as path, last_node2 as last_node

        RETURN
            id(last_node) as id,
            last_node.name as last_node_label,
            reduce(p = $absolute_path, n in path | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as path,
			last_node.value_type as value_type,
			last_node.value as value,
			REDUCE(s = [], r IN path | s + TYPE(r)) as introspection
    `;

	const resp = await graph_query_on_nodes<{
		id: number;
		last_node_label: string;
		path: string;
		introspection: string[];
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
		submodel: relative_path,
	});

	if (resp.length === 0) {
		// console.log("No response for getting submodel ", relative_path, "on", ant.path, "with node ids", ant.node_ids);

		// console.log(resp);

		return null;
	}

	return ant.advance(
		resp.map((node) => ({
			id: node.id,
			introspection: node.introspection,
			own_label: node.last_node_label,
			own_value: get_value_object(node.value_type, node.value),
		})),
		relative_path,
	);
}

export async function at_many(ant: Ant, relative_paths: string[]): Promise<Ant[]> {
	return (await Promise.all(relative_paths.map((path) => at(ant, path)))).filter((r) => r !== null) as Ant[];

	let query = `
		MATCH (root) WHERE id(root) = $node
		WITH root
		MATCH path = (root)-[ref1:INSTANCE_OF|EXTENDS|REF|WHERE_THE*0..]->(last_node) 
		WHERE size([n in relationships(path) WHERE type(n) = 'WHERE_THE']) = 1
		AND last_node.name IN $submodels

		RETURN
			id(last_node) as id,
			last_node.name as last_node_label,
			last_node.name as relative_path,
			reduce(p = $absolute_path, n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as path,
			last_node.value_type as value_type,
			last_node.value as value,
			REDUCE(s = [], r IN RELATIONSHIPS(path) | s + TYPE(r)) as introspection
	`;

	const resp = await graph_query_on_nodes<{
		id: number;
		relative_path: string;
		last_node_label: string;
		path: string;
		introspection: string[];
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
		submodels: relative_paths,
	});

	// console.log(resp)

	return resp.map((node) =>
		ant.advance(
			[
				{
					id: node.id,
					introspection: node.introspection,
					own_label: node.last_node_label,
					own_value: get_value_object(node.value_type, node.value),
				},
			],
			node.relative_path,
		),
	);
}

export async function deep_submodels(ant: Ant, max_depth?: number, follow_references?: boolean, class_name?: string): Promise<Ant[]> {
	const _max_depth = max_depth || 1;

	const query = `
    MATCH (root) WHERE id(root) = $node
	WITH root
    MATCH path = (root)-[:WHERE_THE|INSTANCE_OF|EXTENDS${follow_references ? "|REF" : ""}*1..]->(last_node)
	
	WHERE reduce(p = 0, n in relationships(path) | p + CASE WHEN type(n) = 'WHERE_THE' THEN 1 ELSE 0 END) <= ${_max_depth} AND type(last(relationships(path))) = 'WHERE_THE'
	
    ${class_name ? `MATCH path_${class_name} = (last_node)-[:INSTANCE_OF|EXTENDS|REF*0..]->()-[:INSTANCE_OF|EXTENDS]->({name: '${class_name}'})\n\n` : ""}

    RETURN
        DISTINCT reduce(p = '', n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as relative_path,
        last_node.label as last_node_label,
        collect(id(last_node)) as ids,
		REDUCE(s = [], r IN RELATIONSHIPS(path) | s + TYPE(r)) as introspection,
		last_node.value_type as value_type,
		last_node.value as value

`;

	const resp = await graph_query_on_nodes<{
		ids: number[];
		last_node_label: string;
		relative_path: string;
		introspection: string[];
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
	});

	let unique_submodels: { relative_path: string; nodes: Node[] }[] = [];

	for (let element of resp) {
		const existing = unique_submodels.find((r) => r.relative_path === element.relative_path);

		if (existing) {
			existing.nodes.push({
				id: element.ids[0],
				introspection: element.introspection,
				own_label: element.last_node_label,
				own_value: get_value_object(element.value_type, element.value),
			});
		} else {
			unique_submodels.push({
				relative_path: element.relative_path,
				nodes: [
					{
						id: element.ids[0],
						introspection: element.introspection,
						own_label: element.last_node_label,
						own_value: get_value_object(element.value_type, element.value),
					},
				],
			});
		}
	}

	return unique_submodels.map((model) => ant.advance(model.nodes, model.relative_path));
	// let resp_nodes = [];

	// for (const elt of resp) {
	// 	const existing = resp_nodes.find((r) => r.relative_path === elt.relative_path);

	// 	if (existing) {
	// 		existing.ids.push(...elt.ids);
	// 	} else {
	// 		resp_nodes.push({
	// 			relative_path: elt.relative_path,
	// 			last_node_label: elt.last_node_label,
	// 			ids: elt.ids,
	// 		});
	// 	}
	// }

	// return resp_nodes.map((node) => ant.advance(node.ids || [], node.relative_path, node.last_node_label));
}

export async function features(ant: Ant, kind?: CATEGORY) {
	let kind_filter = "";

	if (kind) {
		kind_filter = ` AND last(relationships(p)).feature_category = '${kind}'`;
	}

	const query = `
        MATCH (root) WHERE id(root) = $node
		WITH root
        MATCH p = (root)-[:INSTANCE_OF|EXTENDS|REF|FEATURE*0..]->(feature)
		WHERE size([n in relationships(p) WHERE type(n) = 'FEATURE']) = 1 AND type(last(relationships(p))) = 'FEATURE'	

		${kind_filter}

        RETURN DISTINCT
			feature.name as name,
            feature.label as label,
            collect(ID(feature)) as ids,
			last(relationships(p)).feature_category as category,

			last(relationships(p)).abstraction_depth - size([n in relationships(p) WHERE type(n) = 'INSTANCE_OF']) as abstraction_depth,


			feature.value_type as value_type,
			feature.value as value
    `;

	const resp = await graph_query_on_nodes<{
		ids: number[];
		name: string;
		label: string;
		category: string;
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids);

	return resp.map((feature) => ({
		category: feature.category,
		model: new Ant(
			[
				{
					id: feature.ids[0],
					introspection: [],
					own_label: feature.label,
					own_value: get_value_object(feature.value_type, feature.value),
				},
			],
			feature.name,
		).feature_of(ant),
	}));
}

export const has_feature = async (ant: Ant, feature: string): Promise<boolean> => {
	const query = `
		MATCH (root) WHERE id(root) = $node
		WITH root
		MATCH (root)-[:INSTANCE_OF|EXTENDS|REF*0..]->()-[rel:FEATURE]->(feature)
		WHERE feature.name = $feature

		RETURN DISTINCT
			feature.name as name,
			feature.label as label,
			collect(ID(feature)) as ids
	`;

	const resp = await graph_query_on_nodes<{
		ids: number[];
		name: string;
		label: string;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
		feature,
	});

	return resp.length > 0;
};

export const has_feature_category = async (ant: Ant, category: CATEGORY): Promise<boolean> => {
	const query = `
		MATCH (root) WHERE id(root) = $node
		WITH root
		MATCH (root)-[:INSTANCE_OF|EXTENDS|REF*0..]->()-[rel:FEATURE]->(feature)
		WHERE rel.feature_category = $category

		RETURN DISTINCT
			feature.name as name,
			feature.label as label,
			collect(ID(feature)) as ids
	`;

	const resp = await graph_query_on_nodes<{
		ids: number[];
		name: string;
		label: string;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
		category,
	});

	return resp.length > 0;
};

export const feature_prototypes = async (ant: Ant, kind?: CATEGORY) => {
	let kind_filter = "";

	if (kind) {
		kind_filter = ` WHERE rel.feature_category = '${kind}'`;
	}

	const query = `
        MATCH (root) WHERE id(root) = $node
		WITH root
        MATCH (root)-[:INSTANCE_OF|EXTENDS|REF*0..]->()-[rel:FEATURE_TEMPLATE]->(template)
		${kind_filter}

        RETURN DISTINCT
            template.name as name,
            rel.feature_category as kind,
			rel.abstraction_depth as abstraction_depth,
            template.label as label,
			template.value_type as value_type,
			template.value as value,
            collect(ID(template)) as ids,
			rel
    `;

	const resp = await graph_query_on_nodes<{
		ids: number[];
		name: string;
		kind: string;
		abstraction_depth: number;
		compiler: string;
		label: string;
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
	});

	// console.log("feature_prototypes", resp);

	return resp
		.filter((feature, index, self) => self.findIndex((t) => t.name === feature.name) === index)
		.map((model) => ({
			category: model.kind,
			abstraction_depth: model.abstraction_depth,
			model: new Ant(
				[
					{
						id: model.ids[0],
						introspection: [],
						own_label: model.label,
						own_value: get_value_object(model.value_type, model.value),
					},
				],
				model.name,
			),
		}));
};

export async function feature_prototype_targets(ant: Ant, category?: string) {
	let category_filter = "";

	if (category) {
		category_filter = ` WHERE rel.feature_category = '${category}'`;
	}

	const query = /* Cypher */ `
		MATCH (targeted) WHERE id(targeted) = $node
		WITH targeted
		
		MATCH path = (root:Model)-[:WHERE_THE|EXTENDS*0..]->(virtual)-[rel:FEATURE_TEMPLATE]->()-[:EXTENDS*0..]->(targeted)

		${category_filter}

		RETURN 
			DISTINCT reduce(p = root.name, n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as path,
			collect(id(virtual)) as ids,
			virtual.label as label,
			virtual.value_type as value_type,
			virtual.value as value,
			REDUCE(s = [], r IN RELATIONSHIPS(path) | s + TYPE(r)) as introspection
	`;

	// console.log(query);

	const leafs = await graph_query_on_nodes<{
		path: string;
		ids: number[];
		label: string;
		introspection: string[];
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids);

	// console.log(leafs);

	return leafs.map(
		(leaf) =>
			new Ant(
				leaf.ids.map(
					(id) =>
						({
							id,
							introspection: leaf.introspection,
							own_label: leaf.label,
							own_value: get_value_object(leaf.value_type, leaf.value),
						}) as Node,
				),

				leaf.path,
			),
	);
	// return leafs.map((leaf) => new Ant(leaf.ids, leaf.path, leaf.label));
}

export async function feature_targets(ant: Ant, category?: string, path_root?: string) {
	let category_filter = "";

	if (category) {
		category_filter = ` WHERE rel.feature_category = '${category}'`;

		if (path_root) {
			category_filter += ` AND root.name = '${path_root}'`;
		}
	} else {
		if (path_root) {
			category_filter = ` WHERE root.name = '${path_root}'`;
		}
	}

	const query = `
	MATCH (targeted) WHERE id(targeted) = $node
	WITH targeted
	
	MATCH path = (root:Model)${path_root ? "-[:INSTANCE_OF]->(proto:Model)" : ""}-[:WHERE_THE|EXTENDS*0..]->(virtual)-[rel:FEATURE]->()-[:EXTENDS*0..]->(targeted)

	${category_filter}

	RETURN 
		DISTINCT reduce(p = root.name, n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as path,
		collect(id(virtual)) as ids,
		virtual.label as label,
		virtual.value_type as value_type,
		virtual.value as value,
		REDUCE(s = [], r IN RELATIONSHIPS(path) | s + TYPE(r)) as introspection
`;

	const leafs = await graph_query_on_nodes<{
		path: string;
		ids: number[];
		label: string;
		introspection: string[];
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids);

	if (path_root) {
		if (leafs.length === 0) return [];

		const a = await Ant.object_from_path(leafs[0]!.path!)!;

		if (!a) return [];

		return [a];
	}

	return leafs.map(
		(leaf) =>
			new Ant(
				leaf.ids.map(
					(id) =>
						({
							id,
							introspection: leaf.introspection,
							own_label: leaf.label,
							own_value: get_value_object(leaf.value_type, leaf.value),
						}) as Node,
				),

				leaf.path,
			),
	);
	// return leafs.map((leaf) => new Ant(leaf.ids, leaf.path, leaf.label));
}

export const reference = async (ant: Ant) => {
	const query = `
        MATCH (root)-[:REF]->(reference) WHERE id(root) = $node
		WITH root, reference
        RETURN
            reference.name as reference,
            reference.label as label,
            id(reference) as id,
			reference.value_type as value_type,
			reference.value as value

    `;

	const resp = await graph_query_on_nodes<{
		id: number;
		reference: string;
		label: string;
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids, {});

	// const resp = await graph_query<{
	// 	id: number;
	// 	reference: string;
	// 	label: string;
	// 	value_type: string;
	// 	value: any;
	// }>(query, {
	// 	// nodes: ant.node_ids,
	// 	absolute_path: ant.path,
	// });

	if (resp.length === 0) return null;

	const first = resp[0];

	const node: Node = {
		id: first.id,
		introspection: [],
		own_label: first.label,
		own_value: get_value_object(first.value_type, first.value),
	};

	return new Ant(await find_siblings(node.id), first.reference);

	// return new Ant([resp[0].id], resp[0].reference, resp[0].label);
};

export const reverse_references = async (ant: Ant) => {
	const query = `
        MATCH (root) WHERE id(root) = $node 
		WITH root
        MATCH path = (ref_root:Model)-[:WHERE_THE|INSTANCE_OF|EXTENDS*0..]->()-[:REF]->(root)  

        MATCH submodels = (ref_root)-[:WHERE_THE|INSTANCE_OF|EXTENDS*0..]->(leaf)
            // WHERE reduce(p = ref_root.name, n in relationships(submodels) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) = reduce(p = ref_root.name, n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END)
			WHERE [n in relationships(submodels) WHERE type(n) = 'WHERE_THE'] = [n in relationships(path) WHERE type(n) = 'WHERE_THE']

        RETURN
            reduce(p = ref_root.name, n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as path,
            collect(id(leaf)) as ids,
            ref_root.label as root,
			ref_root.name as root_path,
			ref_root.value_type as value_type,
			ref_root.value as value,
			REDUCE(s = [], r IN RELATIONSHIPS(path) | s + TYPE(r)) as introspection
    `;

	const resp = await graph_query_on_nodes<{
		ids: number[];
		path: string;
		root: string;
		root_path: string;
		introspection: string[];
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
	});

	let unique_submodels: { path: string; nodes: Node[] }[] = [];

	for (let element of resp) {
		const existing = unique_submodels.find((r) => r.path === element.path);

		if (existing) {
			existing.nodes.push({
				id: element.ids[0],
				introspection: element.introspection,
				own_label: element.root,
				own_value: get_value_object(element.value_type, element.value),
			});
		} else {
			unique_submodels.push({
				path: element.path,
				nodes: [
					{
						id: element.ids[0],
						introspection: element.introspection,
						own_label: element.root,
						own_value: get_value_object(element.value_type, element.value),
					},
				],
			});
		}
	}

	return unique_submodels.map((model) => new Ant(model.nodes, model.path));
};

export async function in_sets(ant: Ant) {
	const query = `
        MATCH (root) WHERE id(root) = $node 
		WITH root
        MATCH path = (ref_root:Model)-[:WHERE_THE|INSTANCE_OF|EXTENDS*0..]->()-[:CONTAINS]->(root)  

        MATCH submodels = (ref_root)-[:WHERE_THE|INSTANCE_OF|EXTENDS*0..]->(leaf)
            // WHERE reduce(p = ref_root.name, n in relationships(submodels) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) = reduce(p = ref_root.name, n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END)
			WHERE [n in relationships(submodels) WHERE type(n) = 'WHERE_THE'] = [n in relationships(path) WHERE type(n) = 'WHERE_THE']

        RETURN
            reduce(p = ref_root.name, n in relationships(path) | p + CASE type(n) WHEN 'WHERE_THE' THEN ':' + endNode(n).name ELSE '' END) as path,
            collect(id(leaf)) as ids,
            ref_root.label as root,
			ref_root.name as root_path,
			ref_root.value_type as value_type,
			ref_root.value as value,
			REDUCE(s = [], r IN RELATIONSHIPS(path) | s + TYPE(r)) as introspection
    `;

	const resp = await graph_query_on_nodes<{
		ids: number[];
		path: string;
		root: string;
		root_path: string;
		introspection: string[];
		value_type: string;
		value: string | number | boolean;
	}>(query, ant.node_ids, {
		absolute_path: ant.path,
	});

	let unique_submodels: { path: string; nodes: Node[] }[] = [];

	for (let element of resp) {
		const existing = unique_submodels.find((r) => r.path === element.path);

		if (existing) {
			existing.nodes.push({
				id: element.ids[0],
				introspection: element.introspection,
				own_label: element.root,
				own_value: get_value_object(element.value_type, element.value),
			});
		} else {
			unique_submodels.push({
				path: element.path,
				nodes: [
					{
						id: element.ids[0],
						introspection: element.introspection,
						own_label: element.root,
						own_value: get_value_object(element.value_type, element.value),
					},
				],
			});
		}
	}

	return unique_submodels.map((model) => new Ant(model.nodes, model.path));
}

export async function get_value<T>(ant: Ant) {
	return ant.value as T;
}

export async function get_string_value(ant: Ant) {
	const value = await get_value<string>(ant);
	if (typeof value === "string") return value;
	else return null;
}

export async function get_number_value(ant: Ant) {
	const value = await get_value<number>(ant);
	if (typeof value === "number") return value;
	else return null;
}

export async function get_boolean_value(ant: Ant) {
	const value = await get_value<boolean>(ant);
	if (typeof value === "boolean") return value;
	else return null;
}

export async function get_string_array_value(ant: Ant) {
	const value = await get_value<string[]>(ant);
	if (Array.isArray(value) && value.every((v) => typeof v === "string")) return value;
	else return null;
}

export async function get_number_array_value(ant: Ant) {
	const value = await get_value<number[]>(ant);
	if (Array.isArray(value) && value.every((v) => typeof v === "number")) return value;
	else return null;
}

export async function get_boolean_array_value(ant: Ant) {
	const value = await get_value<boolean[]>(ant);
	if (Array.isArray(value) && value.every((v) => typeof v === "boolean")) return value;
	else return null;
}

export async function provided_interfaces(ant: Ant) {
	const resp = await graph_query_on_nodes<{ interface: string; native_model: string; abstraction_depth: number }>(
		/* Cypher */ `
		MATCH (root) WHERE id(root) = $node
		WITH root
		MATCH path = (root)-[:INSTANCE_OF|EXTENDS|REF*0..]->()-[rel:HAS_PROVIDED_INTERFACE]->(interface:Interface)
		WHERE rel.abstraction_depth - size([n in relationships(path) WHERE type(n) = 'INSTANCE_OF']) = 0
		RETURN interface.name as interface, rel.on as native_model, rel.abstraction_depth as abstraction_depth
		`,
		ant.node_ids,
	);

	return resp.filter((elt, index, self) => self.findIndex((t) => t.interface === elt.interface) === index);
}

export async function interface_constraints(ant: Ant) {
	const resp = await graph_query_on_nodes<{ interface: string }>(
		/* Cypher */ `
		MATCH (root) WHERE id(root) = $node
		WITH root

		MATCH (root)-[:INSTANCE_OF|EXTENDS|REF*0..]->()-[:SHOULD_IMPLEMENT_INTERFACE]->(interface:Interface)
		RETURN interface.name as interface
		`,
		ant.node_ids,
	);

	return resp;
}

export async function prototype_constraints(ant: Ant) {
	const response = await graph_query_on_nodes<{
		id: number;
		label: string;
		path: string;
		value_type: string;
		value: any;
		introspection: string[];
	}>(
		/* Cypher */ `
		MATCH (root) WHERE id(root) = $node
		WITH root

		MATCH (root)-[:INSTANCE_OF|EXTENDS|REF*0..]->()-[:SHOULD_INSTANTIATE]->(prototype)
		RETURN
			// collect(id(prototype)) as nodes,
			// prototype.name as path,
			// prototype.label as label
			id(prototype) as id,
			prototype.name as path,
			prototype.label as label,
			prototype.value_type as value_type,
			prototype.value as value
		`,
		ant.node_ids,
	);

	const nodes: (Node & { path: string })[] = response.map((elt) => ({
		id: elt.id,
		path: elt.path,
		own_label: elt.label,
		own_value: get_value_object(elt.value_type, elt.value),
		introspection: [],
	}));

	// Return the merge of the nodes with the same path

	let unique_nodes: { path: string; nodes: Node[] }[] = [];

	for (let element of nodes) {
		const existing = unique_nodes.find((r) => r.path === element.path);

		if (existing) {
			existing.nodes.push(element);
		} else {
			unique_nodes.push({
				path: element.path,
				nodes: [element],
			});
		}
	}

	return unique_nodes.map((model) => new Ant(model.nodes, model.path));

	// return nodes.map((node) => new Ant([node], node.path));
}

export async function superclass_constraints(ant: Ant) {
	const response = await graph_query_on_nodes<{
		id: number;
		label: string;
		path: string;
		value_type: string;
		value: any;
		introspection: string[];
	}>(
		`
		MATCH (root) WHERE id(root) = $node
		WITH root

		MATCH introspection = (root)-[:INSTANCE_OF|EXTENDS|REF*0..]->()-[:SHOULD_EXTEND]->(superclass)

		RETURN 	
			id(superclass) as id,
			superclass.name as path,
			superclass.label as label,
			superclass.value_type as value_type,
			superclass.value as value
		`,
		ant.node_ids,
	);

	const nodes: (Node & { path: string })[] = response.map((elt) => ({
		id: elt.id,
		path: elt.path,
		own_label: elt.label,
		own_value: get_value_object(elt.value_type, elt.value),
		introspection: [],
	}));

	return nodes.map((node) => new Ant([node], node.path));

	// return response.map((model) => new Ant(model.nodes, model.path, model.label));
}

export async function suggest_references(ant: Ant, query?: string) {
	const ref = await reference(ant);

	if (ref) {
		return [];
	}

	let pageranks = new Map<string, number>();

	const _pageranks = await graph_query<{
		label: string;
		score: number;
	}>(`CALL algo.pageRank(NULL, 'REF') YIELD node, score WHERE hasLabels(node, ['Model']) RETURN node.name as label, score`);

	console.log("PR1", _pageranks);

	for (let pagerank of _pageranks) {
		// console.log(pagerank.label, Math.log10(1 + pagerank.score));
		pageranks.set(pagerank.label, pagerank.score);

		console.log("PR", pagerank.label, pagerank.score);
	}

	// const current_interface_constraints = await interface_constraints(ant);

	const current_prototype_constraints = await prototype_constraints(ant);

	const current_superclass_constraints = await superclass_constraints(ant);

	let results = [];

	for (let constraint of current_prototype_constraints) {
		const suggestions = await it2_instances(constraint);

		results.push(...suggestions);
	}

	for (let constraint of current_superclass_constraints) {
		const suggestions = await it2_subclasses(constraint);

		results.push(...suggestions);
	}

	// if (query) {
	// 	// compute the embeddings for the labels of all the results

	// 	const embeddings = await Promise.all(results.map((r) => pipe(r.label)));

	// 	// compute the embeddings for the query

	// 	const query_embedding = await pipe(query);

	// 	// return the results sorted by the cosine similarity between the query and the label of the result

	// 	results = results.sort((a, b) => cos_sim(query_embedding, a) - cos_sim(query_embedding, b));

	// 	return results;
	// }

	return results
		.sort((a, b) => {
			if (!pageranks.get(a.path)) return 1;
			if (!pageranks.get(b.path)) return -1;

			return pageranks.get(b.path)! - pageranks.get(a.path)!;
		})
		.map((m) => ({
			model: m,
			score: pageranks.get(m.path),
		}));
}

export function get_value_object(value_type: string, value: any): Value | undefined {
	if (value_type === "string") {
		return { value_type: "string", value };
	} else if (value_type === "number") {
		return { value_type: "number", value };
	} else if (value_type === "boolean") {
		return { value_type: "boolean", value };
	} else if (value_type === "string_array") {
		return { value_type: "string_array", value };
	} else if (value_type === "number_array") {
		return { value_type: "number_array", value };
	} else if (value_type === "boolean_array") {
		return { value_type: "boolean_array", value };
	} else {
		return undefined;
	}
}
