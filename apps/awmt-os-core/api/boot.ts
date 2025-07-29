import { Chunk, Effect, Queue } from "effect";
import CATEGORY from "../native/feature_categories";
import { Ant } from "./Ant";

export interface RootModelDeclaration extends ModelDeclaration {
	path: string;
}

export interface ModelDeclaration {
	label?: string;
	description?: string;
	where?: { [key: string]: ModelDeclaration };
	has?: { [key: string]: ModelDeclaration };
	// is_a?: Array<string>;
	// should_be_a?: Array<string>;

	interface_constraints?: string[];
	prototype_constraints?: string[];
	superclass_constraints?: string[];

	features?: { name: string; with: ModelDeclaration }[];
	submodel_templates?: string[];
	submodel_templates_from_prototypes?: string[];
	ref?: RootModelDeclaration;
	string_value?: string;
	number_value?: number;
	boolean_value?: boolean;

	// string_array_value?: string[];
	// number_array_value?: number[];
	// boolean_array_value?: boolean[];

	extends?: Array<string>;
	instance_of?: Array<string>;

	set_of?: string;
	in_set?: string;
}

type Operation =
	| { op: "create_model"; name: string; label?: string; description?: string }
	| { path: string; op: "set_label"; label: string }
	| { path: string; op: "set_description"; description: string }
	| { path: string; op: "has_submodel"; submodel: string }
	| { path: string; op: "has_class"; class: string }
	// | { path: string; op: "should_be_a"; ref: string }
	| { path: string; op: "use_feature"; feature: string; as: string }
	| { path: string; op: "has_submodel_template"; template: string }
	| { path: string; op: "has_submodel_templates_from_prototypes"; template: string }
	| { path: string; op: "has_ref"; ref: string }
	| { path: string; op: "has_feature_prototype"; template: string; kind: CATEGORY; abstraction_depth_target: number }
	| { path: string; op: "has_provided_interface"; native_model: string; interface: string; abstraction_depth: number }
	| { path: string; op: "string_value"; value: string }
	| { path: string; op: "number_value"; value: number }
	| { path: string; op: "boolean_value"; value: boolean }
	| { path: string; op: "interface_constraint"; interface: string }
	| { path: string; op: "prototype_constraint"; prototype: string }
	| { path: string; op: "superclass_constraint"; superclass: string }
	| { path: string; op: "extends"; superclass: string }
	| { path: string; op: "instance_of"; prototype: string }
	| { path: string; op: "set_of"; template: string };
// | { path: string; op: "in_set"; set: string };

export class DeclarationQueue {
	constructor() {
		this.queue = Effect.runSync(Queue.unbounded<Operation>());
	}

	private queue: Queue.Queue<Operation>;

	push(operation: Operation) {
		const this_queue = this;

		// console.log("Pushing operation", operation);
		// console.trace()

		const push = Effect.gen(function* (_) {
			yield* _(this_queue.queue.offer(operation));

			Effect.logInfo("Pushed failed operation " + operation.op + " " + JSON.stringify(operation));
		});

		return Effect.runSync(push);
	}

