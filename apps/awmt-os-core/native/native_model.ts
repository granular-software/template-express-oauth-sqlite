import { Context, Effect, pipe } from "effect";
import { Ant as AntClass } from "../api/Ant";
import { ModelDeclaration, boot_queue } from "../api/boot";
import handle_declaration from "../api/declaration";
import { implement_interface } from "../api/interfaces";
import CATEGORY from "../native/feature_categories";
import EVENT from "./events";
import { Ant, TargetAnt } from "./tags";

export const native_models = new Map<string, native_model>();

export function PartialInterface<T, U extends Partial<T>>(interf: Context.Tag<T, T>, service: U & Record<Exclude<keyof U, keyof T>, never>) {
	return service as U;
}

export function HandlerInterface<T, K extends keyof T>(interf: Context.Tag<T, T>, method: K, handler: T[K]) {
	return handler;
}

export class ModelInterface<T> {
	constructor(model: native_model, interf: Context.Tag<T, T>) {
		this.model = model;
		this.interface = interf;

		this.name = interf.identifier as string;

		implement_interface(this);

		const effect = Effect.gen(function* (_) {
			yield _(Ant);
			yield _(interf);
		});

		this.unprovided_effect = effect;

		return this;
	}

	readonly model: native_model;
	readonly name: string;
	readonly interface: Context.Tag<T, T>;
	readonly unprovided_effect: Effect.Effect<T | Ant, unknown, void>;
	public effect: Effect.Effect<Exclude<T, T> | Exclude<Ant, T>, unknown, T> | undefined;

	describe(this: ModelInterface<T>, name: keyof T & string, description: string) {
		return this;
	}

	provide(this: ModelInterface<T>, service: T) {
		const unprovided_effect = this.unprovided_effect;
		const interf = this.interface;

		this.effect = Effect.flatten(
			Effect.gen(function* (_) {
				yield* _(unprovided_effect);

				const _interface = yield* _(interf);

				return Effect.succeed(_interface);
			}),
		).pipe(Effect.provideService(this.interface, this.interface.of(service)));

		return this;
	}
}

export class EventHandler {
	constructor(event: EVENT, handler: (ant: Ant) => void) {
		this.event = event;
		this.handler = handler;
	}

	readonly event: EVENT;
	readonly handler: (ant: Ant) => void;
}

const native_models_map = new Map<string, native_model>();

export class native_model {
	constructor(name: string, label?: string, description?: string) {
		if (native_models_map.has(name)) {
			console.error(`Model ${name} already exists, using existing model`);
			// console.trace();
			// throw `Model ${name} already exists`;
		}

		native_models_map.set(name, this);

		// console.log("Creating model " + name);
		native_models.set(name, this);

		boot_queue.push({
			op: "create_model",
			name,
			label,
			description,
		});

		this.model_name = name;

		if (label) {
			this.label(label);

			// boot_queue.push({
			// 	op: "set_label",
			// 	path: name,
			// 	label,
			// });
		}

		if (description) {
			this.description(description);
		}

		// if (feature_of) this.feature_of = feature_of;

		return this;
	}

	readonly model_name: string;
	readonly feature_of: native_model | undefined;
	readonly interfaces: ModelInterface<any>[] = [];

	readonly features: native_model[] = [];

	readonly events: EventHandler[] = [];

	static path(name: string) {
		return new native_model(name);
	}

	get name() {
		return this.model_name;
	}

	readonly ant = async () => Effect.provideService(Ant, Ant.of(await this.get_ant()));

	// static find(name: string) {
	// 	return models.get(name);
	// }

	static assert(name: string) {
		return native_models.get(name) || new native_model(name);
	}

	protected declare(path: string, declaration: ModelDeclaration) {
		handle_declaration(boot_queue, path, declaration);
	}

	extends(this: native_model, superclass: native_model | string) {
		if (superclass instanceof native_model) superclass = superclass.model_name;

		handle_declaration(boot_queue, this.model_name, {
			extends: [superclass],
		});
	}

	extend_as(this: native_model, superclass: string) {
		return new native_model(superclass).with({
			extends: [this.model_name],
		});
	}

	instanciate_as(this: native_model, instance_name: string, label?: string) {
		return new native_model(instance_name).with({
			instance_of: [this.model_name],
			label,
		});
	}

	label(this: native_model, label: string) {
		this.declare(this.model_name, {
			label,
		});

		return this;
	}

	description(this: native_model, description: string) {
		if (description) {
			this.declare(this.model_name, {
				description,
			});
		}

		return this;
	}

	with(declaration: ModelDeclaration) {
		this.declare(this.model_name, declaration);
		return this;
	}

	where(declaration: ModelDeclaration["where"]) {
		this.declare(this.model_name, {
			has: declaration,
		});

		return this;
	}

	has(declaration: ModelDeclaration["has"]) {
		this.declare(this.model_name, {
			has: declaration,
		});

		return this;
	}

	feature(this: native_model, feature: native_model, kind: CATEGORY, abstraction_depth_target: number = 1): native_model {
		this.features.push(feature);

		boot_queue.push({
			path: this.model_name,
			op: "has_feature_prototype",
			template: feature.model_name,
			kind,
			abstraction_depth_target,
		});

		return this;
	}

