import { Effect } from "effect";
import { native_model } from "../../native/native_model";
import CATEGORY from "../../native/feature_categories";

import { Set } from "./interfaces/set";
import { Ant } from "../../native/tags";

const set = new native_model("set").with({});

set.implement_interface(Set).provide({
	size: () =>
		Effect.gen(function* (_) {
			const ant = yield* _(Ant);
			const set = yield* _(ant.as_set());
			const size = yield* _(set.size());
			return size;
		}),

	create_element: () =>
		Effect.gen(function* (_) {
			const ant = yield* _(Ant);
			const mutable = yield* _(ant.mutable());
			const set = yield* _(mutable.as_set());

			const element = yield* _(set.create_element());

			return element;
		}),

	get_n: (ant: Ant, n: number) =>
		Effect.gen(function* (_) {
			const ant = yield* _(Ant);
			const set = yield* _(ant.as_set());

			const elements = yield* _(set.get_n(n));

			return elements;
		}),
});
