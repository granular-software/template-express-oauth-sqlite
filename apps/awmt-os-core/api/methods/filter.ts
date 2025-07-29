import { StringFilter, NumberFilter, BooleanFilter, DateFilter, ReferenceFilter } from "..";
import { InstanceSortInput, InstanceWhereInput } from "../filter";

export function get_filter_rows(string_filters?: StringFilter[], number_filters?: NumberFilter[], boolean_filters?: BooleanFilter[], date_filters?: DateFilter[], reference_filters?: ReferenceFilter[]): string {
	let filter_rows = "";

	const get_path = `
		MATCH sibl = (model)-[:INSTANCE_OF|EXTENDS|REF*0..]->(sbl)

		MATCH sibl2 = (sbl)-[ref:WHERE_THE]->(sbl2)

		MATCH sibl3 = (sbl2)-[:INSTANCE_OF|EXTENDS|REF*0..]->(last_node:Value)
	`;

	const at_position = (at: string) => `AND last_node.name = '${at}'`;

	for (let filter of string_filters || []) {
		if (filter.contains) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value CONTAINS '${filter.contains}'
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as contains
				}
				MATCH (model) WHERE contains = true
			`;
		}

		if (filter.ends_with) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value ENDS WITH '${filter.ends_with}'
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as ends_with
				}
				MATCH (model) WHERE ends_with = true
			`;
		}

		if (filter.equal_to) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value = '${filter.equal_to}'
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as equal_to
				}
				MATCH (model) WHERE equal_to = true
			`;
		}

		if (filter.length_greater_than) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE size(last_node.value) > ${filter.length_greater_than}
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as length_greater_than
				}
				MATCH (model) WHERE length_greater_than = true
			`;
		}

		if (filter.length_less_than) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE size(last_node.value) < ${filter.length_less_than}
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as length_less_than
				}
				MATCH (model) WHERE length_less_than = true
			`;
		}

		if (filter.not_contains) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE NOT last_node.value CONTAINS '${filter.not_contains}'
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as not_contains
				}
				MATCH (model) WHERE not_contains = true
			`;
		}

		if (filter.not_null) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value IS NOT NULL
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as not_null
				}
				MATCH (model) WHERE not_null = true
			`;
		}

		if (filter.starts_with) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value STARTS WITH '${filter.starts_with}'
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as starts_with
				}
				MATCH (model) WHERE starts_with = true
			`;
		}
	}

	for (let filter of number_filters || []) {
		if (filter.equal_to) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value = ${filter.equal_to}
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as equal_to
				}
				MATCH (model) WHERE equal_to = true
			`;
		}

		if (filter.greater_than) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value > ${filter.greater_than}
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as greater_than
				}
				MATCH (model) WHERE greater_than = true
			`;
		}

		if (filter.less_than) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value < ${filter.less_than}
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as less_than
				}
				MATCH (model) WHERE less_than = true
			`;
		}

		if (filter.not_null) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value IS NOT NULL
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as not_null
				}
				MATCH (model) WHERE not_null = true
			`;
		}
	}

	for (let filter of boolean_filters || []) {
		if (filter.equal_to) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value = ${filter.equal_to}
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as equal_to
				}
				MATCH (model) WHERE equal_to = true
			`;
		}

		if (filter.not_null) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value IS NOT NULL
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as not_null
				}
				MATCH (model) WHERE not_null = true
			`;
		}

		if (filter.null) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value IS NULL
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as null
				}
				MATCH (model) WHERE null = true
			`;
		}
	}

	for (let filter of date_filters || []) {
		if (filter.after_date) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value > ${filter.after_date}
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as after_date
				}
				MATCH (model) WHERE after_date = true
			`;
		}

		if (filter.before_date) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value < ${filter.before_date}
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as before_date
				}
				MATCH (model) WHERE before_date = true
			`;
		}

		if (filter.newer_than_seconds) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value > ${filter.newer_than_seconds}
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as newer_than_seconds
				}
				MATCH (model) WHERE newer_than_seconds = true
			`;
		}

		if (filter.older_than_seconds) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value < ${filter.older_than_seconds}
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as older_than_seconds
				}
				MATCH (model) WHERE older_than_seconds = true
			`;
		}

		if (filter.not_null) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value IS NOT NULL
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as not_null
				}
				MATCH (model) WHERE not_null = true
			`;
		}

		if (filter.null) {
			filter_rows += `
				CALL {
					with model
					${get_path}
					WHERE last_node.value IS NULL
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as null
				}
				MATCH (model) WHERE null = true
			`;
		}
	}

	for (let filter of reference_filters || []) {
		if (filter.is) {
			filter_rows += `
				CALL {
					with model
					MATCH (model)-[:INSTANCE_OF|EXTENDS|REF*0..]->(last_node)-[:REF]->(target:Model)
					WHERE target.name = ${filter.is}
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as is

				}
				MATCH (model) WHERE is = true
			`;
		}

		if (filter.not_null) {
			filter_rows += `
				CALL {
					with model
					MATCH (model)-[:INSTANCE_OF|EXTENDS|REF*0..]->(last_node)-[:REF]->(target:Model)
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as not_null
				}
				MATCH (model) WHERE not_null = true
			`;
		}

		if (filter.null) {
			filter_rows += `
				CALL {
					with model
					MATCH (model)-[:INSTANCE_OF|EXTENDS|REF*0..]->(last_node)
					WHERE NOT EXISTS((last_node)-[:REF]->(:Model))
					${at_position(filter.at)}
					RETURN count(last_node) > 0 as null
				}
				MATCH (model) WHERE null = true
			`;
		}
	}

	console.log(filter_rows);	

	return filter_rows;
}

export function get_sort_rows(sort?: InstanceSortInput) {
	let sort_rows = "";

	let sort_filter = "";

	if (sort) {
		if (sort.by) {
			sort_rows += `
            
                CALL {
                    with model
                    MATCH subpath = (model)-[ref:INSTANCE_OF|EXTENDS|REF|WHERE_THE*0..]->(last_node:Value)
                    
                    WHERE size([n in relationships(subpath) WHERE type(n) = 'WHERE_THE']) = 1  
                    AND last_node.name = '${sort.by}'
                    RETURN last_node.value as sort_by
                }
            `;

			sort_filter = `ORDER BY sort_by ${sort.direction === "DESC" ? "DESC" : "ASC"}`;
		}
	}

	// console.log(sort_rows);

	return {
		query: sort_rows,
		filter: sort_filter,
	};
}
