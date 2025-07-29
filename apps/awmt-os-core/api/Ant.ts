import { Context, Effect, pipe } from "effect";
// import { Task } from "../interfaces/Task";
import EVENT from "../native/events";
import CATEGORY from "../native/feature_categories";
import { EventHandler, ModelInterface, native_models } from "../native/native_model";
import { Ant as AntTag, TargetAnt } from "../native/tags";
import { append, get_head, get_tail, is_root } from "../utils/path";
import { DeclarationQueue, ModelDeclaration } from "./boot";
import handle_declaration from "./declaration";
import { InstanceSortInput, InstanceWhereInput } from "./filter";
import { set } from "./methods";
import * as ai from "./methods/ai";
import * as mutations from "./methods/mutations";
import * as  queries from "./methods/queries";
import * as queue from "./methods/queue";
import * as standalone from "./methods/standalone";
import * as state_machine from "./methods/state_machines";
// import { StateMachineSnapshot, StateReachingInterface } from "../interfaces/StateMachineSnapshot";
import { BooleanFilter, DateFilter, NumberFilter, ReferenceFilter, StringFilter } from ".";

export type GraphNode = {
	id: number;
	introspection: string[];
	own_label: string | undefined;
	own_value: Value | undefined;
	// reference: Ant | undefined;
};

export function node_ids(nodes: GraphNode[]) {
	return nodes.map((node) => node.id);
}

export async function definition_node(ant: Ant) {
	const node = ant.nodes.find((node) => node.introspection.length === 0) as GraphNode;

	if (!node) {
		// console.log(ant.nodes)

		// throw "No definition node for " + ant.path + " : " + JSON.stringify(ant.nodes);

		const siblings = await queries.find_siblings(ant.node_ids[0]);

		return siblings.find((node) => node.introspection.length === 0) as GraphNode;

		return undefined;
	}

	return node;
}

export async function definition_node_id(ant: Ant): Promise<number> {
	const node = await definition_node(ant);

	if (!node) throw "No definition node for " + ant.path + " : " + JSON.stringify(ant.nodes);

	return node?.id as number;
}

export type Value = { value_type: "string"; value: string } | { value_type: "number"; value: number } | { value_type: "boolean"; value: boolean } | { value_type: "string_array"; value: string[] } | { value_type: "number_array"; value: number[] } | { value_type: "boolean_array"; value: boolean[] };
export class Ant {
	constructor(nodes: GraphNode[], path: string, target?: Ant) {
		this._nodes = nodes;
		this._path = path;
		this._label = nodes.sort((a, b) => b.introspection.length - a.introspection.length).findLast((node) => node.own_label && !node.introspection.includes("REF"))?.own_label || "";
		this._target_ant = target;

		// console.log(
		// 	this._path,
		// 	nodes.map((node) => node.own_label),
		// );
	}

	protected _nodes: GraphNode[] = [];

	// protected _nodes: number[] = [];
	protected _path: string;
	protected _label: string;

	protected _target_ant: Ant | undefined;

	protected _value_type: "string" | "number" | "boolean" | "string_array" | "number_array" | "boolean_array" | undefined;
	protected _string_value: string | undefined;
	protected _number_value: number | undefined;
	protected _boolean_value: boolean | undefined;
	protected _string_array_value: string[] | undefined;
	protected _number_array_value: number[] | undefined;
	protected _boolean_array_value: boolean[] | undefined;

	// public state_reaching: StateReachingInterface | undefined;

	is_mutable: boolean = false;

	mutable_path: {
		node_name: string;
		id: number;
		label: string;
	}[] = [];

	static from_path(path: string): Effect.Effect<never, unknown, Ant | null> {
		const ant = Effect.tryPromise(() => {
			const a = queries.find_model(path);
			return a || null;
		});

		// if(!ant) return Effect.fail("Not found");

		// if (!ant) return Effect.fail("Not found");

		return ant;
	}

	static search_models(query: string) {
		return Effect.tryPromise(() => queries.search_models(query));
	}

	static all_prototypes() {
		return Effect.tryPromise(() => queries.prototypes());
	}

	static safe_from_path(path: string): Effect.Effect<never, unknown, Ant> {
		const ant = Effect.tryPromise(() => {
			const a = queries.find_model(path);
			return a as Promise<Ant>;
		});

		return ant;
	}

	static async object_from_path(path: string) {
		return await Effect.runPromise(this.from_path(path));
	}

	static find_instances_by_value(class_name: string, key: string, value: string) {
		return Effect.tryPromise(() => queries.find_instances_by_value(class_name, key, value));
	}

	static mutable_from_path(path: string) {
		return Effect.flatten(
			Effect.tryPromise(() =>
				queries.find_model(path).then((ant) => {
					if (!ant) throw "Not found";
					return ant.mutable();
				}),
			),
		);
	}

	static create_model(name?: string, label?: string, description?: string, declaration?: ModelDeclaration) {
		return Effect.tryPromise(() => mutations.create_model(name, label, declaration));
	}

	static create_mutable_model(name?: string, label?: string) {
		return Effect.flatten(Effect.tryPromise(() => mutations.create_model(name, label).then((ant) => ant.mutable())));
	}

	static assert(path: string) {
		return Effect.tryPromise(() => mutations.create_model(path));
	}

	static do = Effect.runPromise;

	// as_queue(this: Ant) {
	// 	return Effect.tryPromise(async () => {
	// 		const classes = await Effect.runPromise(await this.classes());
	// 		if (!classes.map((cl) => cl._path).includes("queue")) throw "Not a queue";

	// 		const queue = new QueueAnt(this.nodes, this._path, this._target_ant);

	// 		if (this.is_mutable) {
	// 			queue.is_mutable = true;
	// 			queue.mutable_path = this.mutable_path;
	// 		}

	// 		return queue;
	// 	});
	// }

	as_set(this: Ant) {
		return Effect.tryPromise(async () => {
			const classes = await Effect.runPromise(await this.classes());

			if (!classes.map((cl) => cl._path).includes("set")) {
				// console.log("not a set");
				const mutable = await Effect.runPromise(await this.mutable());
				mutable.set_class("set");
			}

			const set = new SetAnt(this.nodes, this._path, this._label, this._target_ant);

			if (this.is_mutable) {
				set.is_mutable = true;
				set.mutable_path = this.mutable_path;
			}

			return set;
		});
	}

