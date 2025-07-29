import "./Ant";
import "./boot";

import "./ant_test";

import { GraphQLError } from "graphql";
import { createSchema, createYoga } from "graphql-yoga";
// const types_file = await Bun.file("./api/type_defs.gql");

import { Effect } from "effect";
import { Ant } from "./Ant";

import { useEngine } from "@envelop/core";
import { useGraphQlJit } from "@envelop/graphql-jit";
import { useOpenTelemetry } from "@envelop/opentelemetry";
import { mergeResolvers, mergeTypeDefs } from "@graphql-tools/merge";
import { useDeferStream } from "@graphql-yoga/plugin-defer-stream";
import { useJWT } from "@graphql-yoga/plugin-jwt";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import { BasicTracerProvider, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { execute, parse, specifiedRules, subscribe, validate } from "graphql";
import jwt from "jsonwebtoken";

import { get_head, get_tail } from "../utils/path";

import crypto from "crypto";
import { Glob } from "glob";
import { __delete_everything } from "./methods/mutations";

const interfaces_folder = "./components";

const region = "eu-west-3";

const { EC2Client, DescribeInstancesCommand } = require("@aws-sdk/client-ec2");
const { CloudWatchClient, GetMetricDataCommand } = require("@aws-sdk/client-cloudwatch");

const ec2Client = new EC2Client({ region });
const cloudWatchClient = new CloudWatchClient({ region });

const interfaces_files = new Glob(`${interfaces_folder}/*/interfaces/*.ts`, {});

const interfaces_paths = interfaces_files;

let schemas: any[] = [];

// First load priority interfaces (components starting with _)
for await (const path of interfaces_paths) {
	if (path.includes("/components/_")) {
		const module = await import.meta.require(`../${path}`);
		if (module.Schema) {
			// console.log("Loading priority schema from " + path.replace("./components/", "").replace("/interfaces/", " > ").replace(".ts", ""));
			// console.log(module.Schema)
			schemas.push(module.Schema);
		}
	}
}

// Then load regular interfaces (components not starting with _)
for await (const path of interfaces_paths) {
	if (!path.includes("/components/_")) {
		const module = await import.meta.require(`../${path}`);
		if (module.Schema) {
			// console.log("Loading schema from " + path.replace("./components/", "").replace("/interfaces/", " > ").replace(".ts", ""));
			// console.log(module.Schema)
			schemas.push(module.Schema);
		}
	}
}

let mvp_schemas: any[] = [];

// First load priority interfaces for mvp_schemas
for await (const path of interfaces_paths) {
	if (path.includes("/components/_")) {
		const module = await import.meta.require(`../${path}`);
		if (module.Schema) {
			// console.log(module.Schema)
			mvp_schemas.push(module.Schema);
		}
	}
}

// Then load regular interfaces for mvp_schemas
for await (const path of interfaces_paths) {
	if (!path.includes("/components/_")) {
		const module = await import.meta.require(`../${path}`);
		if (module.Schema) {
			// console.log(module.Schema)
			mvp_schemas.push(module.Schema);
		}
	}
}

const mvp_types_definition = await Bun.file("./api/mvp_type_defs.gql").text();

interface CreateModelInput {
	label?: string;
	path?: string;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const main_resolvers = {
	Query: {
		model: async (_: null, { path }: { path: string }, context: any, info: any) => {
			return await Effect.runPromise(Ant.from_path(path));
		},

		models: async (_: null, { paths }: { paths: string[] }) => {
			return await Effect.all(paths.map((path) => Ant.from_path(path)));
		},

		statistics: async () => {
			return {};
		},

		search_models: async (_: null, { query }: { query: string }) => {
			return await Effect.runPromise(Ant.search_models(query));
		},
	},
	ModelSearchResult: {
		model: async (result: { model: Ant }) => result.model,
		score: (result: { score: number }) => result.score,
	},
	FeatureSearchResult: {
		feature: async (result: { feature: Ant }) => {
			return result.feature;
		},
		score: (result: { score: number }) => result.score,
	},
	Feature: {
		model: (feature: { category: string; abstraction_depth: number; model: Ant }) => feature.model,
		category: (feature: { category: string; abstraction_depth: number; model: Ant }) => feature.category,
		abstraction_depth: (feature: { category: string; abstraction_depth: number; model: Ant }) => feature.abstraction_depth,
	},
	Model: {
		path: (ant: Ant) => ant.path,
		label: (ant: Ant) => ant.label,
		description: async (ant: Ant) => await Effect.runPromise(ant.description()),
		// summary: async (ant: Ant) => await Effect.runPromise(ant.summary()),
		classes: (ant: Ant) => Effect.runPromise(ant.classes()),
		direct_classes: async (ant: Ant) => await Effect.runPromise(ant.direct_classes()),

		breadcrumbs: async (ant: Ant) => await Effect.runPromise(ant.breadcrumbs()),

		has_class: async (ant: Ant, { name }: { name: string }) => await Effect.runPromise(ant.has_class(name)),
		if_has_class: async (ant: Ant, { name }: { name: string }) => await Effect.runPromise(ant.if_has_class(name)),

		is_root: (ant: Ant) => ant.is_root,

		at: async (ant: Ant, { submodel }: { submodel: string }) => await Effect.runPromise(ant.at(submodel)),
		at_many: async (ant: Ant, { submodels }: { submodels: string[] }) => await Effect.runPromise(ant.at_many(submodels)),
		// at_many: async (ant: Ant, { submodels }: { submodels: string[] }) => {
		// 	// return await Effect.all(submodels.map((submodel) => ant.at(submodel)));

		// 	return (await Promise.all(submodels.map((submodel) => Effect.runPromise(ant.at(submodel))))).filter((x) => x !== null);
		// },

		search_submodels: async (ant: Ant, { query }: { query: string }) => await Effect.runPromise(ant.search_submodels(query)),
		search_feature_prototypes: async (ant: Ant, { query }: { query: string }) => await Effect.runPromise(ant.search_feature_prototypes(query)),

		as: async (ant: Ant) => ant,
		head: async (ant: Ant) => get_head(ant.path),
		tail: async (ant: Ant) => get_tail(ant.path),

		submodels: async (ant: Ant) => await Effect.runPromise(ant.submodels()),
		submodel_templates: async (ant: Ant) => await Effect.runPromise(ant.submodel_templates()),

		features: async (ant: Ant, { category }: { category: CATEGORY }) => await Effect.runPromise(ant.features(category)),
		feature_prototypes: async (ant: Ant, { category }: { category: CATEGORY }) => await Effect.runPromise(ant.feature_prototypes(category)),
		has_feature: async (ant: Ant, { feature }: { feature: string }) => await Effect.runPromise(ant.has_feature(feature)),
		has_feature_category: async (ant: Ant, { category }: { category: CATEGORY }) => await Effect.runPromise(ant.has_feature_category(category)),

		reference: async (ant: Ant) => await Effect.runPromise(ant.reference()),
		reverse_references: async (ant: Ant) => await Effect.runPromise(ant.reverse_references()),
		in_sets: async (ant: Ant) => await Effect.runPromise(ant.in_sets()),

		instances: async (ant: Ant, { page, page_size }: { page?: number; page_size?: number }) => await Effect.runPromise(ant.instances(page, page_size)),
		direct_instances: async (ant: Ant, { page, page_size }: { page?: number; page_size?: number }) => await Effect.runPromise(ant.direct_instances(page, page_size)),

		count_instances: async (ant: Ant) => await Effect.runPromise(ant.count_instances()),
		count_direct_instances: async (ant: Ant) => await Effect.runPromise(ant.count_direct_instances()),

		it2_subclasses: async (ant: Ant) => await Effect.runPromise(ant.it2_subclasses()),
		it2_superclasses: async (ant: Ant) => await Effect.runPromise(ant.it2_superclasses()),
		it2_instances: async (ant: Ant, { depth }: { depth: number }) => await Effect.runPromise(ant.it2_instances(depth)),
		it2_prototypes: async (ant: Ant) => await Effect.runPromise(ant.it2_prototypes()),
		it2_has_prototype: async (ant: Ant, { name }: { name: string }) => await Effect.runPromise(ant.it2_has_prototype(name)),
		it2_has_direct_prototype: async (ant: Ant, { name }: { name: string }) => await Effect.runPromise(ant.it2_has_direct_prototype(name)),
		it2_direct_subclasses: async (ant: Ant) => await Effect.runPromise(ant.it2_direct_subclasses()),
		it2_direct_superclasses: async (ant: Ant) => await Effect.runPromise(ant.it2_direct_superclasses()),
		it2_direct_prototypes: async (ant: Ant) => await Effect.runPromise(ant.it2_direct_prototypes()),
		it2_count_instances: async (ant: Ant) => await Effect.runPromise(ant.it2_count_instances()),
		it2_count_direct_instances: async (ant: Ant) => await Effect.runPromise(ant.it2_count_direct_instances()),

		it2_direct_instances: async (
			ant: Ant,
			{
				where,
				sort,
			}: {
				where: InstanceWhereInput[];
				sort: InstanceSortInput;
			},
		) => {
			return { ant, where, sort };
		},

		find_submodels: async (ant: Ant, { max_depth, class: class_name, follow_references }: { max_depth?: number; class?: string; follow_references?: boolean }, context: any, info: any) => {
			// info.fieldNodes[0].selectionSet.selections.map((selection: any) => console.log(JSON.stringify(selection, null, 4)));

			return await Effect.runPromise(ant.deep_submodels(max_depth, follow_references, class_name));
		},

		feature_targets: async (ant: Ant, { category }: { category: string }) => await Effect.runPromise(ant.feature_targets(category)),

		string_value: async (ant: Ant, { path }: { path: string }) => {
			if (!path) return await Effect.runPromise(ant.string_value());
			else {
				// console.log("ant", ant.node_ids);
				const at = await Effect.runPromise(ant.at(path));
				if (!at) return null;
				return await Effect.runPromise(at.string_value());
			}
		},
		number_value: async (ant: Ant, { path }: { path: string }) => {
			if (!path) return await Effect.runPromise(ant.number_value());
			else return await Effect.runPromise(ant.at(path).pipe(Effect.flatMap((element) => element?.number_value() || Effect.succeed(null))));
		},
		boolean_value: async (ant: Ant, { path }: { path: string }) => {
			if (!path) return await Effect.runPromise(ant.boolean_value());
			else return await Effect.runPromise(ant.at(path).pipe(Effect.flatMap((element) => element?.boolean_value() || Effect.succeed(null))));
		},

		string_array_value: async (ant: Ant, { path }: { path: string }) => {
			if (!path) return await Effect.runPromise(ant.string_array_value());
			else return await Effect.runPromise(ant.at(path).pipe(Effect.flatMap((element) => element?.string_array_value() || Effect.succeed(null))));
		},
		number_array_value: async (ant: Ant, { path }: { path: string }) => {
			if (!path) return await Effect.runPromise(ant.number_array_value());
			else return await Effect.runPromise(ant.at(path).pipe(Effect.flatMap((element) => element?.number_array_value() || Effect.succeed(null))));
		},
		boolean_array_value: async (ant: Ant, { path }: { path: string }) => {
			if (!path) return await Effect.runPromise(ant.boolean_array_value());
			else return await Effect.runPromise(ant.at(path).pipe(Effect.flatMap((element) => element?.boolean_array_value() || Effect.succeed(null))));
		},
		interfaces: async (ant: Ant) => (await Effect.runPromise(ant.provided_interfaces())).map((i) => i.interface),
		interface_constraints: async (ant: Ant) => await Effect.runPromise(ant.interface_constraints()),
		prototype_constraints: async (ant: Ant) => await Effect.runPromise(ant.prototype_constraints()),
		superclass_constraints: async (ant: Ant) => await Effect.runPromise(ant.superclass_constraints()),
		suggest_references: async (ant: Ant, { page, page_size }: { page?: number; page_size?: number }) => await Effect.runPromise(ant.suggest_references()),
	},

	InstancesGroup: {
		aggregate: async ({ ant, where, sort }: { ant: Ant; where: InstanceWhereInput[]; sort: InstanceSortInput }) => {
			return {
				ant: ant,
				where: where,
			};
		},
		list: async (
			{ ant, where, sort }: { ant: Ant; where?: InstanceWhereInput[]; sort?: InstanceSortInput },
			{
				page,
				page_size,
			}: {
				page?: number;
				page_size?: number;
			},
		) => {
			// console.log({ ant: ant.path, where, sort, page, page_size });
			// const start = Date.now();
			const r = await Effect.runPromise(ant.it2_direct_instances(where, sort, page, page_size));
			// const duration = Date.now() - start;
			// console.log(`list : ${duration}ms`);
			return r;
		},
	},

	Aggregate: {
		count: async ({ ant, where }: { ant: Ant; where: InstanceWhereInput[] }) => await Effect.runPromise(ant.it2_count_direct_instances(where)),
		min: async ({ ant, where }: { ant: Ant; where: InstanceWhereInput[] }, { at }: { at: string }) => await Effect.runPromise(ant.aggregate_direct_instances("min", at, where)),
		max: async ({ ant, where }: { ant: Ant; where: InstanceWhereInput[] }, { at }: { at: string }) => await Effect.runPromise(ant.aggregate_direct_instances("max", at, where)),
		sum: async ({ ant, where }: { ant: Ant; where: InstanceWhereInput[] }, { at }: { at: string }) => await Effect.runPromise(ant.aggregate_direct_instances("sum", at, where)),
		average: async ({ ant, where }: { ant: Ant; where: InstanceWhereInput[] }, { at }: { at: string }) => await Effect.runPromise(ant.aggregate_direct_instances("average", at, where)),
	},

	ModelMutation: {
		model: async (ant: Ant) => ant,

		at: async (ant: Ant, { submodel }: { submodel: string }) => await Effect.runPromise(ant.at(submodel)),

		set_label: async (ant: Ant, { label }: { label: string }): Promise<Ant> => await Effect.runPromise(ant.set_label(label)),
		set_description: async (ant: Ant, { description }: { description: string }): Promise<Ant> => await Effect.runPromise(ant.set_description(description)),
		create_submodel: async (ant: Ant, { subpath, label }: { subpath: string; label: string }): Promise<Ant> => await Effect.runPromise(ant.create_submodel(subpath, label)),
		set_class: async (ant: Ant, { class: _class }: { class: string }): Promise<Ant> => await Effect.runPromise(ant.set_class(_class)),
		set_classes: async (ant: Ant, { classes }: { classes: string[] }): Promise<Ant> => await Effect.runPromise(ant.set_classes(classes)),

		it2_extend: async (ant: Ant): Promise<Ant> => await Effect.runPromise(ant.extend()),
		it2_instantiate: async (ant: Ant): Promise<Ant | null> => await Effect.runPromise(ant.instantiate()),

		it2_add_prototype: async (ant: Ant, { prototype }: { prototype: string }): Promise<Ant> => {
			await Effect.runPromise(ant.add_prototype(prototype));
			return ant;
		},
		it2_add_superclass: async (ant: Ant, { superclass }: { superclass: string }): Promise<Ant> => await Effect.runPromise(ant.add_superclass(superclass)),

		remove_model: async (ant: Ant): Promise<boolean> => await Effect.runPromise(ant.remove()),

		create_submodel_template: async (ant: Ant, { name }: { name: string }): Promise<Ant> => await Effect.runPromise(ant.create_submodel_template(name)),
		create_submodel_template_from_prototype: async (ant: Ant, { name }: { name: string }): Promise<Ant> => await Effect.runPromise(ant.create_submodel_template_from_prototype(name)),

		// use_submodel_template: async (ant: Ant, { template, subpath, label, as_reference, as_constraint, array }: { template: string; subpath: string; label: string; as_reference: boolean; as_constraint: boolean; array: boolean }): Promise<Ant | undefined> => await Effect.runPromise(ant.use_submodel_template(template, subpath, label, as_reference, as_constraint, array)),

		create_submodel_from_prototype: async (ant: Ant, { prototype, array, as_reference, instantiate, label, subpath }: { prototype: string; subpath?: string; label?: string; as_reference?: boolean; instantiate?: boolean; array?: boolean }): Promise<Ant> => await Effect.runPromise(ant.create_submodel_from_prototype(prototype, subpath, label, as_reference, instantiate, array)),

		set_reference: async (ant: Ant, { reference }: { reference: string }): Promise<Ant> => await Effect.runPromise(ant.set_reference(reference)),
		remove_reference: async (ant: Ant): Promise<Ant> => await Effect.runPromise(ant.remove_reference()),

		set_string_value: async (ant: Ant, { value }: { value: string }): Promise<Ant> => (await Effect.runPromise(ant.set_string_value(value))) || ant,
		set_number_value: async (ant: Ant, { value }: { value: number }): Promise<Ant> => (await Effect.runPromise(ant.set_number_value(value))) || ant,
		set_boolean_value: async (ant: Ant, { value }: { value: boolean }): Promise<Ant> => (await Effect.runPromise(ant.set_boolean_value(value))) || ant,
		set_string_array_value: async (ant: Ant, { value }: { value: string[] }): Promise<Ant> => (await Effect.runPromise(ant.set_string_array_value(value))) || ant,
		set_number_array_value: async (ant: Ant, { value }: { value: number[] }): Promise<Ant> => (await Effect.runPromise(ant.set_number_array_value(value))) || ant,
		set_boolean_array_value: async (ant: Ant, { value }: { value: boolean[] }): Promise<Ant> => (await Effect.runPromise(ant.set_boolean_array_value(value))) || ant,

		remove_value: async (ant: Ant): Promise<Ant> => await Effect.runPromise(ant.unlink_value()),

		use_feature: async (ant: Ant, { feature }: { feature: string }): Promise<Ant> => await Effect.runPromise(ant.use_feature_prototype(feature)),
		use_existing_feature: async (ant: Ant, { feature, kind }: { feature: string; kind: CATEGORY }): Promise<Ant> => await Effect.runPromise(ant.use_existing_feature(feature, kind)),
		// extend_feature_prototype: async (ant: Ant, { feature, name, kind }: { feature: string; name: string, kind: CATEGORY }): Promise<Ant> => await Effect.runPromise(ant.extend_feature_prototype(feature, kind, name)),

		as: async (ant: Ant) => ant,

		add_interface_constraint: async (ant: Ant, { interface: _interface }: { interface: string }): Promise<Ant> => await Effect.runPromise(ant.add_interface_constraint(_interface)),
		remove_interface_constraint: async (ant: Ant, { interface: _interface }: { interface: string }): Promise<Ant> => await Effect.runPromise(ant.remove_interface_constraint(_interface)),

		add_prototype_constraint: async (ant: Ant, { prototype, is_array }: { prototype: string; is_array: boolean }): Promise<Ant | boolean> => await Effect.runPromise(ant.add_prototype_constraint(prototype, is_array)),
		remove_prototype_constraint: async (ant: Ant, { prototype }: { prototype: string }): Promise<Ant> => await Effect.runPromise(ant.remove_prototype_constraint(prototype)),

		add_superclass_constraint: async (ant: Ant, { superclass }: { superclass: string }): Promise<Ant> => await Effect.runPromise(ant.add_superclass_constraint(superclass)),
		remove_superclass_constraint: async (ant: Ant, { superclass }: { superclass: string }): Promise<Ant> => await Effect.runPromise(ant.remove_superclass_constraint(superclass)),
	},

	Mutation: {
		create_model: async (_: null, { path, label }: CreateModelInput) => await Effect.runPromise(Ant.create_mutable_model(path, label)),
		at: async (_: null, { path }: { path: string }) => await Effect.runPromise(Ant.mutable_from_path(path)),

		login: async (_: null, { username, password }: { username: string; password: string }) => {
			const users = await Effect.runPromise(Ant.find_instances_by_value("user", "name", username));

			// console.log(users.length\);

			if (!users.length) {
				throw new GraphQLError("Invalid credentials");
			}

			const user = users[0];

			// console.log(user);

			const hashed_password = await Effect.runPromise(user.string_value("hashed_password"));

			// console.log({ hashed_pas\sword });
			if (!hashed_password) {
				throw new GraphQLError("Invalid credentials");
			}

			const derived_key = crypto.pbkdf2Sync(password, process.env.USER_SALT || "default-salt", 10000, 32, "sha256");

			// console.log({
			// 	password,
			// 	derived_key,
			// 	buffer: Buffer.from(hashed_password, "base64")
			// })

			if (!crypto.timingSafeEqual(Buffer.from(hashed_password, "base64"), derived_key)) {
				throw new GraphQLError("Incorrect username or password");
			}

			// JWT token creation
			const token = jwt.sign({ user_nodes: user.nodes }, process.env.JWT_SECRET || "default-secret", {
				subject: user.path,
				// expiresIn: "1h", // Optional: set token expiration
			});

			return token;
		},

		_delete_everything: async () => {
			console.log("delete everything");
			await __delete_everything();
		},
	},

	Statistics: {
		db_cpu_credit_balance: async () => {
			console.log("Fetching db_cpu_credit_balance");

			async function getCpuCreditBalance(instanceId: string) {
				const endTime = new Date();
				const startTime = new Date(endTime.getTime() - 3600 * 1000); // 1 hour ago

				const command = new GetMetricDataCommand({
					MetricDataQueries: [
						{
							Id: "cpuCreditBalanceQuery",
							MetricStat: {
								Metric: {
									Namespace: "AWS/EC2",
									MetricName: "CPUCreditBalance",
									Dimensions: [{ Name: "InstanceId", Value: instanceId }],
								},
								Period: 60 * 5,
								Stat: "Average",
							},
						},
					],
					StartTime: startTime,
					EndTime: endTime,
				});

				const response = await cloudWatchClient.send(command);
				const metricData = response.MetricDataResults[0]?.Values;

				// console.log({ metricData });

				return metricData ? metricData[0] : null; // Latest value
			}

			if (!db_instance) {
				return null;
			}

			const cpuCreditBalance = await getCpuCreditBalance(db_instance.InstanceId);

			return cpuCreditBalance;
		},
	},
};

export interface StringFilter {
	at: string;
	not_null?: boolean;
	contains?: string;
	not_contains?: string;
	starts_with?: string;
	ends_with?: string;
	equal_to?: string;
	length_greater_than?: number;
	length_less_than?: number;
}

export interface NumberFilter {
	at: string;
	not_null?: boolean;
	greater_than?: number;
	less_than?: number;
	equal_to?: number;
}

export interface BooleanFilter {
	at: string;
	null?: boolean;
	not_null?: boolean;
	equal_to?: boolean;
}

export interface DateFilter {
	at: string;
	not_null?: boolean;
	null?: boolean;
	before_date?: number;
	after_date?: number;
	older_than_seconds?: number;
	newer_than_seconds?: number;
}

export interface ReferenceFilter {
	at: string;
	null?: boolean;
	not_null?: boolean;
	is?: string;
}

const mvp_resolvers = {
	Model: {
		path: (ant: Ant) => ant.path,
		label: (ant: Ant) => ant.label,
		description: async (ant: Ant) => await Effect.runPromise(ant.description()),
		at: async (ant: Ant, { submodel }: { submodel: string }) => await Effect.runPromise(ant.at(submodel)),
		submodels: async (ant: Ant) => await Effect.runPromise(ant.submodels()),
		reference: async (ant: Ant) => await Effect.runPromise(ant.reference()),

		reverse_references: async (ant: Ant) => await Effect.runPromise(ant.reverse_references()),
		prototypes: async (ant: Ant) => await Effect.runPromise(ant.it2_prototypes()),
		direct_prototypes: async (ant: Ant) => await Effect.runPromise(ant.it2_direct_prototypes()),
		subclasses: async (ant: Ant) => await Effect.runPromise(ant.it2_subclasses()),
		direct_subclasses: async (ant: Ant) => await Effect.runPromise(ant.it2_direct_subclasses()),
		superclasses: async (ant: Ant) => await Effect.runPromise(ant.it2_superclasses()),
		direct_superclasses: async (ant: Ant) => await Effect.runPromise(ant.it2_direct_superclasses()),
		instances: async (ant: Ant, { string_filters, number_filters, boolean_filters, date_filters, reference_filters }: { string_filters: StringFilter[]; number_filters: NumberFilter[]; boolean_filters: BooleanFilter[]; date_filters: DateFilter[]; reference_filters: ReferenceFilter[] }) => await Effect.runPromise(ant.instances(undefined, undefined, string_filters, number_filters, boolean_filters, date_filters, reference_filters)),
		direct_instances: async (ant: Ant, { string_filters, number_filters, boolean_filters, date_filters, reference_filters }: { string_filters: StringFilter[]; number_filters: NumberFilter[]; boolean_filters: BooleanFilter[]; date_filters: DateFilter[]; reference_filters: ReferenceFilter[] }) => await Effect.runPromise(ant.direct_instances(undefined, undefined, string_filters, number_filters, boolean_filters, date_filters, reference_filters)),
		unfilled_slots: async (ant: Ant) => await Effect.runPromise(ant.unfilled_slots()),
		if_has_class: async (ant: Ant, { name }: { name: string }) => await Effect.runPromise(ant.if_has_class(name)),
		string_value: async (ant: Ant, { path }: { path: string }) => await Effect.runPromise(ant.string_value(path)),
		number_value: async (ant: Ant, { path }: { path: string }) => await Effect.runPromise(ant.number_value(path)),
		boolean_value: async (ant: Ant, { path }: { path: string }) => await Effect.runPromise(ant.boolean_value(path)),
		interfaces: async (ant: Ant) => (await Effect.runPromise(ant.provided_interfaces())).map((i) => i.interface),
		interface_constraints: async (ant: Ant) => await Effect.runPromise(ant.interface_constraints()),
		constraints: async (ant: Ant) => await Effect.runPromise(ant.prototype_constraints()),
		if_interface: async (ant: Ant, { _interface }: { _interface: string }) => ((await Effect.runPromise(ant.provided_interfaces())).map((i) => i.interface).find((i) => i === _interface) ? ant : null),
		// ask: async (ant: Ant, { query }: { query: string }) => await Effect.runPromise(ant.ask(query)),
		suggest_references: async (ant: Ant, { query }: { query: string }) => await Effect.runPromise(ant.suggest_references(query)),

		submodel_templates: async (ant: Ant) => await Effect.runPromise(ant.submodel_templates()),

		filters: async (ant: Ant, { category }: { category: CATEGORY }) => await Effect.runPromise(ant.features(CATEGORY.FILTER)),
		filter_prototypes: async (ant: Ant, { category }: { category: CATEGORY }) => await Effect.runPromise(ant.feature_prototypes(CATEGORY.FILTER)),
		feature_prototypes: async (ant: Ant, { category }: { category: CATEGORY }) => await Effect.runPromise(ant.feature_prototypes(category)),

		// create_state_machine: async (ant: Ant, { name }: { name: string }) => await Effect.runPromise(ant.create_state_machine(name)),
		// state: async (ant: Ant, { path }: { path: string }) => await Effect.runPromise(ant.get_state(path)),
		// find_instances_by_state: async (ant: Ant, { state }: { state: string }) => await Effect.runPromise(ant.find_instances_by_state(state)),

		features: async (ant: Ant, { category }: { category: CATEGORY }) => await Effect.runPromise(ant.features(category)),
		feature_targets: async (ant: Ant, { category, path_root }: { category: string; path_root: string }) => await Effect.runPromise(ant.feature_targets(category, path_root)),
		feature_prototype_targets: async (ant: Ant, { category }: { category: string }) => await Effect.runPromise(ant.feature_prototype_targets(category)),

		// state: async (ant: Ant, { name }: { name: string }) => await Effect.runPromise(ant.state(name)),
		// states: async (ant: Ant) => await Effect.runPromise(ant.states()),
		state_machine: async (ant: Ant, { name }: { name: string }) => await Effect.runPromise(ant.state_machine(name)),

		as: async (ant: Ant) => ant,
	},

	// StateMachine: {
	// 	path: (stateMachine: Ant) => stateMachine.path,
	// 	label: (stateMachine: Ant) => stateMachine.label,
	// 	states: async (stateMachine: Ant) => await Effect.runPromise(stateMachine.get_states()),
	// },

	// State: {
	// 	name: (state: State) => state.name,
	// 	isEntry: (state: State) => state.isEntry,
	// 	isFinale: (state: State) => state.isFinale,
	// 	activeTransitions: async (state: State) => await Effect.runPromise(state.get_active_transitions()),
	// 	passiveTransitions: async (state: State) => await Effect.runPromise(state.get_passive_transitions()),
	// },

	// Transition: {
	// 	to: (transition: Transition) => transition.to,
	// 	requiredFields: (transition: Transition) => transition.requiredFields,
	// 	condition: (transition: Transition) => transition.condition,
	// },

	Feature: {
		category: (feature: { category: string }) => feature.category,
		model: (feature: { model: Ant }) => feature.model,
	},

	ModelSearchResult: {
		model: (result: { model: Ant }) => result.model,
		score: (result: { score: number }) => result.score,
	},

	FeatureSearchResult: {
		feature: (result: { feature: Ant }) => result.feature,
		score: (result: { score: number }) => result.score,
	},

	Query: {
		model: async (_: null, { path }: { path: string }) => await Effect.runPromise(Ant.from_path(path)),
		models: async (_: null, { paths }: { paths: string[] }) => await Effect.all(paths.map((path) => Ant.from_path(path))),

		prototypes: async (_: null) => await Effect.runPromise(Ant.all_prototypes()),

		search_models: async (_: null, { query }: { query: string }) => await Effect.runPromise(Ant.search_models(query)),
		ask: async (_: null, { query }: { query: string }) => await Effect.runPromise(Ant.ask(query)),
		explain: async (_: null, { query }: { query: string }) => await Effect.runPromise(Ant.explain(query)),

		async *extract(_: null, { text }: { text: string }) {
			yield* extract(text);
		},
	},

	ModelMutation: {
		model: (ant: Ant) => ant,
		done: (ant: Ant) => true,
		instantiate: async (ant: Ant, { path, label, prototype }: { path: string; label: string; prototype: string }) => await Effect.runPromise(ant.instantiate(path, label)),
		extend: async (ant: Ant, { path, label, prototype }: { path: string; label: string; prototype: string }) => await Effect.runPromise(ant.extend(path, label)),


		add_prototype: async (ant: Ant, { prototype }: { prototype: string }) => await Effect.runPromise(ant.add_prototype(prototype)),
		add_superclass: async (ant: Ant, { superclass }: { superclass: string }) => await Effect.runPromise(ant.add_superclass(superclass)),


		set_label: async (ant: Ant, { label }: { label: string }) => await Effect.runPromise(ant.set_label(label)),
		set_description: async (ant: Ant, { description }: { description: string }) => await Effect.runPromise(ant.set_description(description)),
		create_submodel: async (ant: Ant, { subpath, label, prototype }: { subpath: string; label: string; prototype: string }) => await Effect.runPromise(ant.create_submodel(subpath, label, prototype)),
		at: async (ant: Ant, { submodel }: { submodel: string }) => await Effect.runPromise(ant.at(submodel)),
		// set_induction_threshold: async (ant: Ant, { minimal_support, absolute_support }: { minimal_support: number; absolute_support: number }) => await Effect.runPromise(ant.set_induction_threshold(minimal_support, absolute_support)),
		// suggest_induction: async (ant: Ant, { minimal_support, absolute_support }: { minimal_support: number; absolute_support: number }) => await Effect.runPromise(ant.suggest_induction(minimal_support, absolute_support)),
		remove_model: async (ant: Ant) => await Effect.runPromise(ant.remove()),
		set_reference: async (ant: Ant, { reference }: { reference: string }) => await Effect.runPromise(ant.set_reference(reference)),
		remove_reference: async (ant: Ant) => await Effect.runPromise(ant.remove_reference()),
		set_string_value: async (ant: Ant, { value }: { value: string }) => await Effect.runPromise(ant.set_string_value(value)),
		set_number_value: async (ant: Ant, { value }: { value: number }) => await Effect.runPromise(ant.set_number_value(value)),
		set_boolean_value: async (ant: Ant, { value }: { value: boolean }) => await Effect.runPromise(ant.set_boolean_value(value)),
		remove_value: async (ant: Ant) => await Effect.runPromise(ant.unlink_value()),
		add_interface_constraint: async (ant: Ant, { _interface }: { _interface: string }) => await Effect.runPromise(ant.add_interface_constraint(_interface)),
		remove_interface_constraint: async (ant: Ant, { _interface }: { _interface: string }) => await Effect.runPromise(ant.remove_interface_constraint(_interface)),
		add_prototype_constraint: async (ant: Ant, { prototype, is_array }: { prototype: string; is_array: boolean }) => await Effect.runPromise(ant.add_prototype_constraint(prototype, is_array)),
		remove_prototype_constraint: async (ant: Ant, { prototype }: { prototype: string }) => await Effect.runPromise(ant.remove_prototype_constraint(prototype)),

		use_filter: async (ant: Ant, { feature }: { feature: string }): Promise<Ant> => await Effect.runPromise(ant.use_feature_prototype(feature)),
		use_feature: async (ant: Ant, { feature }: { feature: string }): Promise<Ant> => await Effect.runPromise(ant.use_feature_prototype(feature)),
		use_existing_feature: async (ant: Ant, { feature, kind }: { feature: string; kind: CATEGORY }): Promise<Ant> => await Effect.runPromise(ant.use_existing_feature(feature, kind)),

		create_submodel_from_prototype: async (ant: Ant, { prototype, array, as_reference, instantiate, label, subpath }: { prototype: string; subpath?: string; label?: string; as_reference?: boolean; instantiate?: boolean; array?: boolean }): Promise<Ant> => await Effect.runPromise(ant.create_submodel_from_prototype(prototype, subpath, label, as_reference, instantiate, array)),

		as: async (ant: Ant) => ant,

		create_state_machine: async (ant: Ant, { name, entry_state }: { name: string; entry_state: string }) => await Effect.runPromise(ant.create_state_machine(name, entry_state)),
		// state: async (ant: Ant, { name }: { name: string }) => await Effect.runPromise(ant.state(name)),
		state_machine: async (ant: Ant, { name }: { name: string }) => await Effect.runPromise(ant.state_machine(name)),
	},

	// TransitionMutation: {
	// 	connect: async (transition: Transition, { submodel }: { submodel: string }) => await Effect.runPromise(transition.connect(submodel)),
	// 	done: (transition: Transition) => true,
	// },

	Mutation: {
		create_model: async (_: null, { path, label, prototype }: { path: string; label: string; prototype: string }) => await Effect.runPromise(Ant.create_model(path, label, prototype)),
		at: async (_: null, { path }: { path: string }) => await Effect.runPromise(Ant.from_path(path)),

		_delete_everything: async () => {
			console.log("delete everything");
			await __delete_everything();
			return true;
		},
	},
};

const merged_mvp_types = mergeTypeDefs([mvp_types_definition, ...mvp_schemas.map((schema) => schema.typeDefs)]);
const merged_mvp_resolvers = mergeResolvers([mvp_resolvers, ...mvp_schemas.map((schema) => schema.resolvers)]);

const exporter = new JaegerExporter({
	endpoint: "http://localhost:14268/api/traces",
});

const provider = new BasicTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();

// const yoga = createYoga({
// 	graphiql: {
// 		subscriptionsProtocol: "WS",
// 	},
// 	schema: createSchema({
// 		typeDefs: merged_types,
// 		resolvers: merged_resolvers,
// 	}),
// 	plugins: [
// 		useEngine({ parse, validate, specifiedRules, execute, subscribe }),
// 		useDeferStream(),
// 		useGraphQlJit(),
// 		useOpenTelemetry(
// 			{
// 				resolvers: true,
// 				variables: true,
// 				result: true,
// 			},
// 			provider,
// 			undefined,
// 			undefined,
// 			"awmt-broker",
// 		),
// 		useJWT({
// 			issuer: "http://awmtconsole.com",
// 			signingKey: process.env.JWT_SECRET || "secret",
// 		}),
// 	]
// })
// ;


const mvp_yoga = createYoga({
	// graphiql: {
	// 	subscriptionsProtocol: "WS",
	// },
	// schema: createSchema({
	// 	typeDefs: mvp_types_definition,
	// 	resolvers: mvp_resolvers,
	// }),
	// plugins: [
	// 	// useEngine({ parse, validate, specifiedRules, execute, subscribe }),
	// 	useDeferStream(),
	// 	useGraphQlJit(),
	// 	useOpenTelemetry(
	// 		{
	// 			resolvers: true,
	// 			variables: true,
	// 			result: true,
	// 		},
	// 		provider,
	// 		undefined,
	// 		undefined,
	// 		"awmt-broker",
	// 	),
	// 	useJWT({
	// 		issuer: "http://awmtconsole.com",
	// 		signingKey: process.env.JWT_SECRET || "secret",
	// 	}),
	// ],

	// schema: createSchema({
	// 	typeDefs: mvp_types_definition,
	// 	resolvers: mvp_resolvers,
	// }),

	schema: createSchema({
		typeDefs: merged_mvp_types,
		resolvers: merged_mvp_resolvers,
	}),
	plugins: [
		useEngine({ parse, validate, specifiedRules, execute, subscribe }),
		useDeferStream(),
		useGraphQlJit(),
		useOpenTelemetry(
			{
				resolvers: true,
				variables: true,
				result: true,
			},
			provider,
			undefined,
			undefined,
			"awmt-broker",
		),
	],
});

// console.info(`— Jaeger UI : http://${server.hostname}:16686`);
// console.info(`— GraphQL Server : ${new URL(yoga.graphqlEndpoint, `http://${server.hostname}:${server.port}`)}`);

import cors from "cors";
import express from "express";
import CATEGORY from "../native/feature_categories";
import { InstanceSortInput, InstanceWhereInput } from "./filter";

const app = express();
// const port = 3003;

app.use(cors());

app.use(express.json());

// console.log(yoga.graphqlEndpoint);

// app.use(express.static(path.join(__dirname, "../console/dist")));

// app.get("*", (req, res) => {
// 	res.sendFile(path.join(__dirname, "../console/dist", "index.html"));
// });

// app.listen(3001, "0.0.0.0", () => {
// 	// console.log(`http://${server.hostname}:${port}`);
// 	console.log("Listening");
// });

const server =
	process.env.ENVIRONMENT === "dev"
		? Bun.serve({
				fetch: mvp_yoga,
				// port: process.env.GRAPHQL_API_PORT,
			})
		: Bun.serve({
				fetch: mvp_yoga,
				// port: process.env.GRAPHQL_API_PORT,
				port: 443,
				tls: {
					cert: Bun.file("cert.pem"),
					key: Bun.file("key.pem"),
				},
			});

console.log("serving on", server.port);

import { makeExecutableSchema } from "@graphql-tools/schema";
import { useServer } from "graphql-ws/lib/use/ws";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { extract } from "./methods/ai";

const httpServer = createServer(app);

// const schema = makeExecutableSchema({ typeDefs: merged_types, resolvers: merged_resolvers });

const mvp_schema = makeExecutableSchema({ typeDefs: mvp_types_definition, resolvers: mvp_resolvers });

// ...
// const server = new ApolloServer({
// 	schema,
// 	plugins: [
// 		ApolloServerPluginDrainHttpServer({ httpServer }),
// 		{
// 			async serverWillStart() {
// 				return {
// 					async drainServer() {
// 						await serverCleanup.dispose();
// 					},
// 				};
// 			},
// 		},
// 	],
// });

// const mvp_server = new ApolloServer({
// 	schema: mvp_schema,
// 	plugins: [
// 		ApolloServerPluginDrainHttpServer({ httpServer }),
// 		{
// 			async serverWillStart() {
// 				return {
// 					async drainServer() {
// 						await serverCleanup.dispose();
// 					},
// 				};
// 			},
// 		},
// 	],
// });

const wsServer = new WebSocketServer({
	// This is the `httpServer` we created in a previous step.
	server: httpServer,
	// Pass a different path here if app.use
	// serves expressMiddleware at a different path
	path: "/subscriptions",
});

wsServer.on("connection", (socket) => {
	// Check if the socket has a ping method
	if (!socket.ping) {
		socket.ping = () => {
			if (socket.readyState === WebSocket.OPEN) {
				// Send a keep-alive message expected by Apollo Client
				// socket.send(JSON.stringify({ type: 'pong' }));
				// console.log("Keep-alive message sent");
			}
		};
	}

	if (!socket.terminate) {
		// If not, polyfill it with a custom implementation
		socket.terminate = () => {
			// console.log("Terminate method called");
			if (socket.close) {
				socket.close();
			} else {
				// console.warn("Socket does not have a close method");
			}
		};
	}

	// const original_send = socket.send;

	// socket.send = new Proxy(original_send, {
	// 	// async apply(target, thisArg, args) {
	// 	// 	const [message] = args;
	// 	// 	console.log("Message sent", message);

	// 	// 	// @ts-ignore
	// 	// 	return await target.apply(thisArg, args);
	// 	// },

	// 	apply: (target, thisArg, args) =>
	// 		new Promise((resolve) => {
	// 			const [message] = args;

	// 			resolve(message);

	// 			console.log("Message sent1", message);

	// 			// @ts-ignore
	// 			target.apply(thisArg, args);

	// 			console.log("Message sent2", message);
	// 		}),

	// });
});

// await server.start();

// await mvp_server.start();

app.get("/ping", (req, res) => {
	res.send("pong");
});

// app.use("/", cors<cors.CorsRequest>(), express.json(), expressMiddleware(server));
// app.use("/mvp/", cors<cors.CorsRequest>(), express.json(), expressMiddleware(mvp_server));
// app.use("/mvp/", cors<cors.CorsRequest>(), express.json(), expressMiddleware(mvp_server));

console.log({ graphql: mvp_yoga.graphqlEndpoint });
app.use(mvp_yoga.graphqlEndpoint, mvp_yoga);

// Now that our HTTP server is fully set up, we can listen to it.
// httpServer.listen("4004", () => {
// 	console.log(`Server is now running on http://localhost:${4004}/graphql`);
// });

// const serverCleanup = useServer(
// 	{
// 		schema,
// 		// execute,
// 		// subscribe,
// 		// context: (ctx) => ctx,

// 		// onOperation: async (ctx, message, params, result, ) => {

// 		// 	console.log("params", message);

// 		// 	console.log("result", result);

// 		// 	// // @ts-ignore
// 		// 	// result.next()

// 		// 	// // @ts-ignore
// 		// 	// result.next()

// 		// 	return result;

// 		// }
// 	},
// 	wsServer,
// );

async function findInstanceByPrivateIp(ip: string) {
	const command = new DescribeInstancesCommand({
		Filters: [{ Name: "private-ip-address", Values: [ip] }],
	});
	const response = await ec2Client.send(command);
	return response.Reservations[0]?.Instances[0] || null;
}

// const db_instance = await findInstanceByPrivateIp(process.env.REDIS_URL!.replace("redis://", "").split(":")[0]) as any
const db_instance = await findInstanceByPrivateIp("172.31.1.187");

// import { ChatOpenAI } from "@langchain/openai";
// import { LLMGraphTransformer } from "@langchain/community/experimental/graph_transformers/llm";
// import { Document } from "@langchain/core/documents";
// import { ChatAnthropic } from "@langchain/anthropic";

// const model = new ChatOpenAI({
// 	temperature: 0,
// 	modelName: "gpt-4-turbo-preview",
// 	// verbose: true
// });

// // const model = new ChatAnthropic({
// // 	apiKey: process.env.ANTHROPIC_API_KEY,
// // 	model: "claude-3-haiku-20240307",
// // 	// model: "claude-3-opus-20240229",
// // 	// temperature: 0,
// // });

// const llmGraphTransformer = new LLMGraphTransformer({
// 	llm: model,
// 	allowedNodes: ["PERSON", "COUNTRY", "ORGANIZATION"],
// 	allowedRelationships: ["NATIONALITY", "LOCATED_IN", "WORKED_AT", "SPOUSE"],
// });

// import { Document } from "@langchain/core/documents";

// let text = "jenson huang founded nvidia in 1994, a company that makes GPUs, and is still its ceo. his cousin is Lisa Su, the CEO of AMD. Nvidia and AMD are both technology companies.";
// let text = `
// Marie Curie, was a Polish and naturalised-French physicist and chemist who conducted pioneering research on radioactivity.
// She was the first woman to win a Nobel Prize, the first person to win a Nobel Prize twice, and the only person to win a Nobel Prize in two scientific fields.
// Her husband, Pierre Curie, was a co-winner of her first Nobel Prize, making them the first-ever married couple to win the Nobel Prize and launching the Curie family legacy of five Nobel Prizes.
// She was, in 1906, the first woman to become a professor at the University of Paris.
// `;

// const start = Date.now();

// const result = await llmGraphTransformer.convertToGraphDocuments([new Document({ pageContent: text })]);

// console.log("NODES", result[0].nodes);
// console.log("EDGES", result[0].relationships);

// console.log(`Nodes: ${result[0].nodes.length}`);
// console.log(`Relationships:${result[0].relationships.length}`);

// const duration = Date.now() - start;

// console.log(`Duration: ${duration}ms`);

// import "neo4j-driver";
// import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";

// const url = process.env.NEO4J_URI as string;
// const username = process.env.NEO4J_USERNAME as string;
// const password = process.env.NEO4J_PASSWORD as string;

// console.log({ url, username, password });

// try {
// 	const graph = await Neo4jGraph.initialize({ url, username, password });
// 	console.log("Graph initialized");
// 	const r = await graph.addGraphDocuments(result);

// 	console.log(r);
// } catch (e) {
// 	console.error(e);
// }
