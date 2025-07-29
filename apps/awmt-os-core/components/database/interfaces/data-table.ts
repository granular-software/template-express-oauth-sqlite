import { Context, Effect } from "effect";
import graph_interface, { handler } from "../../../native/graph_interface";
import { Ant } from "../../../native/tags";

export interface DataTable {
	readonly _todo: (ant: Ant) => Effect.Effect<Ant, unknown, boolean>;
	readonly _todo_mutation: (ant: Ant, value: boolean) => Effect.Effect<Ant, unknown, boolean>;
}

export const DataTable = Context.Tag<DataTable>("DataTable");

export const Schema = graph_interface(DataTable)
	.schema(
		/* GraphQL */ `
			type DataTable {
				_todo: Boolean
			}
		`,
		/* GraphQL */ `
			type DataTableMutation {
				_todo_mutation(value: Boolean!): Boolean
			}
		`,
	)
	.query("_todo", async (ant: Ant) => {
		const get_value = await handler(ant, DataTable, "_todo");
		return Effect.runPromise(await get_value(ant));
	})
	.mutation("_todo_mutation", async (ant: Ant, args: { value: boolean }) => {
		const set_value = await handler(ant, DataTable, "_todo_mutation");
		return Effect.runPromise(await set_value(ant, args.value));
	})
	.build(); 