	// as_standalone_object(this: Ant) {
	// 	return Effect.tryPromise(async () => {
	// 		const classes = await Effect.runPromise(await this.classes());

	// 		if (!classes.map((cl) => cl._path).includes("entity")) throw "Not a standalone object";

	// 		const standalone_object = new StandaloneObjectAnt(this.nodes, this._path, this._label, this._target_ant);

	// 		if (this.is_mutable) {
	// 			standalone_object.is_mutable = true;
	// 			standalone_object.mutable_path = this.mutable_path;
	// 		}

	// 		return standalone_object;
	// 	});
	// }

	get nodes() {
		return this._nodes;
		// return unique(node_ids(this._nodes));
	}

	get node_ids() {
		return node_ids(this._nodes);
	}

	get path() {
		return this._path;
	}

	get label() {
		return this._label;
	}

	get value(): string | boolean | number | string[] | boolean[] | number[] | undefined {
		const nodes_with_value = this._nodes.filter((node) => node.own_value?.value_type);

		if (!nodes_with_value.length) return undefined;

		const non_null_value = nodes_with_value.find((node) => node.own_value?.value !== null);

		if (!non_null_value) return undefined;

		return non_null_value.own_value?.value;
	}

	get is_root() {
		return is_root(this.path);
	}

	get head() {
		return get_head(this.path);
	}

	get tail() {
		return get_tail(this.path);
	}

	get target() {
		return this._target_ant;
	}

	get is_feature() {
		return !!this.target;
	}

	set label(new_label: string) {
		this._label = new_label;
	}

	set cached_string_value(value: string) {
		this._string_value = value;
		this._value_type = "string";
	}

	set cached_number_value(value: number) {
		this._number_value = value;
		this._value_type = "number";
	}

	set cached_boolean_value(value: boolean) {
		this._boolean_value = value;
		this._value_type = "boolean";
	}

	set cached_string_array_value(value: string[]) {
		this._string_array_value = value;
		this._value_type = "string_array";
	}

	set cached_number_array_value(value: number[]) {
		this._number_array_value = value;
		this._value_type = "number_array";
	}

	set cached_boolean_array_value(value: boolean[]) {
		this._boolean_array_value = value;
		this._value_type = "boolean_array";
	}

	private set_target_ant(target_ant: Ant) {
		this._target_ant = target_ant;
	}

	protected interfaces: ModelInterface<any>[] = [];

	advance(
		nodes: GraphNode[],
		relative_path: string,
		// label: string,
		append_mutable_element?: {
			node_name: string;
			id: number;
			label: string;
		},
		// value?: Value,
	) {
		let new_ant = new Ant(nodes, append(this.path, relative_path), this.target);

		if (this.is_mutable && append_mutable_element) {
			new_ant.is_mutable = true;
			new_ant.mutable_path = [...this.mutable_path, append_mutable_element];
		}

		return new_ant;
	}

	description() {
		return Effect.tryPromise(() => queries.description(this));
	}

	// summary() {
	// 	return Effect.tryPromise(() => queries.summary(this));
	// }

	breadcrumbs() {
		return Effect.tryPromise(() => queries.breadcrumbs(this));
	}

	feature_of(target_ant: Ant) {
		this.set_target_ant(target_ant);

		return this;
	}

	mutable(declaration?: ModelDeclaration) {
		let ant = this;

		if (ant.is_mutable) {
			if (declaration) {
				handle_declaration(new DeclarationQueue(), ant.path, declaration).poll_all(50, 100);
			}

			return Effect.succeed(ant);
		}

		return Effect.gen(function* (_) {
			const nodes = yield* _(Effect.tryPromise(() => mutations.mutable(ant)));

			ant.is_mutable = true;
			ant.mutable_path = nodes;

			if (declaration) {
				handle_declaration(new DeclarationQueue(), ant.path, declaration).poll_all(50, 100);
			}

			return ant;
		});
	}

	unmutable() {
		let ant = this;

		return Effect.gen(function* (_) {
			ant.is_mutable = false;
			ant.mutable_path = [];

			return ant;
		});
	}

	breadcrumb() {
		// 	let ant = this;
		// 	return Effect.gen(function* (_) {
		// 		const breadcrumb = yield* _(Effect.tryPromise(() => methods.breadcrumb(ant)));
		// 		return breadcrumb;
		// 	});
	}

	classes() {
		return Effect.tryPromise(() => queries.classes(this));
	}

	direct_classes() {
		return Effect.tryPromise(() => queries.direct_classes(this));
	}

	has_class(class_name: string) {
		return Effect.tryPromise(() => queries.has_class(this, class_name));
	}

	if_has_class(class_name: string) {
		return Effect.tryPromise(() => queries.if_has_class(this, class_name));
	}

	instances(page?: number, page_size?: number, string_filters?: StringFilter[], number_filters?: NumberFilter[], boolean_filters?: BooleanFilter[], date_filters?: DateFilter[], reference_filters?: ReferenceFilter[]) {
		return Effect.tryPromise(() => queries.instances(this, page, page_size, string_filters, number_filters, boolean_filters, date_filters, reference_filters));
	}

	direct_instances(page?: number, page_size?: number, string_filters?: StringFilter[], number_filters?: NumberFilter[], boolean_filters?: BooleanFilter[], date_filters?: DateFilter[], reference_filters?: ReferenceFilter[]) {
		return Effect.tryPromise(() => queries.direct_instances(this, page, page_size, string_filters, number_filters, boolean_filters, date_filters, reference_filters));
	}

	count_instances() {
		return Effect.tryPromise(() => queries.count_instances(this));
	}

	count_direct_instances() {
		return Effect.tryPromise(() => queries.count_direct_instances(this));
	}

	it2_subclasses() {
		return Effect.tryPromise(() => queries.it2_subclasses(this));
	}

	it2_superclasses() {
		return Effect.tryPromise(() => queries.it2_superclasses(this));
	}

