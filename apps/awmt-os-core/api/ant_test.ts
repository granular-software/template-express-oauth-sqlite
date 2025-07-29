const program = Effect.gen(function* (_) {
	const start_time = new Date();

	const model = yield* _(Ant.from_path("string"));

	yield* _(Effect.logInfo("got model " + (new Date().getTime() - start_time.getTime())));

	const fields = [model.classes(), model.instances(), model.at("my_submodel")];

	const [classes, instances, at] = yield* _(Effect.all(fields, { concurrency: "unbounded" }));

	yield* _(Effect.logInfo("got subs " + (new Date().getTime() - start_time.getTime())));

	yield* _(Effect.logInfo(classes));
	yield* _(Effect.logInfo(instances));
	yield* _(Effect.logInfo(at));

	yield* _(Effect.logInfo("end " + (new Date().getTime() - start_time.getTime())));
});

// Effect.runPromise(program);

import { Effect, Queue } from "effect";
import { Ant } from "./Ant";

// Creating a bounded queue with a capacity of 100
const queue = Effect.runSync(Queue.bounded<number>(100));

// setTimeout(() => {
// 	const program = Effect.gen(function* (_) {
// 		// const str = yield* _(Ant.assert("string"));

// 		// const ant = yield* _(Ant.assert("arthur"));
// 		// const mutable = yield* _(ant.mutable());

// 		// const new_mutable = yield* _(mutable.create_submodel("name"));

// 		// const new_new_mutable = yield* _(new_mutable.set_class("string"));

// 		// return new_mutable;

// 		// const model = yield* _(Ant.assert("new_queue"));

// 		// const m = yield* _(model.mutable());

// 		// yield* _(m.set_class("queue"));

// 		yield* _(
// 			Ant.create_model("test123456789", "test123", {
// 				has: {
// 					test: {
// 						is_a: ["string"],
// 					},
// 					test2: {
// 						is_a: ["string"],
// 					},
// 				},
// 			}),
// 		);

// 		const queue = yield* _(
// 			Ant.assert("other_new_queue").pipe(
// 				Effect.flatMap((ant) => ant.mutable()),
// 				Effect.flatMap((ant) => ant.set_class("queue")),
// 				Effect.flatMap((ant) => ant.as_queue()),
// 			),
// 		);

// 		const size_1 = yield* _(queue.size());

// 		yield* _(Effect.logInfo("size1 : " + size_1));

// 		yield* _(queue.create_element());

// 		const size_2 = yield* _(queue.size());

// 		yield* _(Effect.logInfo("size2 : " + size_2));

// 		yield* _(queue.create_element());
// 		yield* _(queue.create_element());
// 		yield* _(queue.create_element());
// 		yield* _(queue.create_element());
// 		yield* _(queue.create_element());
// 		yield* _(queue.create_element());
// 		yield* _(queue.create_element());
// 		yield* _(queue.create_element());
// 		yield* _(queue.create_element());
// 		yield* _(queue.create_element());
// 		yield* _(queue.create_element());

// 		const size_3 = yield* _(queue.size());

// 		yield* _(Effect.logInfo("size3 : " + size_3));

// 		// const peek_ten = yield* _(queue.peek_up_to_n(200));

// 		// for (const element of peek_ten) {
// 		// 	const element_classes = yield* _(element.classes());
// 		// 	yield* _(Effect.logInfo("element : " + element.path + " " + JSON.stringify(element_classes.map((cl) => cl.path))));
// 		// }

// 		// yield* _(queue.try_next());
// 	});

// 	// Effect.runPromise(program);
// 	// .then(console.log).catch(console.error);
// }, 4000);
