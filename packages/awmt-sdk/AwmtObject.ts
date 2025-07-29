import { z } from "zod";
import { AwmtStateMachine, StateDefinition, StateMachineDefinition } from "./AwmtStateMachine";
import { api } from "./api";
import { FieldDefinitionOutput, InferSchema, makeZodSchema } from "./";
import {
	BooleanConditions,
	ConditionResult,
	DateConditions,
	getFieldConditions,
	NumberConditions,
	ObjectConditions,
	StringConditions,
} from "./conditions";
import {
	BooleanFilter,
	DateFilter,
	Model,
	ModelRequest,
	MutationPromiseChain,
	NumberFilter,
	QueryPromiseChain,
	ReferenceFilter,
	StringFilter,
} from "./api/schema";

export default class AwmtObject<ObjectDefinition extends Record<string, FieldDefinitionOutput>> {
	private object_definition: ObjectDefinition;
	private schema: z.ZodObject<{ [K in keyof ObjectDefinition]: z.ZodOptional<z.ZodTypeAny> }, "strict">;
	private object_path: string;

	constructor(private name: string, object_path: string, definition: ObjectDefinition) {
		this.schema = makeZodSchema(definition);
		this.object_definition = definition;
		this.object_path = object_path;
	}

	async create(identifier: string, data: Partial<InferSchema<ObjectDefinition>>) {
		try {
			const validatedData = this.schema.parse(data);

			const result = await (api.chain.mutation as MutationPromiseChain)
				.at({ path: this.object_path })
				.instantiate({ path: identifier })
				.execute({ model: { path: 1, prototypes: { path: 1 } } });

			const path = result?.model?.path;

			if (!path) {
				throw new Error("Failed to create object " + identifier);
			}

			for (let key in data) {
				const field = data[key];

				const definition = this.object_definition[key];

				const kind = definition.kind;
				const type = definition.type;

				const at_submodel = (api.chain.mutation as MutationPromiseChain).at({ path }).at({ submodel: key });

				const submo = await at_submodel.execute({
					model: { path: 1 },
				});

				if (kind === "scalar") {
					if (type === "string") {
						const r = await at_submodel.set_string_value({ value: field as unknown as string }).execute({
							model: { path: 1 },
						});
					} else if (type === "number") {
						const r = await at_submodel.set_number_value({ value: field as unknown as number }).execute({
							model: { path: 1 },
						});
					} else if (type === "boolean") {
						const r = await at_submodel.set_boolean_value({ value: field as unknown as boolean }).execute({
							model: { path: 1 },
						});
					} else if (type === "date") {
						const r = await at_submodel.as.DateMutation.set_timestamp({
							timestamp: (field as unknown as Date).getTime(),
						}).execute({
							__typename: 1,
						});
					} else {
						throw new Error("Unknown scalar type: " + type);
					}
				} else {
					const r = await at_submodel.set_reference({ reference: field as unknown as string }).execute({
						model: { path: 1 },
					});
				}
			}

			// return new AwmtObjectInstance(path, this.path, this.object_definition, this.schema);

			return { get: (api.chain.query as QueryPromiseChain).model({ path }).execute };
		} catch (error) {
			if (error instanceof z.ZodError) {
				console.error("Validation failed:", error.errors);
				throw new Error(`Invalid data for ${this.name}: ${error.message}`);
			}
			throw error;
		}
	}

	async create_many(identifiers: string[], objects: Partial<InferSchema<ObjectDefinition>>[]) {
		return Promise.all(objects.map((object, i) => this.create(identifiers[i], object)));
	}

	update = this.create;