	abstract_feature(this: native_model, feature: native_model, kind: CATEGORY): native_model {
		this.features.push(feature);

		boot_queue.push({
			path: this.model_name,
			op: "has_feature_prototype",
			template: feature.model_name,
			kind,
			abstraction_depth_target: 0,
		});

		return this;
	}

	implement_interface<T>(this: native_model, interf: Context.Tag<T, T>) {
		if(this.model_name === "desktop") console.info(`Registering interface on ${this.model_name} (tag: ${interf.identifier})`);

		const new_interface = new ModelInterface(this, interf);

		this.interfaces.push(new_interface);

		// console.log("INTERFACTES", this.model_name, this.interfaces.map(i => i.name))

		boot_queue.push({
			path: this.model_name,
			op: "has_provided_interface",
			native_model: this.model_name,
			interface: interf.identifier as string,
			abstraction_depth: 1,
		});

		return new_interface;
	}

	instances_implement_interface<T>(this: native_model, interf: Context.Tag<T, T>) {
		if(this.model_name === "desktop") console.info(`Registering interface on ${this.model_name} (tag: ${interf.identifier})`);

		const new_interface = new ModelInterface(this, interf);

		this.interfaces.push(new_interface);

		// console.log("INTERFACTES", this.model_name, this.interfaces.map(i => i.name))

		boot_queue.push({
			path: this.model_name,
			op: "has_provided_interface",
			native_model: this.model_name,
			interface: interf.identifier as string,
			abstraction_depth: 2,
		});

		return new_interface;
	}

	find_interface<T>(this: native_model, interf: Context.Tag<T, T>): ModelInterface<T> | null {
		const interf_name = interf.identifier as string;

		for (let _interface of this.interfaces) {
			if (_interface.name === interf_name) {
				return _interface;
			}
		}

		return null;
	}

	find_interface_by_name<T>(this: native_model, name: string): ModelInterface<T> | undefined {

		// console.log("Find_interface_by_name", name, this.model_name, this.interfaces.map(i => i.name))

		for (let _interface of this.interfaces) {
			if (_interface.name === name) {
				return _interface;
			}
		}

		return undefined;
	}

	find_event_handler(event: EVENT) {
		for (let handler of this.events) {
			if (handler.event === event) return handler;
		}

		return undefined;
	}

	async get_ant(this: native_model) {
		const _model = this;

		const obj = await AntClass.object_from_path(_model.model_name);

		if (!obj) throw "Object not found";

		// console.log("Getting ant", this.interfaces);

		return obj.with_interfaces(this.interfaces);

		// return (await Effect.runPromise(AntClass.from_path(_model.model_name))).with_interfaces(this.interfaces);
	}

	async handler<T, K extends keyof T>(this: native_model, interf: Context.Tag<T, T>, method: K) {
		const _interface = this.find_interface<T>(interf);

		if (!_interface) throw `Interface ${interf.identifier} not found on ${this.model_name}`;

		if (!_interface.effect) throw "Effect not found";

		const ant = await this.get_ant();

		const runnable = _interface.effect.pipe(Effect.provideService(Ant, Ant.of(ant)));

		const service = pipe(runnable, Effect.runSync);

		const _method = Effect.succeed((service as T)[method]);

		return Effect.runSync(_method.pipe(Effect.provideService(Ant, Ant.of(ant))));
	}

	async call<T extends Function & ((...args: any[]) => any)>(this: native_model, method: T) {
		const ant = await this.ant();

		return (...args: Parameters<T>) => {
			console.log("Calling method", method.name, "on", this.model_name);
			return method(...args).pipe(ant);
		};
	}

	async on(event: EVENT, handler: (ant: Ant) => void) {
		// console.log("Registering event handler", event, handler);
		this.events.push(new EventHandler(event, handler));

		return this;
	}
}

export class InterfaceDefinition<T> {
	constructor(name: string) {
		this.name = name;
	}

	readonly name: string;

	tag<T>() {
		return Context.Tag<T>(this.name);
	}
}

export function pass_target(feature: Ant) {
	return Effect.provideService(Ant, Ant.of(feature));
}

export function pass_feature(target: Ant) {
	return Effect.provideService(TargetAnt, TargetAnt.of(target));
}

export function constant_string(value: string) {
	return {
		instance_of: ["string"],
		string_value: value,
	};
}

export function constant_number(value: number) {
	return {
		instance_of: ["number"],
		number_value: value,
	};
}

export function constant_boolean(value: boolean) {
	return {
		instance_of: ["boolean"],
		boolean_value: value,
	};
}

// setTimeout(async () => {
// 	// console.log("Running string validity");

// 	const string = native_model.assert("string");

// 	const handler = await string.handler(String, "assert_validity");

// 	if (!handler) throw "handler not found";

// 	const med_time = new Date();

// 	const assert_validity = await string.call(handler);

// 	const start_time = new Date();

// 	Effect.runPromiseExit(assert_validity()).then((result) => {
// 		const end_time = new Date();
// 		const duration = end_time.getTime() - start_time.getTime();

// 		// console.log(result, duration);
// 	});
// 	// .catch(console.error);
// }, 3000);