	async poll_all(size: number, interval: number, callback?: (data: { pre_poll_size: number; polled: number; succeded: number; remaining: number; duration: number; has_more: boolean }) => void) {
		const that = this;

		const proxy_push = (operation: Operation) =>
			Effect.gen(function* (_) {
				// yield* _(Effect.logInfo("Proxy push"));
				yield* _(that.queue.offer(operation));
			});

		const poll = Effect.gen(function* (_) {
			const total_size = yield* _(that.queue.size);

			const take = yield* _(Queue.takeUpTo(that.queue, size));

			const tasks = Chunk.toReadonlyArray(take).map((operation) => {
				// console.log(operation)

				switch (operation.op) {
					case "create_model":
						return create_model(operation);
					case "set_label":
						return set_label(operation);
					case "set_description":
						return set_description(operation);
					case "has_submodel":
						return has_submodel(operation);
					case "has_class":
						return has_class(operation);
					case "has_submodel_template":
						return has_submodel_template(operation);
					case "has_submodel_templates_from_prototypes":
						return has_submodel_templates_from_prototypes(operation);
					case "has_ref":
						return has_ref(operation);
					case "has_feature_prototype":
						return has_feature_prototype(operation);
					case "has_provided_interface":
						return has_provided_interface(operation);
					case "use_feature":
						return use_feature(operation);
					case "string_value":
						return set_string_value(operation);
					case "number_value":
						return set_number_value(operation);
					case "boolean_value":
						return set_boolean_value(operation);
					case "interface_constraint":
						return interface_constraint(operation);
					case "prototype_constraint":
						return prototype_constraint(operation);
					case "superclass_constraint":
						return superclass_constraint(operation);
					case "extends":
						return add_superclass(operation);
					case "instance_of":
						return add_prototype(operation);
					case "set_of":
						return set_of(operation);
					// case "in_set":
					// 	return in_set(operation);
				}
			});

			const start_time = new Date().getTime();

			const result = yield* _(Effect.all(tasks));
			// const result = yield* _(Effect.retry(Effect.all(tasks), Schedule.exponential(1000)));

			// console.log("Result", result.length, result.filter((r) => !r.success).length);

			for (let r of result) {
				if (!r.success) {
					// console.log("Error", r.error);

					yield* _(proxy_push(r.operation as unknown as Operation));
				}
			}

			const remaining = yield* _(that.queue.size);

			const succeded = result.filter((r) => r.success).length;

			// yield* _(
			// 	Effect.logInfo({
			// 		pre_poll_size: total_size,
			// 		polled: take.length,
			// 		succeded: succeded,
			// 		remaining: remaining,
			// 		duration: new Date().getTime() - start_time,
			// 		has_more: remaining > 0,
			// 	}),
			// );

			const output = {
				pre_poll_size: total_size,
				polled: take.length,
				succeded: succeded,
				remaining: remaining,
				duration: new Date().getTime() - start_time,
				has_more: remaining > 0,
			};

			if (callback) callback(output);

			return output;
		});

		const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

		let result = await Effect.runPromise(poll);

		await wait(10 * interval);

		while (result.has_more) {
			result = await Effect.runPromise(poll);

			await wait(interval);
		}

		return result;
	}
}

function create_model(operation: { name: string; label?: string; description?: string }) {
	const { name, label, description } = operation;

	// console.log("Creating model", name);

	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.assert(name));

		if (label) {
			yield* _(ant.set_label(label));
		}

		if (description) {
			yield* _(ant.set_description(description));
		}

		return { success: true, operation };
	});
}

function set_label(operation: { path: string; label: string }) {
	const { path, label } = operation;
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.assert(path));

		if (!ant) {
			return { success: false, operation };
		}

		const mutable = yield* _(ant.mutable());

		yield* _(mutable.set_label(label));

		return { success: true, operation };
	});
}

function set_description(operation: { path: string; description: string }) {
	const { path, description } = operation;

	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.assert(path));

		if (!ant) {
			return { success: false, operation };
		}

		const mutable = yield* _(ant.mutable());

		if (description) {
			yield* _(mutable.set_description(description));
		}

		return { success: true, operation };
	});
}

function has_submodel(operation: { path: string; submodel: string }) {
	const { path, submodel } = operation;
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.assert(path));

		if (!ant) {
			return { success: false, operation };
		}

		const mutable = yield* _(ant.mutable());

		yield* _(mutable.create_submodel(submodel));

		return { success: true, operation };
	});
}

function has_class(operation: { path: string; class: string }) {
	const { path, class: class_name } = operation;
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			return { success: false, operation };
		}
		const mutable = yield* _(ant.mutable());

		yield* _(mutable.set_classes([class_name]));

		return { success: true, operation };
	});
}

function has_submodel_template(operation: { path: string; template: string }) {
	const { path, template } = operation;
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			yield* _(Effect.logInfo("Path not found in has_submodel_template " + path));
			return { success: false, operation };
		}
		const mutable = yield* _(ant.mutable());

		yield* _(mutable.create_submodel_template(template));

		return { success: true, operation };
	});
}

function has_submodel_templates_from_prototypes(operation: { path: string; template: string }) {
	const { path, template } = operation;
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			yield* _(Effect.logInfo("Path not found in has_submodel_templates_from_prototypes " + path));
			return { success: false, operation };
		}
		const mutable = yield* _(ant.mutable());

		yield* _(mutable.create_submodel_template_from_prototype(template));

		return { success: true, operation };
	});
}

function has_ref(operation: { path: string; ref: string }) {
	const { path, ref } = operation;
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			yield* _(Effect.logInfo("Path not found in has_feature_prototype " + path));
			return { success: false, operation };
		}
		const mutable = yield* _(ant.mutable());

		yield* _(mutable.set_reference(ref));

		return { success: true, operation };
	});
}