	async state_machine<T extends StateDefinition, U extends StateDefinition>(
		name: string,
		definition: StateMachineDefinition<T, U>
	) {


		// const m = (api.chain.query as QueryPromiseChain).model({ path: this.object_path })

		const data = await (api.chain.mutation as MutationPromiseChain)
			.at({ path: this.object_path })
			.create_state_machine({
				name: name,
				entry_state: "entry",
			})
			.execute({
				state_machine: {
					name: 1,
					model: {
						path: 1,
					},
				},
			});

		const state_machine_path = data?.state_machine?.model?.path;

		if (!state_machine_path) {
			throw new Error("Failed to create state machine " + name);
		}

		// Set the description of the entry state

		const entry_state_description = definition.entry;

		await (api.chain.mutation as MutationPromiseChain)
			.at({ path: state_machine_path })
			.as.StateMachineMutation.at_state({ name: "entry" })
			.set_description({ description: entry_state_description })
			.execute();

		// Create each of the finale states and set their description

		let finale_states: string[] = [];

		for (let finale_state in definition.finale_states) {
			await (api.chain.mutation as MutationPromiseChain)
				.at({ path: state_machine_path })
				.as.StateMachineMutation.add_state({ name: finale_state, is_finale: true })
				.execute({
					name: 1,
				});

			await (api.chain.mutation as MutationPromiseChain)
				.at({ path: state_machine_path })
				.as.StateMachineMutation.at_state({ name: finale_state })
				.set_description({ description: definition.finale_states[finale_state] })
				.execute();

			finale_states.push(finale_state);
		}

		// Create each of the states and set their description (except for the entry state, and the finale states)

		for (let state in definition.states) {
			if (state === "entry" || finale_states.includes(state)) {
				continue;
			}

			await (api.chain.mutation as MutationPromiseChain)
				.at({ path: state_machine_path })
				.as.StateMachineMutation.add_state({ name: state, is_finale: false })
				.execute({
					name: 1,
				});

			await (api.chain.mutation as MutationPromiseChain)
				.at({ path: state_machine_path })
				.as.StateMachineMutation.at_state({ name: state })
				.set_description({ description: definition.states[state] })
				.execute();
		}

		return new AwmtStateMachine(
			state_machine_path,
			this.object_path,
			name,
			definition,
			this.schema,
			this.object_definition
		);
	}