	it2_instances(depth?: number) {
		return Effect.tryPromise(() => queries.it2_instances(this, depth));
	}

	prototypes() {
		return Effect.tryPromise(() => queries.it2_prototypes(this));
	}

	it2_prototypes() {
		return Effect.tryPromise(() => queries.it2_prototypes(this));
	}

	it2_has_prototype(name: string) {
		return Effect.tryPromise(() => queries.it2_has_prototype(this, name));
	}

	it2_has_direct_prototype(name: string) {
		return Effect.tryPromise(() => queries.it2_has_direct_prototype(this, name));
	}

	it2_direct_subclasses() {
		return Effect.tryPromise(() => queries.it2_direct_subclasses(this));
	}

	it2_direct_superclasses() {
		return Effect.tryPromise(() => queries.it2_direct_superclasses(this));
	}

	it2_direct_instances(filter?: InstanceWhereInput[], sort?: InstanceSortInput, page?: number, page_size?: number) {
		return Effect.tryPromise(() => queries.it2_direct_instances(this, filter, sort, page, page_size));
	}

	it2_direct_prototypes() {
		return Effect.tryPromise(() => queries.it2_direct_prototypes(this));
	}

	it2_count_instances() {
		return Effect.tryPromise(() => queries.it2_count_instances(this));
	}

	it2_count_direct_instances(filter?: InstanceWhereInput[]) {
		return Effect.tryPromise(() => queries.it2_count_direct_instances(this, filter));
	}

	aggregate_direct_instances(kind: string, subpath: string, filter?: InstanceWhereInput[]) {
		return Effect.tryPromise(() => queries.aggregate_direct_instances(this, kind, subpath, filter));
	}

	submodels(class_name?: string) {
		return Effect.tryPromise(() => queries.submodels(this, class_name));
	}

	reference_at(relative_path?: string) {
		const self = this;
		return Effect.gen(function* (_) {
			const ant = yield* _(self.at(relative_path));
			if (!ant) return null;
			return yield* _(ant.reference());
		});
	}

	at(this: Ant, relative_path?: string) {
		// console.log("relative_path", this.node_ids);
		if (!relative_path) return Effect.succeed(this);

		return Effect.tryPromise(() => queries.at(this, relative_path));
	}

	pipe_at(relative_path: string, pipe: (ant: Ant) => Effect.Effect<never, never, any>) {
		return Effect.runPromise(this.at(relative_path)).then((submodel) => {
			if (!submodel) throw "Submodel " + relative_path + " not found at " + this.path;

			return pipe(submodel);
		});
	}

	at_many(this: Ant, relative_paths: string[]) {
		return Effect.tryPromise(() => queries.at_many(this, relative_paths));
	}

	search_submodels(query: string) {
		return Effect.tryPromise(() => queries.search_submodels(this, query));
	}

	search_feature_prototypes(query: string) {
		return Effect.tryPromise(() => queries.search_feature_prototypes(this, query));
	}

	// at_queue(this: Ant, relative_path?: string) {
	// 	return Effect.tryPromise(async () => {
	// 		if (!relative_path) return this.as_queue();

	// 		const at = await Effect.runPromise(this.at(relative_path));

	// 		if (!at) throw "Not found";

	// 		return at.as_queue();
	// 	});
	// }

	// at_set(this: Ant, relative_path?: string) {
	// 	return Effect.tryPromise(async () => {
	// 		if (!relative_path) return this.as_set();

	// 		const at = await Effect.runPromise(this.at(relative_path));

	// 		if (!at) throw "Not found";

	// 		return at.as_set();
	// 	});
	// }

	deep_submodels(max_depth?: number, follow_references?: boolean, class_name?: string) {
		return Effect.tryPromise(() => queries.deep_submodels(this, max_depth, follow_references, class_name));
	}

	reference() {
		return Effect.tryPromise(() => queries.reference(this));
	}

	set_reference(reference: string) {
		return Effect.tryPromise(() => mutations.set_reference(this, reference));
	}

	reverse_references() {
		return Effect.tryPromise(() => queries.reverse_references(this));
	}

	in_sets() {
		return Effect.tryPromise(() => queries.in_sets(this));
	}

	remove_reference() {
		return Effect.tryPromise(() => mutations.remove_reference(this));
	}

	has_feature(feature: string) {
		return Effect.tryPromise(() => queries.has_feature(this, feature));
	}

	has_feature_category(category: CATEGORY) {
		return Effect.tryPromise(() => queries.has_feature_category(this, category));
	}

	features(kind?: CATEGORY) {
		return Effect.tryPromise({
			try: async () => await queries.features(this, kind),
			catch: (e) => {
				console.log(e);
			},
		});
	}

	feature_prototype_targets(category?: string) {
		return Effect.tryPromise(() => queries.feature_prototype_targets(this, category));
	}

	attached_instance(category?: string, path_root?: string) {
		// return Effect.tryPromise(() => queries.feature_targets(this, category, path_root));

		const that = this;
		return Effect.gen(function* (_) {
			const targets = yield* _(Effect.tryPromise(() => queries.feature_targets(that, category, path_root)));

			if (!targets) return null;

			return targets[0];
		});
	}

	feature_targets(category?: string, path_root?: string) {
		return Effect.tryPromise(() => queries.feature_targets(this, category, path_root));
	}

	remove() {
		return Effect.tryPromise(() =>
			this.call_event_handlers(this, EVENT.INSTANCIATE).then(() => {
				return mutations.remove(this);
			}),
		);
	}

	feature_prototypes(category?: CATEGORY) {
		return Effect.tryPromise(() => queries.feature_prototypes(this, category));
	}

	create_feature_prototype(template: string, kind: CATEGORY, abstraction_depth_target: number = 1) {
		return Effect.tryPromise(() => mutations.create_feature_prototype(this, template, kind, abstraction_depth_target));
	}

	// extend_feature_prototype(template: string, kind: CATEGORY, name: string) {
	// 	return Effect.tryPromise(() => mutations.extend_feature_prototype(this, template, kind, name));
	// }

