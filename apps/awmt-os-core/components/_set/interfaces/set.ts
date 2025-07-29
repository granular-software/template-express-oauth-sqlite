import { Context, Effect } from "effect";
import graph_interface, { handler } from "../../../native/graph_interface";
import { Ant } from "../../../native/tags";

export interface Set {
	readonly size: (ant: Ant) => Effect.Effect<Ant, unknown, number>;
	readonly create_element: (ant: Ant) => Effect.Effect<Ant, unknown, Ant>;
	readonly get_n: (ant: Ant, n: number) => Effect.Effect<Ant, unknown, Ant[]>;
}

export const Set = Context.Tag<Set>("Set");

export const Schema = graph_interface(Set)
	.schema(
		/* GraphQL */ `
			type Set {
				size: Int!
				get_n(first_n: Int): [Model]
			}
		`,
		/* GraphQL */ `
			type SetMutation {
				create_element: Model!
			}
		`,
	)
	.query("size", async (ant: Ant) => {
		const size = await handler(ant, Set, "size");
		return Effect.runPromise(await size());
	})

	.query("get_n", async (ant: Ant, { first_n }: { first_n: number }) => {
		const get_n = await handler(ant, Set, "get_n");
		return Effect.runPromise(await get_n(first_n || 1));
	})

	.mutation("create_element", async (ant: Ant) => {
		const create_element = await handler(ant, Set, "create_element");
		return Effect.runPromise(await create_element());
	})
	.build();