	find_instances(
		conditions: Partial<{
			[K in keyof z.ZodObject<
				{ [K in keyof ObjectDefinition]: z.ZodOptional<z.ZodTypeAny> },
				"strict"
			>["shape"]]: (
				field: ObjectDefinition[K]["type"] extends "string"
					? StringConditions
					: ObjectDefinition[K]["type"] extends "number"
					? NumberConditions
					: ObjectDefinition[K]["type"] extends "boolean"
					? BooleanConditions
					: ObjectDefinition[K]["type"] extends "date"
					? DateConditions
					: ObjectConditions
			) => any;
		}>
	) {
		let string_filters: StringFilter[] = [];
		let number_filters: NumberFilter[] = [];
		let boolean_filters: BooleanFilter[] = [];
		let date_filters: DateFilter[] = [];
		let reference_filters: ReferenceFilter[] = [];

		for (const [field, condition] of Object.entries(conditions)) {
			if (condition) {
				const object_field_type = this.object_definition[field].type;
				const conds = getFieldConditions(object_field_type);
				const functor_description = condition(conds) as ConditionResult;

				if (functor_description.type === "string") {
					if (functor_description.name === "string_contains_condition") {
						string_filters.push({
							at: field,
							contains: functor_description.value,
						});
					}
					if (functor_description.name === "string_not_contains_condition") {
						string_filters.push({
							at: field,
							not_contains: functor_description.value,
						});
					}
					if (functor_description.name === "string_starts_with_condition") {
						string_filters.push({
							at: field,
							starts_with: functor_description.value,
						});
					}
					if (functor_description.name === "string_ends_with_condition") {
						string_filters.push({
							at: field,
							ends_with: functor_description.value,
						});
					}
					if (functor_description.name === "string_equals_condition") {
						string_filters.push({
							at: field,
							equal_to: functor_description.value,
						});
					}
					if (functor_description.name === "string_length_greater_than_condition") {
						string_filters.push({
							at: field,
							length_greater_than: functor_description.value,
						});
					}
					if (functor_description.name === "string_length_less_than_condition") {
						string_filters.push({
							at: field,
							length_less_than: functor_description.value,
						});
					}
				}

				if (functor_description.type === "number") {
					if (functor_description.name === "number_greater_than_condition") {
						number_filters.push({
							at: field,
							greater_than: functor_description.value,
						});
					}

					if (functor_description.name === "number_less_than_condition") {
						number_filters.push({
							at: field,
							less_than: functor_description.value,
						});
					}

					if (functor_description.name === "number_equal_to_condition") {
						number_filters.push({
							at: field,
							equal_to: functor_description.value,
						});
					}
				}

				if (functor_description.type === "boolean") {
					// boolean_not_null_condition;
					// boolean_null_condition;
					// boolean_equals_condition;

					if (functor_description.name === "boolean_not_null_condition") {
						boolean_filters.push({
							at: field,
							not_null: true,
						});
					}

					if (functor_description.name === "boolean_null_condition") {
						boolean_filters.push({
							at: field,
							null: true,
						});
					}

					if (functor_description.name === "boolean_equals_condition") {
						boolean_filters.push({
							at: field,
							equal_to: functor_description.value,
						});
					}
				}

				if (functor_description.type === "date") {
					if (functor_description.name === "date_not_null_condition") {
						date_filters.push({
							at: field,
							not_null: true,
						});
					}

					if (functor_description.name === "date_null_condition") {
						date_filters.push({
							at: field,
							null: true,
						});
					}

					if (functor_description.name === "date_after_condition") {
						date_filters.push({
							at: field,
							after_date: functor_description.value,
						});
					}

					if (functor_description.name === "date_older_than_seconds_condition") {
						date_filters.push({
							at: field,
							older_than_seconds: functor_description.value,
						});
					}

					if (functor_description.name === "date_newer_than_seconds_condition") {
						date_filters.push({
							at: field,
							newer_than_seconds: functor_description.value,
						});
					}
				}

				if (functor_description.type === "object") {
					// 					not_null
					// null
					// is

					if (functor_description.name === "not_null") {
						reference_filters.push({
							at: field,
							not_null: true,
						});
					}

					if (functor_description.name === "null") {
						reference_filters.push({
							at: field,
							null: true,
						});
					}

					// if (functor_description.name === "is") {
					// 	reference_filters.push({
					// 		at: field,
					// 		is: functor_description.value,
					// 	});
					// }
				}

				// const existing_features = await api.chain.query
				// 	.model({ path: this.target_object_path })
				// 	.at({ submodel: field })
				// 	.execute({
				// 		features: [
				// 			{ category: "passive_transition_target" },
				// 			{
				// 				model: {
				// 					path: 1,
				// 					label: 1,
				// 					prototypes: { path: 1 },
				// 					at: [{ submodel: "value" }, { path: 1, interfaces: 1 }],
				// 				},
				// 			},
				// 		],
				// 	});

				// const existing_feature = existing_features?.features?.find((f) => {
				// 	if (!f || !f.model) return false;
				// 	const prototype = f.model.prototypes?.[0];
				// 	if (!prototype) return false;
				// 	return prototype.path === functor_description.name && f.model.label === name;
				// });

				// let has_value = false;
				// let feature_path: string | undefined = undefined;

				// if (existing_feature && existing_feature.model) {
				// 	has_value = !!existing_feature.model?.at;
				// 	feature_path = existing_feature.model!.path!;

				// 	if (functor_description.value_type === "state_machine") {
				// 		const state_machine_name = functor_description.state_machine;
				// 		const state_name = functor_description.state;

				// 		const machine = await api.chain.query
				// 			.model({ path: object_field_type })
				// 			.state_machine({ name: state_machine_name })
				// 			.execute({
				// 				name: 1,
				// 				model: { path: 1 },
				// 				get_state: [
				// 					{
				// 						name: state_name as string,
				// 					},
				// 					{
				// 						name: 1,
				// 						model: { path: 1 },
				// 					},
				// 				],
				// 			});

				// 		const state_machine_path = machine?.model?.path;
				// 		const state_path = machine?.get_state?.model?.path;

				// 		if (!state_machine_path) {
				// 			throw new Error(`Failed to find state machine ${state_machine_name}`);
				// 		}

				// 		if (!state_path) {
				// 			throw new Error(
				// 				`Failed to find state ${
				// 					state_name as string
				// 				} in state machine ${state_machine_name}`
				// 			);
				// 		}

				// 		const machine_submodel = api.chain.mutation
				// 			.at({ path: existing_feature.model.path })
				// 			.at({ submodel: "machine" });

				// 		const state_submodel = api.chain.mutation
				// 			.at({ path: existing_feature.model.path })
				// 			.at({ submodel: "state" });

				// 		const r1 = await machine_submodel
				// 			.set_reference({ reference: state_machine_path })
				// 			.execute({
				// 				model: { path: 1 },
				// 			});

				// 		const r2 = await state_submodel
				// 			.set_reference({ reference: state_path })
				// 			.execute({
				// 				model: { path: 1 },
				// 			});
				// 	} else if (has_value) {
				// 		const value_type = functor_description.value_type;
				// 		const value = functor_description.value;

				// 		let submodel = api.chain.mutation
				// 			.at({ path: existing_feature.model.path })
				// 			.at({ submodel: "value" });

				// 		if (value_type === "string") {
				// 			submodel = submodel.set_string_value({ value: value as string });
				// 		} else if (value_type === "number") {
				// 			submodel = submodel.set_number_value({ value: value as number });
				// 		} else if (value_type === "boolean") {
				// 			submodel = submodel.set_boolean_value({ value: value as boolean });
				// 		} else if (value_type === "date") {
				// 			submodel = submodel.set_number_value({
				// 				value: (value as Date).getTime(),
				// 			});
				// 		}

				// 		const r = await submodel.execute({ model: { path: 1 } });
				// 	}
				// } else {
				// 	const value_type = functor_description.value_type;

				// 	const created_feature = await api.chain.mutation
				// 		.at({ path: this.target_object_path })
				// 		.at({ submodel: field })
				// 		.use_feature({
				// 			feature: functor_description.name,
				// 		})
				// 		.execute({
				// 			set_label: [
				// 				{ label: name },
				// 				{
				// 					model: {
				// 						path: 1,
				// 						label: 1,
				// 						prototypes: { path: 1 },
				// 						reference: { path: 1 },
				// 						at: [{ submodel: "value" }, { path: 1, interfaces: 1 }],
				// 					},
				// 				},
				// 			],
				// 		});

				// 	if (!created_feature) {
				// 		throw new Error(`Failed to create feature ${functor_description.name}`);
				// 	}

				// 	has_value = !!created_feature.set_label?.model?.at;
				// 	feature_path = created_feature.set_label?.model!.path!;

				// 	if (value_type === "state_machine") {
				// 		const state_machine_name = functor_description.state_machine;
				// 		const state_name = functor_description.state;

				// 		const machine = await api.chain.query
				// 			.model({ path: object_field_type })
				// 			.state_machine({ name: state_machine_name })
				// 			.execute({
				// 				name: 1,
				// 				model: { path: 1 },
				// 				get_state: [
				// 					{
				// 						name: state_name as string,
				// 					},
				// 					{
				// 						name: 1,
				// 						model: { path: 1 },
				// 					},
				// 				],
				// 			});

				// 		const state_machine_path = machine?.model?.path;
				// 		const state_path = machine?.get_state?.model?.path;

				// 		if (!state_machine_path) {
				// 			throw new Error(`Failed to find state machine ${state_machine_name}`);
				// 		}

				// 		if (!state_path) {
				// 			throw new Error(
				// 				`Failed to find state ${
				// 					state_name as string
				// 				} in state machine ${state_machine_name}`
				// 			);
				// 		}

				// 		const machine_submodel = api.chain.mutation
				// 			.at({ path: created_feature.set_label?.model?.path })
				// 			.at({ submodel: "machine" });

				// 		const state_submodel = api.chain.mutation
				// 			.at({ path: created_feature.set_label?.model?.path })
				// 			.at({ submodel: "state" });

				// 		const r1 = await machine_submodel
				// 			.set_reference({ reference: state_machine_path })
				// 			.execute({
				// 				model: { path: 1 },
				// 			});

				// 		const r2 = await state_submodel
				// 			.set_reference({ reference: state_path })
				// 			.execute({
				// 				model: { path: 1 },
				// 			});
				// 	} else if (has_value && created_feature.set_label?.model) {
				// 		let submodel = api.chain.mutation
				// 			.at({ path: feature_path })
				// 			.at({ submodel: "value" });

				// 		const value = functor_description.value;

				// 		if (value_type === "string") {
				// 			submodel = submodel.set_string_value({ value: value as string });
				// 		} else if (value_type === "number") {
				// 			submodel = submodel.set_number_value({ value: value as number });
				// 		} else if (value_type === "boolean") {
				// 			submodel = submodel.set_boolean_value({ value: value as boolean });
				// 		} else if (value_type === "date") {
				// 			submodel = submodel.set_number_value({ value: value!.getTime() });
				// 		} else {
				// 			throw new Error(`Invalid value type ${value_type}`);
				// 		}

				// 		const r = await submodel.execute({ model: { path: 1 } });
				// 	}

				// 	if (!feature_path) {
				// 		throw new Error("Failed to create feature");
				// 	}

				// 	const condition_submodel = await api.chain.mutation
				// 		.at({ path: transition.transition.model.path! })
				// 		.at({ submodel: "conditions" })
				// 		.create_submodel()
				// 		.set_reference({ reference: feature_path })
				// 		.execute({ model: { path: 1 } });
				// }
			}
		}

		const find_instances = (api.chain.query as QueryPromiseChain).model({ path: this.object_path }).instances({
			string_filters: string_filters,
			number_filters: number_filters,
			boolean_filters: boolean_filters,
			date_filters: date_filters,
			reference_filters: reference_filters,
		});

		return find_instances;

		// return {
		// 	get: async (...args: Parameters<typeof find_instances.execute>) => {
		// 		return (find_instances.execute(...args) as unknown) as (request: ModelRequest) => Model[];
		// 	}
		// };

		// console.log(JSON.stringify(find_instances));
	}
}