	use_feature_prototype(template: string, as?: string) {
		return Effect.tryPromise(() => mutations.use_feature_prototype(this, template, as));
	}

	use_existing_feature(feature: string, kind: CATEGORY) {
		return Effect.tryPromise(() => mutations.use_existing_feature(this, feature, kind));
	}

	find_interface<T>(interf: Context.Tag<T, T>): ModelInterface<T> | null {
		const interf_name = interf.identifier as string;

		// console.log("Finding interface", interf_name, this.interfaces);

		// console.trace();

		for (let _interface of this.interfaces) {
			if (_interface.name === interf_name) {
				return _interface;
			}
		}

		return null;
	}

	async use_handler<T, K extends keyof T>(interf: Context.Tag<T, T>, handler_name: K) {
		const provided_interfaces_names = await queries.provided_interfaces(this);

		// console.log("Provided interfaces for", interf.identifier, provided_interfaces_names);

		let provided_interface: ModelInterface<any> | undefined = provided_interfaces_names
			.map(({ interface: interf, native_model }) => {
				const model = native_models.get(native_model);

				// console.log("Native Model", model, native_model)

				if (!model) return undefined;

				// console.log(model.find_interface_by_name(interf));

				return model.find_interface_by_name(interf);
			})
			.filter((i) => i !== undefined)
			.find((i) => i?.name === (interf.identifier as string));

		// console.log("Provided interface", provided_interface?.name)
		// console.log('All interfaces', provided_interfaces_names)

		if (!provided_interface) {
			const current_interfaces = provided_interfaces_names.map(({ interface: interf, native_model }) => {
				const model = native_models.get(native_model);

				if (!model) return undefined;

				return model.find_interface_by_name(interf);
			});

			const current_classes = await queries.classes(this);

			throw `Interface not provided ${interf.identifier} at path ${this.path} for handler ${handler_name.toString()}, interfaces are : ${current_interfaces.map((i) => i?.name).join(", ")}. Current classes are : ${current_classes.map((c) => c.path).join(", ")}`;
		}

		if (!provided_interface.effect) throw "Effect not found";

		const effect = provided_interface.effect;
		const ant = this;
		const runnable = effect.pipe(Effect.provideService(AntTag, AntTag.of(ant)));
		const service = pipe(runnable, Effect.runSync);
		const _method = Effect.succeed((service as T)[handler_name]);

		console.log("got handler", handler_name, "for", interf.identifier, "on model", ant.path);

		const handler = Effect.runSync(_method.pipe(Effect.provideService(AntTag, AntTag.of(ant))));

		return handler;
	}

	use_handler_effect<T, K extends keyof T>(interf: Context.Tag<T, T>, handler_name: K) {

		console.log("use_handler_effect", interf.identifier, handler_name, "on model ", this.path);

		const that = this;

		return Effect.tryPromise(() => that.use_handler(interf, handler_name));
	}

	call<T, K extends keyof T>(this: Ant, interf: Context.Tag<T, T>, handler_name: K) {
		const ant = this;

		return Effect.flatten(
			Effect.tryPromise(async function () {
				const provided_interfaces_names = await queries.provided_interfaces(ant);

				let provided_interface: ModelInterface<any> | undefined = provided_interfaces_names
					.map(({ interface: interf, native_model }) => {
						const model = native_models.get(native_model);

						if (!model) return undefined;

						return model.find_interface_by_name(interf);
					})
					.filter((i) => i !== undefined)
					.find((i) => i?.name === (interf.identifier as string));

				if (!provided_interface) {
					const classes_names = await queries.classes(ant);
					throw `-- 2Interface not provided ${interf.identifier} : ${ant.path} : ${handler_name.toString()}, classes are : ${classes_names.map((c) => c.path).join(", ")}`;
				}

				if (!provided_interface.effect) throw "Effect not found";

				const effect = provided_interface.effect;

				const runnable = effect.pipe(Effect.provideService(AntTag, AntTag.of(ant)));

				const service = pipe(runnable, Effect.runSync);

				const _method = Effect.succeed((service as T)[handler_name]);

				return _method.pipe(
					Effect.updateService(AntTag, (s) => {
						return AntTag.of(ant);
					}),
				);
			}),
		);
	}

	async provide<T extends Function & ((...args: any[]) => any)>(method: T) {
		const ant = this;

		return async (...args: Parameters<T>) => {
			// console.log("Providing service", ant.path, method.name);
			return method(ant, ...args).pipe(Effect.provideService(AntTag, AntTag.of(ant))) as Promise<Effect.Effect<never, never, ReturnType<T>>>;
		};
	}

	interface<T>(interf: Context.Tag<T, T>): Effect.Effect<never, never, T> {
		const _interface = this.find_interface<T>(interf);

		const interf_name = interf.identifier as string;

		if (!_interface) throw `Interface not found ${interf_name} : ${this.path}`;

		if (!_interface.effect) throw "Effect not found";

		const runnable = _interface.effect.pipe(Effect.provideService(AntTag, AntTag.of(this)));

		const res = pipe(runnable, Effect.runSync);

		return Effect.succeed(res as T);
	}

	async lazy_live_handler<T, K extends keyof T>(interf: Context.Tag<T, T>, handler_name: K, expiry: number = 10000) {
		let cached = null as Effect.Effect.Success<T[K] extends Effect.Effect<any, any, any> ? Effect.Effect<any, any, any> : never> | null;

		// @ts-ignore
		async function refresh_cache(ant: Ant, ...args: Parameters<T[K]>) {
			const handler = await ant.use_handler(interf, handler_name);

			// @ts-ignore
			const callable = await ant.provide(handler);
			const res = await Effect.runPromise(await callable(ant, ...args));

			cached = res;
			setTimeout(async () => {
				cached = null;
			}, expiry);
			return res as Effect.Effect.Success<T[K] extends Effect.Effect<any, any, any> ? Effect.Effect<any, any, any> : never>;
		}

		async function get_cached() {
			return cached as Effect.Effect.Success<T[K] extends Effect.Effect<any, any, any> ? Effect.Effect<any, any, any> : never>;
		}

		// @ts-ignore
		return (...args: Parameters<T[K]>) => {
			let resp;

			//@ts-ignore
			if (cached) resp = get_cached() as Promise<Effect.Effect.Success<ReturnType<T[K]>>>;
			//@ts-ignore
			else resp = refresh_cache(this, ...args) as Promise<Effect.Effect.Success<ReturnType<T[K]>>>;

			return resp;
		};
	}

