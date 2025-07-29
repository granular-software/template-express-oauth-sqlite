import { Ant, StandaloneObjectAnt } from "../Ant";
import { graph_query } from "../graph";
import { get_mutable_path_end } from "./utils";

export const get_primary_key = async (standalone: StandaloneObjectAnt) => {
	const mutable_path_end = await get_mutable_path_end(standalone);

	const objects = await graph_query<{ primary_key: string }>(
		`
            MATCH (target) WHERE id(target) = $target_id WITH target
            RETURN DISTINCT target.primary_key as primary_key
        `,
		{
			target_id: mutable_path_end,
		},
	);

	return objects[0].primary_key;
};

export const set_primary_key = async (standalone: StandaloneObjectAnt, primary_key: string, class_name: string) => {
	const mutable_path_end = await get_mutable_path_end(standalone);

	await graph_query<{ id: number }>(
		`
			MATCH (target) WHERE id(target) = $target_id WITH target
			SET target.primary_key = $primary_key
            SET target.class_name = $class_name

			RETURN id(target) as id
		`,
		{
			target_id: mutable_path_end,
			class_name: class_name,
			primary_key: primary_key,
		},
	);

	return standalone;
};

export const find_by_primary_key = async (class_name: string, primary_key: string) => {
	const objects = await graph_query<{
		id: number;

		label: string;
		class_name: string;
		primary_key: string;
		path: string;
	}>(
		`
            MATCH (target) WHERE target.primary_key = $primary_key AND target.class_name = $class_name
            RETURN 
                DISTINCT id(target) as id, 
                target.label as label,
                target.class_name as class_name,
                target.primary_key as primary_key,
                target.name as path
        `,
		{
			primary_key: primary_key,
			class_name: class_name,
		},
	);

	if (objects.length == 0) return undefined;

	const ant = objects[0];

	return new StandaloneObjectAnt([ant.id], ant.path, ant.label);
};
