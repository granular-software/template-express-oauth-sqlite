import { expect, test } from "bun:test";
import { Ant } from "./Ant";
import { Effect } from "effect";
import clean_name from "../utils/clean_name";

test("Ant model creation", async () => {
	const random_name = clean_name();

	const ant = await Ant.create_model(random_name);

	const program = await ant.pipe(Effect.map((ant) => ant.path));

	const result = await Effect.runPromise(program);

	expect(result).toBe(random_name);
});