	async instances_live_handler<T, K extends keyof T>(interf: Context.Tag<T, T>, handler_name: K, expiry: number = 10000) {
		let instances = await queries.instances(this);

		const handlers = new Map<string, ReturnType<Ant["lazy_live_handler"]>>();

		const ant = this;

		async function refresh_instances() {
			instances = await queries.instances(ant);

			for (let instance of instances) {
				if (handlers.has(instance.path)) {
					continue;
				}

				const handler = await instance.lazy_live_handler(interf, handler_name, expiry);

				// @ts-ignore
				handlers.set(instance.path, handler);
			}
		}

		await refresh_instances();

		setInterval(async () => {
			await refresh_instances();
		}, expiry);

		// @ts-ignore
		return (instance_path: string) =>
			// @ts-ignore
			(...args: Parameters<T[K]>) => {
				// @ts-ignore
				if (!handlers.has(instance_path)) throw "Handler not found";

				// @ts-ignore
				return handlers.get(instance_path)(...args) as Promise<Effect.Effect.Success<ReturnType<T[K]>>>;
			};
	}

	with_interfaces(interfaces: ModelInterface<any>[]) {
		this.interfaces = interfaces;

		if (this.path === "desktop") {
			console.log(
				"Registering Interfaces for desktop",
				interfaces.map((i) => i.name),
			);
		}

		return this;
	}

	call_on_feature<R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<Exclude<Exclude<R, Ant>, TargetAnt>, E, A> {
		const pass_target = (feature: Ant) => Effect.provideService(AntTag, AntTag.of(feature));
		const pass_feature = (target: Ant) => Effect.provideService(TargetAnt, TargetAnt.of(target));

		if (this._target_ant) {
			return effect.pipe(pass_target(this._target_ant), pass_feature(this));
		} else {
			throw "not a feature";
		}
	}

	create_submodel(subpath?: string, label?: string, prototype?: string) {
		return Effect.tryPromise(() => mutations.create_submodel(this, subpath, label, prototype));
	}

	submodel_templates() {
		return Effect.tryPromise(() => queries.submodel_templates(this));
	}

	create_submodel_template(template: string) {
		return Effect.tryPromise(() => mutations.create_submodel_template(this, template));
	}

	create_submodel_template_from_prototype(template: string) {
		return Effect.tryPromise(() => mutations.create_submodel_template_from_prototype(this, template));
	}

	// use_submodel_template(template: string, subpath?: string, label?: string, as_reference?: boolean, as_constraint?: boolean, array?: boolean) {
	// 	return Effect.tryPromise(() => mutations.use_submodel_template(this, template, subpath, label, as_reference, as_constraint, array));
	// }

	create_submodel_from_prototype(prototype: string, subpath?: string, label?: string, as_reference?: boolean, instantiate?: boolean, array?: boolean) {
		return Effect.tryPromise(() => mutations.create_submodel_from_prototype(this, prototype, subpath, label, as_reference, instantiate, array));
	}

	set_classes(classes: string[]) {
		return Effect.tryPromise(() => mutations.set_classes(this, classes));
	}

	set_class(class_name: string) {
		return Effect.tryPromise(() => mutations.set_classes(this, [class_name]));
	}

	async call_event_handlers(ant: Ant | null, event: EVENT) {
		if (!ant) throw "Not found";

		const classes = await queries.classes(ant);

		let provided_event_handlers = classes
			.map((cl) => {
				const model = native_models.get(cl.path);

				if (!model) return undefined;

				return model.events.map((event) => {
					return {
						...event,
						model: cl.path,
					};
				});
			})
			.flat()
			.filter((ev) => ev !== undefined && ev.event === event)
			.map((ev) => ev as EventHandler & { model: string });

		const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

		await delay(250);

		for (let event of provided_event_handlers) {
			event.handler(ant);
		}
	}

	instantiate(path?: string, label?: string) {
		// const new_model = Effect.tryPromise(() => mutations.instantiate(this, path, label));

		console.log("INSTANTIATE A", this.path, "AS", path, label);

		// const ran = Effect.runPromise(new_model);

		// ran.then((new_model) => this.call_event_handlers(new_model, EVENT.INSTANCIATE));

		// return Effect.tryPromise(async () => ran);

		const ant = this;

		return Effect.gen(function* (_) {
			const new_model = yield* _(Effect.tryPromise(() => mutations.instantiate(ant, path, label)));

			// yield* _(ant.call_event_handlers(new_model, EVENT.INSTANCIATE));

			// const state_machines = yield* _(ant.feature_prototypes(CATEGORY.STATE_MACHINE));

			// for (let state_machine of state_machines) {
			// 	yield* _(ant.use_feature_prototype(state_machine.model.path));

			// 	yield* _(Effect.logInfo("Instantiating state machine " + state_machine.model.path));
			// }

			return new_model;
		});
	}

	extend(path?: string, label?: string) {
		return Effect.tryPromise(() => mutations.extend(this, path, label));
	}

	add_superclass(superclass: string) {
		return Effect.tryPromise(() => mutations.add_superclass(this, superclass));
	}

	add_prototype(prototype: string) {
		return Effect.tryPromise(() => mutations.add_prototype(this, prototype));
	}

	set_label(label: string) {
		return Effect.tryPromise(() => mutations.set_label(this, label));
	}

	set_description(description: string) {
		// console.log("SET DESCRIPTION", description);
		return Effect.tryPromise(() => mutations.set_description(this, description));
	}

	provide_interface<T>(interface_name: string, abstraction_depth: number = 1) {
		return Effect.tryPromise(() => mutations.provide_interface(this, interface_name, abstraction_depth));
	}

	set_string_value(value: string) {
		return Effect.tryPromise(() => mutations.set_string_value(this, value));
	}

	set_number_value(value: number) {
		return Effect.tryPromise(() => mutations.set_number_value(this, value));
	}