// function should_be_a(operation: { path: string; ref: string }) {
// 	const { path, ref } = operation;
// 	return Effect.gen(function* (_) {
// 		const ant = yield* _(Ant.from_path(path));

// 		if (!ant) {
// 			yield* _(Effect.logInfo("Path not found"));
// 			return { success: false, operation };
// 		}
// 		const mutable = yield* _(ant.mutable());

// 		yield* _(mutable.should_be_a(ref));

// 		return { success: true, operation };
// 	});
// }

function has_feature_prototype(operation: { path: string; template: string; kind: CATEGORY; abstraction_depth_target: number }) {
	const { path, template, kind, abstraction_depth_target } = operation;
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			yield* _(Effect.logInfo("Path not found in has_feature_prototype " + path));
			return { success: false, operation };
		}
		const mutable = yield* _(ant.mutable());

		const current_feature_prototype_paths = (yield* _(mutable.feature_prototypes(kind))).map((f) => f.model.path);

		if (!current_feature_prototype_paths.includes(template)) {
			yield* _(mutable.create_feature_prototype(template, kind, abstraction_depth_target));
			// yield* _(Effect.logInfo("Creating fp " + path + " " + template + " " + kind));
		}

		// yield* _(mutable.create_feature_prototype(template, kind));

		return { success: true, operation };
	});
}

function use_feature(operation: { path: string; feature: string; as: string }) {
	const { path, feature, as } = operation;
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			yield* _(Effect.logInfo("Path not found in set_string_value " + path));
			return { success: false, operation };
		}
		const mutable = yield* _(ant.mutable());

		const current_feature_paths = (yield* _(mutable.features())).map((f) => f.model.path);

		if (!current_feature_paths.includes(as)) {
			yield* _(mutable.use_feature_prototype(feature, as));
		}

		return { success: true, operation };
	});
}

function set_string_value(operation: { path: string; value: string }) {
	const { path, value } = operation;
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			yield* _(Effect.logInfo("Path not found in set_string_value " + path));
			return { success: false, operation };
		}
		const mutable = yield* _(ant.mutable());

		yield* _(mutable.set_class("string"));
		yield* _(ant.set_string_value(value));

		return { success: true, operation };
	});
}

function set_number_value(operation: { path: string; value: number }) {
	const { path, value } = operation;
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			yield* _(Effect.logInfo("Path not found in set_boolean_value " + path));
			return { success: false, operation };
		}
		const mutable = yield* _(ant.mutable());

		yield* _(mutable.set_class("number"));
		yield* _(ant.set_number_value(value));

		return { success: true, operation };
	});
}

function set_boolean_value(operation: { path: string; value: boolean }) {
	const { path, value } = operation;
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			yield* _(Effect.logInfo("Path not found in set_number_value " + path));
			return { success: false, operation };
		}
		const mutable = yield* _(ant.mutable());

		yield* _(mutable.set_class("boolean"));
		yield* _(ant.set_boolean_value(value));

		return { success: true, operation };
	});
}

function has_provided_interface(operation: { path: string; interface: string; abstraction_depth: number }) {
	const { path, interface: interf, abstraction_depth } = operation;
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			yield* _(Effect.logInfo("Path not found in has_provided_interface " + path));
			return { success: false, operation };
		}

		const mutable = yield* _(ant.mutable());

		yield* _(mutable.provide_interface(interf, abstraction_depth));

		return { success: true, operation };
	});
}

function interface_constraint(operation: { path: string; interface: string }) {
	const { path, interface: interf } = operation;
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			yield* _(Effect.logInfo("Path not found in interface_constraint " + path));
			return { success: false, operation };
		}

		const mutable = yield* _(ant.mutable());

		yield* _(mutable.add_interface_constraint(interf));

		return { success: true, operation };
	});
}

function prototype_constraint(operation: { path: string; prototype: string }) {
	const { path, prototype } = operation;

	// console.log("should have prototype", path, prototype);
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			// yield* _(Effect.logInfo("Path not found"));
			return { success: false, operation };
		}

		const mutable = yield* _(ant.mutable());

		yield* _(mutable.add_prototype_constraint(prototype, false));

		return { success: true, operation };
	});
}

