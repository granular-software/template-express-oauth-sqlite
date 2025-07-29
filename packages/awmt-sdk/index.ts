import * as z from "zod";
import { api } from "./api";
import AwmtObject from "./AwmtObject";
import { AwmtStateMachine, StateDefinition } from "./AwmtStateMachine";
import { MutationPromiseChain, QueryPromiseChain } from "./api/schema";

export type FieldDefinitionOutput = { kind: "scalar"; type: "string" | "number" | "boolean" | "date" } | { kind: "reference"; type: string };

export type FieldDefinition = {
	string: () => { kind: "scalar"; type: "string" };
	number: () => { kind: "scalar"; type: "number" };
	boolean: () => { kind: "scalar"; type: "boolean" };
	date: () => { kind: "scalar"; type: "date" };
	reference: (type_name: string) => { kind: "reference"; type: string };
	many_references: (type_name: string) => { kind: "reference"; type: string };
};

export type InferField<T extends FieldDefinitionOutput> = T extends {
	kind: "scalar";
	type: "string";
}
	? string
	: T extends { kind: "scalar"; type: "number" }
		? number
		: T extends { kind: "scalar"; type: "boolean" }
			? boolean
			: T extends { kind: "scalar"; type: "date" }
				? Date
				: T extends { kind: "reference"; type: string }
					? string
					: never;

export type InferSchema<T extends Record<string, FieldDefinitionOutput>> = {
	[K in keyof T]: InferField<T[K]>;
};

export function makeZodSchema<T extends Record<string, FieldDefinitionOutput>>(input: T): z.ZodObject<{ [K in keyof T]: z.ZodOptional<z.ZodTypeAny> }, "strict"> {
	const schemaShape: { [K in keyof T]: z.ZodOptional<z.ZodTypeAny> } = {} as any;

	for (const [key, value] of Object.entries(input)) {
		let fieldSchema: z.ZodTypeAny;
		if (value.kind === "scalar") {
			switch (value.type) {
				case "string":
					fieldSchema = z.string();
					break;
				case "number":
					fieldSchema = z.number();
					break;
				case "boolean":
					fieldSchema = z.boolean();
					break;
				case "date":
					fieldSchema = z.date();
					break;
			}
		} else {
			fieldSchema = z.string(); // For reference types
		}
		schemaShape[key as keyof T] = fieldSchema.optional();
	}

	return z.object(schemaShape).strict();
}

interface StateMachineScope<TransitionStates extends StateDefinition, FinaleStates extends StateDefinition, TargetObjectSchema extends z.ZodObject<any>, ObjectDefinition extends Record<string, FieldDefinitionOutput>> {
	state: AwmtStateMachine<TransitionStates, FinaleStates, TargetObjectSchema, ObjectDefinition>;
	constraints: {
		[K in keyof Partial<ObjectDefinition>]: (field: { must_be: (value: string) => string }) => string;
	};
	search_by: (keyof ObjectDefinition)[];
}

interface AppManifest {
	name: string;
	description: string;
	author: string;
	primary_color: string;
	icon: string;
}

export default class AWMT {
	constructor(
		// private url?: string,
		// private token?: string,
		private manifest: AppManifest,
	) {
		this.manifest = manifest;

		// const query = api.chain.query as QueryPromiseChain;
		// const mutation = api.chain.mutation as MutationPromiseChain;

		// const declare_app = async () => {
		// 	const app = await mutation
		// 		.at({ path: "app" })
		// 		.instantiate({
		// 			path: this.manifest.name,
		// 			label: this.manifest.name,
		// 		})
		// 		.execute({
		// 			model: {
		// 				path: 1,
		// 				label: 1,
		// 			},
		// 		});

		// 	console.log("Declared app", app);

		// 	if (!app) {
		// 		throw new Error("Failed to create app " + this.manifest.name);
		// 	}

		// 	const app_model = mutation.at({ path: this.manifest.name });

		// 	if (!app_model) {
		// 		throw new Error("Failed to create app " + this.manifest.name);
		// 	}

		// 	await app_model
		// 		.at({ submodel: "name" })
		// 		.set_string_value({ value: this.manifest.name })
		// 		.execute({ model: { path: 1 } });

		// 	await app_model
		// 		.at({ submodel: "description" })
		// 		.set_string_value({ value: this.manifest.description })
		// 		.execute({ model: { path: 1 } });

		// 	await app_model
		// 		.at({ submodel: "author" })
		// 		.set_string_value({ value: this.manifest.author })
		// 		.execute({ model: { path: 1 } });

		// 	await app_model
		// 		.at({ submodel: "primary_color" })
		// 		.set_string_value({ value: this.manifest.primary_color })
		// 		.execute({ model: { path: 1 } });

		// 		await app_model
		// 		.at({ submodel: "icon" })
		// 		.set_string_value({ value: this.manifest.icon })
		// 		.execute({ model: { path: 1 } });

		// 	// console.log(r1, r2, r3, r4);
		// };

		// declare_app();
	}