	set_boolean_value(value: boolean) {
		return Effect.tryPromise(() => mutations.set_boolean_value(this, value));
	}

	set_string_array_value(value: string[]) {
		return Effect.tryPromise(() => mutations.set_string_array_value(this, value));
	}

	set_number_array_value(value: number[]) {
		return Effect.tryPromise(() => mutations.set_number_array_value(this, value));
	}

	set_boolean_array_value(value: boolean[]) {
		return Effect.tryPromise(() => mutations.set_boolean_array_value(this, value));
	}

	set_string_value_at(relative_path: string, value: string) {
		return this.at(relative_path).pipe(Effect.flatMap((a) => a?.set_string_value(value) || Effect.succeed(null)));
	}

	set_number_value_at(relative_path: string, value: number) {
		return this.at(relative_path).pipe(Effect.flatMap((a) => a?.set_number_value(value) || Effect.succeed(null)));
	}

	set_boolean_value_at(relative_path: string, value: boolean) {
		return this.at(relative_path).pipe(Effect.flatMap((a) => a?.set_boolean_value(value) || Effect.succeed(null)));
	}

	set_string_array_value_at(relative_path: string, value: string[]) {
		return this.at(relative_path).pipe(Effect.flatMap((a) => a?.set_string_array_value(value) || Effect.succeed(null)));
	}

	set_number_array_value_at(relative_path: string, value: number[]) {
		return this.at(relative_path).pipe(Effect.flatMap((a) => a?.set_number_array_value(value) || Effect.succeed(null)));
	}

	set_boolean_array_value_at(relative_path: string, value: boolean[]) {
		return this.at(relative_path).pipe(Effect.flatMap((a) => a?.set_boolean_array_value(value) || Effect.succeed(null)));
	}

	string_value(path?: string) {
		if (path) {
			// console.log("PATH", path);
			return this.at(path).pipe(Effect.flatMap((element) => (element ? Effect.tryPromise(() => queries.get_string_value(element)) : Effect.succeed(null))));
		}

		return Effect.tryPromise(() => queries.get_string_value(this));
	}

	number_value(path?: string) {
		if (path) {
			return this.at(path).pipe(Effect.flatMap((element) => (element ? Effect.tryPromise(() => queries.get_number_value(element)) : Effect.succeed(null))));
		}

		return Effect.tryPromise(() => queries.get_number_value(this));
	}

	boolean_value(path?: string) {
		if (path) {
			return this.at(path).pipe(Effect.flatMap((element) => (element ? Effect.tryPromise(() => queries.get_boolean_value(element)) : Effect.succeed(null))));
		}

		return Effect.tryPromise(() => queries.get_boolean_value(this));
	}

	string_array_value(path?: string) {
		if (path) {
			return this.at(path).pipe(Effect.flatMap((element) => (element ? Effect.tryPromise(() => queries.get_string_array_value(element)) : Effect.succeed(null))));
		}

		return Effect.tryPromise(() => queries.get_string_array_value(this));
	}

	number_array_value(path?: string) {
		if (path) {
			return this.at(path).pipe(Effect.flatMap((element) => (element ? Effect.tryPromise(() => queries.get_number_array_value(element)) : Effect.succeed(null))));
		}

		return Effect.tryPromise(() => queries.get_number_array_value(this));
	}

	boolean_array_value(path?: string) {
		if (path) {
			return this.at(path).pipe(Effect.flatMap((element) => (element ? Effect.tryPromise(() => queries.get_boolean_array_value(element)) : Effect.succeed(null))));
		}

		return Effect.tryPromise(() => queries.get_boolean_array_value(this));
	}

	unlink_value() {
		return Effect.tryPromise(() => mutations.unlink_value(this));
	}

	provided_interfaces() {
		return Effect.tryPromise(() => queries.provided_interfaces(this));
	}

	interface_constraints() {
		return Effect.tryPromise(() => queries.interface_constraints(this));
	}

	add_interface_constraint(name: string) {
		return Effect.tryPromise(() => mutations.add_interface_constraint(this, name));
	}

	remove_interface_constraint(name: string) {
		return Effect.tryPromise(() => mutations.remove_interface_constraint(this, name));
	}

	prototype_constraints() {
		return Effect.tryPromise(() => queries.prototype_constraints(this));
	}

	add_prototype_constraint(name: string, is_array?: boolean) {
		const ant = this;

		if (is_array) {
			return Effect.gen(function* (_) {
				// Add the "set" prototype
				const set_prototype = yield* _(Effect.tryPromise(() => mutations.add_prototype(ant, "set")));

				yield* _(Effect.logInfo("Added set prototype " + ant.path));

				// Get SET_TEMPLATE features
				const set_template_features = yield* _(Effect.tryPromise(() => queries.feature_prototypes(ant, CATEGORY.SET_TEMPLATE)));

				yield* _(Effect.logInfo("Found " + set_template_features.length + " SET_TEMPLATE features"));

				if (set_template_features.length === 0) {
					// If no SET_TEMPLATE features, use the existing feature
					yield* _(Effect.tryPromise(() => mutations.use_existing_feature(ant, name, CATEGORY.SET_TEMPLATE)));

					yield* _(Effect.logInfo("Using existing feature " + name));
				} else {
					// Check if the existing feature's path matches the name
					const existing_feature = set_template_features[0];
					if (existing_feature.model.path !== name) {
						// Update the feature if necessary
						yield* _(Effect.tryPromise(() => mutations.remove(existing_feature.model)));
						yield* _(Effect.tryPromise(() => mutations.use_existing_feature(ant, name, CATEGORY.SET_TEMPLATE)));

						yield* _(Effect.logInfo("Updated feature " + name));
					}
				}

				yield* _(Effect.logInfo("Added prototype constraint " + name));

				return ant;
			});
		}

		return Effect.tryPromise(() => mutations.add_prototype_constraint(this, name));
	}

	remove_prototype_constraint(name: string) {
		return Effect.tryPromise(() => mutations.remove_prototype_constraint(this, name));
	}

	superclass_constraints() {
		return Effect.tryPromise(() => queries.superclass_constraints(this));
	}