function superclass_constraint(operation: { path: string; superclass: string }) {
	const { path, superclass } = operation;

	// console.log("should have superclass", path, superclass);
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			// yield* _(Effect.logInfo("Path not found"));
			return { success: false, operation };
		}

		const mutable = yield* _(ant.mutable());

		yield* _(mutable.add_superclass_constraint(superclass));

		return { success: true, operation };
	});
}

function add_superclass(operation: { path: string; superclass: string }) {
	const { path, superclass } = operation;

	// console.log("add superclass", path, superclass);
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			yield* _(Effect.logInfo("Path not found in add_superclass " + path));
			return { success: false, operation };
		}

		const sup = yield* _(Ant.assert(superclass));

		if (!sup) {
			yield* _(Effect.logInfo("Superclass not found " + superclass));
			return { success: false, operation };
		}

		const mutable = yield* _(ant.mutable());

		yield* _(mutable.add_superclass(superclass));

		return { success: true, operation };
	});
}

function add_prototype(operation: { path: string; prototype: string }) {
	const { path, prototype } = operation;
	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			// yield* _(Effect.logInfo("Prototype path not found"));
			return { success: false, operation };
		}

		const mutable = yield* _(ant.mutable());

		const res = yield* _(mutable.add_prototype(prototype));

		if (!res) {
			// yield* _(Effect.logInfo("Prototype does not exist : " + prototype));
			return { success: false, operation };
		}

		// yield* _(Effect.logInfo("Added prototype " + prototype + " to " + path));

		return { success: true, operation };
	});
}

function set_of(operation: { path: string; template: string }) {
	const { path, template } = operation;

	return Effect.gen(function* (_) {
		const ant = yield* _(Ant.from_path(path));

		if (!ant) {
			yield* _(Effect.logInfo("Path not found in set_of " + path));
			return { success: false, operation };
		}

		const mutable = yield* _(ant.mutable());
		yield* _(mutable.set_class("set"));

		const current_feature_paths = (yield* _(mutable.features(CATEGORY.SET_TEMPLATE))).map((f) => f.model.path);

		if (!current_feature_paths.length) {
			yield* _(mutable.use_existing_feature(template, CATEGORY.SET_TEMPLATE));
		}

		console.log("Set of", path, template);

		return { success: true, operation };
	});
}

// function in_set(operation: { path: string; set: string }) {
// 	const { path, set } = operation;
// 	// console.log("in set", path, set);

// 	return Effect.gen(function* (_) {
// 		const ant = yield* _(Ant.from_path(set));

// 		if (!ant) {
// 			// yield* _(Effect.logInfo("Path not found (in set)"));
// 			return { success: false, operation };
// 		}

// 		// yield* _(Effect.logInfo("Path found"));

// 		const mutable = yield* _(ant.mutable());
// 		yield* _(mutable.set_class("set"));

// 		const set_ant = yield* _(ant.as_set());

// 		const element = yield* _(Ant.assert(path));

// 		yield* _(set_ant.push(element));

// 		return { success: true, operation };
// 	});
// }

export const boot_queue = new DeclarationQueue();

let queue_max = 0;

let bar: any;

import cliProgress from "cli-progress";
import { graph_query } from "./graph";

export async function load_boot_queue() {
	// await graph_query(`MATCH (n) DETACH DELETE n`, {});

	// console.log("Emptied database");

	try {
		await graph_query(`CREATE INDEX FOR (n:Model) ON (n.name)`, {});
		await graph_query(`CREATE VECTOR INDEX FOR (p:Model) ON (p.vect) OPTIONS { dimension: 128, similarityFunction: 'euclidean' }`, {});
	} catch (error) {}

	boot_queue.poll_all(5, 1, (data) => {
		// console.log(data);

		if (data.pre_poll_size > queue_max) {
			queue_max = data.pre_poll_size;
			bar = new cliProgress.SingleBar(
				{
					clearOnComplete: false,
					hideCursor: true,
					format: " {bar} | Native models creation | {value}/{total}",
				},
				cliProgress.Presets.shades_classic,
			);
			bar.start(queue_max, queue_max - data.pre_poll_size);
		}

		if (!bar) return;

		bar.update(queue_max - data.pre_poll_size);

		if (!data.has_more) {
			bar.update(queue_max);
		}
	});
}
// setTimeout(() => boot_queue.poll_all(30, 200, (data) => !data.has_more && console.log(`Boot import finished ${data.succeded} / ${data.total_size}`)), 200);
// ))))))))