	async entity<T extends Record<string, FieldDefinitionOutput>>(name: string, definitionCallback: (field: FieldDefinition) => T) {
		const field: FieldDefinition = {
			string: () => ({ kind: "scalar", type: "string" }),
			number: () => ({ kind: "scalar", type: "number" }),
			boolean: () => ({ kind: "scalar", type: "boolean" }),
			date: () => ({ kind: "scalar", type: "date" }),
			reference: (type_name: string) => ({ kind: "reference", type: type_name }),
			many_references: (type_name: string) => ({ kind: "reference", type: type_name }),
		};

		const objectDefinition = definitionCallback(field);

		const result = await (api.chain.mutation as MutationPromiseChain)
			.at({ path: "object" })
			.instantiate({
				path: name,
				label: name,
			})
			.execute({
				model: {
					path: 1,
					label: 1,
				},
			});

		const path = result?.model?.path;

		if (!path) {
			throw new Error("Failed to create model " + name);
		}

		// const obj = z.object(definitionCallback(field));

		const object_definition = definitionCallback(field);

		// const zod_schema = make_zod_schema(object_definition);

		for (const key in object_definition) {
			const kind = object_definition[key].kind;

			if (kind === "scalar") {
				const type = object_definition[key].type;

				await (api.chain.mutation as MutationPromiseChain)
					.at({ path })
					.create_submodel({
						subpath: key,
						prototype: type,
					})
					.execute({
						model: { path: 1 },
					});
			} else {
				const type = object_definition[key].type;

				await (api.chain.mutation as MutationPromiseChain)
					.at({ path })
					.create_submodel({
						subpath: key,
					})
					.add_prototype_constraint({
						prototype: type,
					})
					.execute({
						model: { path: 1 },
					});
			}
		}

		// return new AwmtObject<typeof zod_schema>(name, path, object_definition, zod_schema);
		return new AwmtObject(name, path, object_definition);
	}

	async assume<TransitionStates extends StateDefinition, FinaleStates extends StateDefinition, TargetObjectSchema extends z.ZodObject<any>, ObjectDefinition extends Record<string, FieldDefinitionOutput>>(scopes: StateMachineScope<TransitionStates, FinaleStates, TargetObjectSchema, ObjectDefinition>[]) {
		// console.log(objects);

		return {
			extract: async (options: {
				// filter: {
				// 	[K in keyof Partial<ObjectDefinition>]: (field: {
				// 		must_be: (value: string) => string;
				// 	}) => string;
				// };
				intent: string;
			}) => {
				// const filter = Object.keys(options.filter);

				// const cust = options.filter[filter[0]]({
				// 	must_be(value) {
				// 		return value;
				// 	},
				// });

				// let order = cust === "cust11" ? "order1" : cust === "cust22" ? "order2" : "order3";

				// // console.log({ order });

				const machine_snapshot = await scopes[0].state.of("order1");

				const current_state = await machine_snapshot.reach("AddressChanged").get({
					done: true,
					possible: true,
					side_effects: {
						name: true,
						duration: true,
						complete: true,
						error: true,
					},

					states: {
						name: true,
						description: true,
					},

					upcoming: {
						name: true,
						conditions: {
							explain: true,
							target: {
								path: true,
								interfaces: true,
							},
						},
						actions: {
							explain: true,
							target: {
								path: true,
								interfaces: true,
							},
						},
					},
				});

				return current_state;
			},
		};
	}
}

export { api };

export const mutation = api.chain.mutation as MutationPromiseChain;

export const query = api.chain.query as QueryPromiseChain;