	add_superclass_constraint(name: string) {
		return Effect.tryPromise(() => mutations.add_superclass_constraint(this, name));
	}

	remove_superclass_constraint(name: string) {
		return Effect.tryPromise(() => mutations.remove_superclass_constraint(this, name));
	}

	suggest_references(query?: string) {
		return Effect.tryPromise(() => queries.suggest_references(this, query));
	}

	unfilled_slots() {
		return Effect.tryPromise(() => queries.submodels(this));
	}

	static ask(query: string) {
		return Effect.tryPromise(() => ai.ask(query));
	}

	static explain(query: string) {
		return Effect.tryPromise(() => ai.explain(query));
	}

	static extract(query: string) {
		// return Effect.tryPromise(() => ai.extract(query));
	}

	state_machine(name: string) {
		const ant = this;

		return Effect.gen(function* (_) {
			const mutable = yield* _(ant.mutable());
			const state_machine = (yield* _(mutable.feature_prototypes(CATEGORY.STATE_MACHINE))).find((f) => f.model.label === name)?.model || null;

			if (!state_machine) {
				throw "State machine not found";
			}

			return state_machine;
		});
	}

	// state(name: string) {
	// 	const ant = this;

	// 	return Effect.gen(function* (_) {
	// 		const mutable = yield* _(ant.mutable());
	// 		const features = yield* _(mutable.features(CATEGORY.STATE_MACHINE));

	// 		for (let feature of features) {
	// 			const machine_name = yield* _(feature.model.at("name").pipe(Effect.flatMap((a) => a!.string_value())));
	// 			yield* _(Effect.logInfo("Checking machine " + machine_name + " for state " + name));
	// 			if (machine_name !== name) {
	// 				continue;
	// 			}
	// 			return feature.model as unknown as StateMachineSnapshot;
	// 		}

	// 		throw "State not found";
	// 	});
	// }

	// states() {
	// 	const ant = this;

	// 	return Effect.gen(function* (_) {
	// 		const mutable = yield* _(ant.mutable());
	// 		const features = yield* _(mutable.features(CATEGORY.STATE_MACHINE));

	// 		return features.map((f) => f.model as unknown as StateMachineSnapshot);
	// 	});
	// }

	create_state_machine(name: string, entry_state: string) {
		const ant = this;

		const entry_state_name = entry_state;

		console.log("Creating state machine", name, "on model", ant.path, "with entry state", entry_state_name);

		return Effect.gen(function* (_) {
			const mutable = yield* _(ant.mutable());

			// Get the current state machine prototypes and check if the name is already taken, if so, return it

			const state_machines = yield* _(mutable.feature_prototypes(CATEGORY.STATE_MACHINE));

			const existing = state_machines.find((f) => f.model.label === name);

			if (existing) {
				return existing.model;
			}

			yield* _(mutable.create_feature_prototype(name, CATEGORY.STATE_MACHINE));

			const state_machine = (yield* _(mutable.feature_prototypes(CATEGORY.STATE_MACHINE))).find((f) => f.model.label === name)?.model || null;

			if (!state_machine) {
				throw "State machine not creatable";
			}

			yield* _(state_machine.set_class("state_machine"));

			yield* _(state_machine.at("name").pipe(Effect.flatMap((a) => a!.set_string_value(name))));

			const entry_state_prototype = yield* _(Ant.from_path("state"));

			if (!entry_state_prototype) {
				throw "Entry state not creatable";
			}

			const states = yield* _(state_machine.at("states"));

			if (!states) {
				throw "States not found";
			}

			const entry_state = yield* _(states.create_submodel_from_prototype("state", entry_state_name, entry_state_name, true, true));

			yield* _(Effect.logInfo("Created submodel representing state" + entry_state.path));

			const mach = yield* _(entry_state.at("machine"));

			// yield* _(entry_state.at("machine").pipe(Effect.map((x) => x!.set_reference(state_machine.path))));
			// yield* _(entry_state.at("name").pipe(Effect.map((x) => x!.set_string_value(entry_state_name))));

			if (!mach) {
				throw "Machine not found";
			}

			yield* _(mach.set_reference(state_machine.path));

			const state_name = yield* _(entry_state.at("name"));

			if (!state_name) {
				throw "State name not found";
			}

			yield* _(state_name.set_string_value(entry_state_name));

			if (!mach) {
				throw "Machine not found (in method add_state)";
			}

			// yield* _(mach.set_reference(state_machine.path));

			yield* _(Effect.logInfo("Machine connected" + state_machine.path + "  to state " + entry_state.path));

			// const instances = yield* _(ant.instances());

			// for (let instance of instances) {
			// 	yield* _(instance.use_feature_prototype(state_machine.path));

			// 	// TODO set entry state
			// }

			const machine_entry_state = yield* _(state_machine.at("entry_state"));

			if (!machine_entry_state) {
				throw "Entry state not found";
			}

			yield* _(machine_entry_state.set_reference(entry_state.path));

			// const states = yield* _(state_machine.at("states"));

			// yield* _(states.create_submodel_from_prototype("state", entry_state_name, entry_state_name, true, true));

			return state_machine;
		});
	}

	STATE_MACHINE_count_active_objects() {
		return Effect.tryPromise(() => state_machine.count_active_objects(this));
	}

	STATE_MACHINE_count_finalized_objects() {
		return Effect.tryPromise(() => state_machine.count_finalized_objects(this));
	}

	STATE_get_instances() {
		return Effect.tryPromise(() => state_machine.get_state_instances(this));
	}

	STATE_count_instances() {
		return Effect.tryPromise(() => state_machine.count_state_instances(this));
	}

	STATE_MACHINE_SNAPSHOT_set_state(state?: string) {}

	STATE_set_transition_shortcut(start: string, end: string, name: string) {
		return Effect.tryPromise(() => state_machine.set_transition_shortcut(start, end, name));
	}

	STATE_has_path_between(start: string, end: string) {
		return Effect.tryPromise(() => state_machine.has_path_between_states(start, end));
	}

	STATE_outcomes(start: string) {
		return Effect.tryPromise(() => state_machine.outcomes(start));
	}

	MACHINE_get_transitions_to_path(path: string) {
		return Effect.tryPromise(() => state_machine.get_transitions_to_path(this, path));
	}

	// set_state_reaching(state_reaching: StateReachingInterface) {
	// 	this.state_reaching = state_reaching;

	// 	return this;
	// }

	// get_state_reaching() {
	// 	return this.state_reaching;
	// }

	// MACHINE_set_current_state(name: string) {
	// 	return Effect.tryPromise(() => state_machine.set_current_state(machine));
	// }

	// MACHINE_get_outcomes(machine: Ant) {
	// 	return Effect.tryPromise(() => state_machine.get_outcomes(machine));
	// }

	// STATE_get_outcomes(state: Ant) {
	// 	return Effect.tryPromise(() => state_machine.get_state_outcomes(state));
	// }

	// STATE_get_paths(state: Ant) {
	// 	return Effect.tryPromise(() => state_machine.get_state_paths(state));
	// }

	// STATE_get_instances(state: Ant) {
	// 	return Effect.tryPromise(() => state_machine.get_state_instances(state));
	// }
}

// export class QueueAnt extends Ant {
// 	constructor(nodes: GraphNode[], path: string, target?: Ant) {
// 		super(nodes, path, target);
// 	}

// 	static of_task(task: Ant) {
// 		return Effect.tryPromise(async () => queue.find_queue_from_task(task));
// 	}

// 	public size(this: QueueAnt) {
// 		return Effect.tryPromise(() => queue.size(this));
// 	}

// 	public create_element() {
// 		return Effect.tryPromise(() => queue.create_element(this));
// 	}

// 	public try_up_to_n(this: QueueAnt, n: number) {
// 		const that = this;

// 		return Effect.tryPromise(async () => {
// 			const elements = await queue.peek_n(that, n);

// 			const callables = elements.map(async (element) => {
// 				const handler = await element.use_handler(Task, "try");

// 				const callable = await element.provide(handler);

// 				return Effect.runPromise(await callable(element));
// 			});

// 			const results = await Promise.all(callables);

// 			return results;
// 		});
// 	}

// 	public try_next(this: QueueAnt) {
// 		return Effect.tryPromise(async () => {
// 			const peek = await queue.peek_n(this, 1);

// 			if (peek.length === 0) return undefined;

// 			const element = peek[0];

// 			const handler = await element.use_handler(Task, "try");

// 			const callable = await element.provide(handler);

// 			return Effect.runPromise(await callable(element));
// 		});
// 	}

// 	public peek_up_to_n(n: number) {
// 		return Effect.tryPromise(() => queue.peek_n(this, n));
// 	}

// 	public peek() {
// 		return Effect.tryPromise(() => queue.peek_n(this, 1));
// 	}

// 	public contains(this: QueueAnt, path: string) {
// 		return Effect.tryPromise(() => queue.contains(this, path));
// 	}
// }

export class SetAnt extends Ant {
	constructor(nodes: GraphNode[], path: string, label: string, target?: Ant) {
		super(nodes, path, target);
	}

	public size(this: SetAnt) {
		return Effect.tryPromise(() => set.size(this));
	}

	public create_element() {
		return Effect.tryPromise(() => set.create_element(this));
	}

	public push(this: SetAnt, element: Ant) {
		return Effect.tryPromise(() => set.push_element(this, element));
	}

	public get_n(this: SetAnt, n: number) {
		return Effect.tryPromise(() => set.get_n(this, n));
	}
}

// export class StandaloneObjectAnt extends Ant {
// 	constructor(nodes: GraphNode[], path: string, label: string, target?: Ant) {
// 		super(nodes, path, target);
// 	}

// 	standalone_object_class: string | undefined;

// 	static instantiate(class_name: string, primary_key: string) {
// 		return Effect.tryPromise(async () => {
// 			const standalone_object = await Effect.runPromise(
// 				StandaloneObjectAnt.create_model(undefined, primary_key, undefined, {
// 					instance_of: [class_name],
// 				}).pipe(Effect.flatMap((ant) => ant.as_standalone_object())),
// 			);

// 			standalone.set_primary_key(standalone_object, primary_key, class_name);

// 			return standalone_object;
// 		});
// 	}

// 	static assert_standalone(class_name: string, primary_key: string) {
// 		return Effect.tryPromise(async () => {
// 			const existing = await Effect.runPromise(StandaloneObjectAnt.find_by_primary_key(class_name, primary_key));

// 			if (existing) return [existing, false] as const;

// 			const standalone_object = await Effect.runPromise(
// 				StandaloneObjectAnt.create_model(undefined, undefined, undefined, {
// 					instance_of: [class_name],
// 					label: primary_key,
// 				}).pipe(Effect.flatMap((ant) => ant.as_standalone_object())),
// 			);

// 			standalone.set_primary_key(standalone_object, primary_key, class_name);

// 			return [standalone_object, true] as const;
// 		});
// 	}

// 	static find_by_primary_key(class_name: string, primary_key: string) {
// 		return Effect.tryPromise(() => standalone.find_by_primary_key(class_name, primary_key));
// 	}

// 	public get_primary_key(this: StandaloneObjectAnt) {
// 		return Effect.tryPromise(() => standalone.get_primary_key(this));
// 	}
// }

// setTimeout(async () => {
// 	const ant = await Effect.runPromise(Ant.from_path("queue"));
// 	const queues = await ant.instances_live_handler(Queue, "peek_up_to_n", 10000);
// 	const peek_n = await queues("other_new_queue");
// 	const s = await peek_n(10);
// 	// const _ant = await Effect.runPromise(Ant.from_path("other_new_queue"));
// 	// const peek = await _ant.live_handler(Queue, "peek_up_to_n", 10000);
// 	// const callable = await peek(5);
// 	setInterval(async () => {
// 		let start_time = new Date().getTime();
// 		const s = await peek_n(10);
// 	}, 1000);
// }, 5000);

export async function get_mutable_ant(path: string) {
	return await Effect.runPromise(Ant.assert(path).pipe(Effect.flatMap((object_parser) => object_parser.mutable())));
}
