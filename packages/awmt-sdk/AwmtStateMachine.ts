import { z } from "zod";
import { api } from "./api";
import { FieldDefinitionOutput } from "./";
import AwmtStateMachineSnapshot from "./AwmtStateMachineSnapshot";
import { BooleanConditions, ConditionResult, DateConditions, getFieldConditions, NumberConditions, ObjectConditions, StringConditions } from "./conditions";
import { ActionResult, BooleanActions, DateActions, getFieldActions, NumberActions, ObjectActions, StringActions } from "./actions";
import { MutationPromiseChain, QueryPromiseChain, TransitionMutation } from "./api/schema";

export type StateDefinition = {
	[key: string]: string;
};

export type StateMachineDefinition<TransitionStates extends StateDefinition, FinaleStates extends StateDefinition> = {
	entry: string;
	states: TransitionStates;
	finale_states: FinaleStates;
};

export type AllStates<TransitionStates extends StateDefinition, FinaleStates extends StateDefinition> = keyof TransitionStates | keyof FinaleStates;

type RemoveUndefined<TransitionStates> = TransitionStates extends undefined ? never : TransitionStates;

type TransitionActionMethod<T> =
	RemoveUndefined<T> extends string
		? {
				set_value: () => z.ZodString;
				update_value: () => z.ZodString;
			}
		: RemoveUndefined<T> extends number
			? {
					set_value: () => z.ZodNumber;
					increment_by: () => z.ZodNumber;
					decrement_by: () => z.ZodNumber;
				}
			: RemoveUndefined<T> extends boolean
				? {
						set_value: () => z.ZodBoolean;
						human_validation: () => z.ZodBoolean;
					}
				: RemoveUndefined<T> extends Date
					? {
							select_date: () => z.ZodDate;
						}
					: RemoveUndefined<T> extends null
						? {
								select: () => z.ZodTypeAny;
							}
						: {
								select: () => z.ZodTypeAny;
							};

export class AwmtStateMachine<TransitionStates extends StateDefinition, FinaleStates extends StateDefinition, TargetObjectSchema extends z.ZodObject<any>, ObjectDefinition extends Record<string, FieldDefinitionOutput>> {
	private states_definition: StateMachineDefinition<TransitionStates, FinaleStates>;
	private objectSchema: TargetObjectSchema;
	private object_definition: ObjectDefinition;

	path: string;
	name: string;

	target_object_path: string;

	constructor(path: string, target_object_path: string, name: string, states_definition: StateMachineDefinition<TransitionStates, FinaleStates>, schema: TargetObjectSchema, object_definition: ObjectDefinition) {
		this.path = path;
		this.states_definition = states_definition;
		this.objectSchema = schema;
		this.name = name;
		this.target_object_path = target_object_path;
		this.object_definition = object_definition;
	}

	async passive_transition<A extends keyof TransitionStates | "entry", B extends AllStates<TransitionStates, FinaleStates>>(
		name: string,
		from: A,
		to: B,
		conditions?:
			| Partial<{
					[K in keyof TargetObjectSchema["shape"]]: (field: ObjectDefinition[K]["type"] extends "string" ? StringConditions : ObjectDefinition[K]["type"] extends "number" ? NumberConditions : ObjectDefinition[K]["type"] extends "boolean" ? BooleanConditions : ObjectDefinition[K]["type"] extends "date" ? DateConditions : ObjectConditions) => any;
			  }>
			| undefined,
	) {
		const transition = await (api.chain.mutation as MutationPromiseChain)
			.at({ path: this.path })
			.as.StateMachineMutation.at_state({ name: from as string })
			.add_passive_transition({ name: name, target: to as string })
			.execute({ transition: { name: 1, model: { path: 1 } } });

		return this._handle_conditions(name, transition, conditions);
	}

	async active_transition<A extends keyof TransitionStates | "entry", B extends AllStates<TransitionStates, FinaleStates> | "entry">(
		name: string,
		from: A,
		to: B,
		conditions?:
			| Partial<{
					[K in keyof TargetObjectSchema["shape"]]: (field: ObjectDefinition[K]["type"] extends "string" ? StringConditions : ObjectDefinition[K]["type"] extends "number" ? NumberConditions : ObjectDefinition[K]["type"] extends "boolean" ? BooleanConditions : ObjectDefinition[K]["type"] extends "date" ? DateConditions : ObjectConditions) => any;
			  }>
			| undefined,
		actions?:
			| Partial<{
					[K in keyof TargetObjectSchema["shape"]]: (field: ObjectDefinition[K]["type"] extends "string" ? StringActions : ObjectDefinition[K]["type"] extends "number" ? NumberActions : ObjectDefinition[K]["type"] extends "boolean" ? BooleanActions : ObjectDefinition[K]["type"] extends "date" ? DateActions : ObjectActions) => any;
			  }>
			| undefined,
	) {
		const transition = await (api.chain.mutation as MutationPromiseChain)
			.at({ path: this.path })
			.as.StateMachineMutation.at_state({ name: from as string })
			.add_active_transition({ name: name, target: to as string })
			.execute({ transition: { name: 1, model: { path: 1 } } });

		if (!actions) return this;

		for (const [field, action] of Object.entries(actions)) {
			if (action) {
				const object_field_type = this.object_definition[field].type;
				const act = getFieldActions(object_field_type);
				const functor_description = action(act) as ActionResult;

				const existing_features = await (api.chain.query as QueryPromiseChain)
					.model({ path: this.target_object_path })
					.at({ submodel: field })
					.execute({
						features: [
							{ category: "active_transition_target" },
							{
								model: {
									path: 1,
									label: 1,
									prototypes: { path: 1 },
									at: [{ submodel: "value" }, { path: 1, interfaces: 1 }],
								},
							},
						],
					});

				const existing_feature = existing_features?.features?.find((f) => {
					if (!f || !f.model) return false;
					const prototype = f.model.prototypes?.[0];
					if (!prototype) return false;
					return prototype.path === functor_description.name && f.model.label === name;
				});

				let has_value = false;
				let feature_path: string | undefined = undefined;

				if (existing_feature && existing_feature.model) {
					has_value = !!existing_feature.model?.at;
					feature_path = existing_feature.model!.path!;
				} else {
					const created_feature = await (api.chain.mutation as MutationPromiseChain)
						.at({ path: this.target_object_path })
						.at({ submodel: field })
						.use_feature({
							feature: functor_description.name,
						})
						.execute({
							set_label: [
								{ label: name },
								{
									model: {
										path: 1,
										label: 1,
										prototypes: { path: 1 },
										reference: { path: 1 },
										at: [{ submodel: "value" }, { path: 1, interfaces: 1 }],
									},
								},
							],
						});

					if (!created_feature) {
						throw new Error(`Failed to create feature ${functor_description.name}`);
					}

					// has_value = !!created_feature.set_label?.model?.at;
					feature_path = created_feature.set_label?.model!.path!;

					if (!feature_path) {
						throw new Error("Failed to create feature");
					}

					const condition_submodel = await (api.chain.mutation as MutationPromiseChain)
						.at({ path: transition.transition.model.path! })
						.at({ submodel: "actions" })
						.create_submodel()
						.set_reference({ reference: feature_path })
						.execute({ model: { path: 1 } });
				}
			}
		}

		this._handle_conditions(name, transition, conditions);

		return this;

		// if (Array.isArray(from)) {
		// } else {
		// 	await api.chain.mutation
		// 		.at({ path: this.path })
		// 		.as.StateMachineMutation.at_state({ name: from as string })
		// 		.add_active_transition({
		// 			name: name,
		// 			target: to as string,
		// 		})
		// 		.execute({
		// 			transition: {
		// 				name: 1,
		// 			},
		// 		});
		// }
		// if (action) {
		// 	const actionResult = action;
		// 	Object.entries(actionResult).forEach(([key, _value]) => {
		// 		if (key in this.objectSchema.shape) {
		// 			const value = _value({
		// 				set_value: () => "set_value",
		// 				increment_by: () => "increment_by",
		// 				decrement_by: () => "decrement_by",
		// 				human_validation: () => "human_validation",
		// 				select: () => "select",
		// 				select_date: () => "select_date",
		// 			});
		// 		}
		// 	});
		// }
		// return this;
	}

	async on_state_entry<B extends AllStates<TransitionStates, FinaleStates> | "entry">(state: B, side_effect_name: string, callback: (success: (value: any) => void, error: (value: any) => void, object: TargetObjectSchema) => void) {
		const result = await (api.chain.mutation as MutationPromiseChain)
			.at({ path: this.path })
			.as.StateMachineMutation.at_state({ name: state as string })
			.register_state_entry_effect({ name: side_effect_name })
			.execute({
				path: 1,
				label: 1,
			});

		const path = result?.path;

		if (!path) {
			throw new Error(`Failed to register side effect ${side_effect_name}`);
		}
	}

	async on_state_exit<B extends AllStates<TransitionStates, FinaleStates> | "entry">(state: B, side_effect_name: string, callback: (success: (value: any) => void, error: (value: any) => void, object: TargetObjectSchema) => void) {
		const result = await (api.chain.mutation as MutationPromiseChain)
			.at({ path: this.path })
			.as.StateMachineMutation.at_state({ name: state as string })
			.register_state_exit_effect({ name: side_effect_name })
			.execute({
				path: 1,
				label: 1,
			});

		const path = result?.path;

		if (!path) {
			throw new Error(`Failed to register side effect ${side_effect_name}`);
		}
	}

	async of(instance: string) {
		const _instance = await (api.chain.query as QueryPromiseChain).model({ path: instance }).execute({
			path: 1,
			label: 1,

			state: [
				{ name: this.name },
				{
					name: 1,
					model: {
						path: 1,
					},
					current: {
						name: 1,
					},
				},
			],
		});

		if (!_instance || !_instance.path) {
			throw new Error(`Failed to retrieve instance with path ${instance}`);
		}

		if (!_instance.state || !_instance.state.model.path) {
			throw new Error(`Failed to retrieve state machine with name ${this.name}`);
		}

		return new AwmtStateMachineSnapshot<TransitionStates, FinaleStates, TargetObjectSchema>(_instance.path, _instance.state?.model.path, this.path);
	}

	async _handle_conditions(
		name: string,
		transition: TransitionMutation,
		conditions?: Partial<{
			[K in keyof TargetObjectSchema["shape"]]: (field: ObjectDefinition[K]["type"] extends "string" ? StringConditions : ObjectDefinition[K]["type"] extends "number" ? NumberConditions : ObjectDefinition[K]["type"] extends "boolean" ? BooleanConditions : ObjectDefinition[K]["type"] extends "date" ? DateConditions : ObjectConditions) => any;
		}>,
	) {
		if (!conditions) return this;

		for (const [field, condition] of Object.entries(conditions)) {
			if (condition) {
				const object_field_type = this.object_definition[field].type;
				const conds = getFieldConditions(object_field_type);
				const functor_description = condition(conds) as ConditionResult;

				const existing_features = await (api.chain.query as QueryPromiseChain)
					.model({ path: this.target_object_path })
					.at({ submodel: field })
					.execute({
						features: [
							{ category: "passive_transition_target" },
							{
								model: {
									path: 1,
									label: 1,
									prototypes: { path: 1 },
									at: [{ submodel: "value" }, { path: 1, interfaces: 1 }],
								},
							},
						],
					});

				const existing_feature = existing_features?.features?.find((f) => {
					if (!f || !f.model) return false;
					const prototype = f.model.prototypes?.[0];
					if (!prototype) return false;
					return prototype.path === functor_description.name && f.model.label === name;
				});

				let has_value = false;
				let feature_path: string | undefined = undefined;

				if (existing_feature && existing_feature.model) {
					has_value = !!existing_feature.model?.at;
					feature_path = existing_feature.model!.path!;

					if (functor_description.value_type === "state_machine") {
						const state_machine_name = functor_description.state_machine;
						const state_name = functor_description.state;

						const machine = await (api.chain.query as QueryPromiseChain)
							.model({ path: object_field_type })
							.state_machine({ name: state_machine_name })
							.execute({
								name: 1,
								model: { path: 1 },
								get_state: [
									{
										name: state_name as string,
									},
									{
										name: 1,
										model: { path: 1 },
									},
								],
							});

						const state_machine_path = machine?.model?.path;
						const state_path = machine?.get_state?.model?.path;

						if (!state_machine_path) {
							throw new Error(`Failed to find state machine ${state_machine_name}`);
						}

						if (!state_path) {
							throw new Error(`Failed to find state ${state_name as string} in state machine ${state_machine_name}`);
						}

						const machine_submodel = (api.chain.mutation as MutationPromiseChain).at({ path: existing_feature.model.path }).at({ submodel: "machine" });

						const state_submodel = (api.chain.mutation as MutationPromiseChain).at({ path: existing_feature.model.path }).at({ submodel: "state" });

						const r1 = await machine_submodel.set_reference({ reference: state_machine_path }).execute({
							model: { path: 1 },
						});

						const r2 = await state_submodel.set_reference({ reference: state_path }).execute({
							model: { path: 1 },
						});
					} else if (has_value) {
						const value_type = functor_description.value_type;
						const value = functor_description.value;

						let submodel = (api.chain.mutation as MutationPromiseChain).at({ path: existing_feature.model.path }).at({ submodel: "value" });

						if (value_type === "string") {
							submodel = submodel.set_string_value({ value: value as string });
						} else if (value_type === "number") {
							submodel = submodel.set_number_value({ value: value as number });
						} else if (value_type === "boolean") {
							submodel = submodel.set_boolean_value({ value: value as boolean });
						} else if (value_type === "date") {
							submodel = submodel.set_number_value({
								value: (value as Date).getTime(),
							});
						}

						const r = await submodel.execute({ model: { path: 1 } });
					}
				} else {
					const value_type = functor_description.value_type;

					const created_feature = await (api.chain.mutation as MutationPromiseChain)
						.at({ path: this.target_object_path })
						.at({ submodel: field })
						.use_feature({
							feature: functor_description.name,
						})
						.execute({
							set_label: [
								{ label: name },
								{
									model: {
										path: 1,
										label: 1,
										prototypes: { path: 1 },
										reference: { path: 1 },
										at: [{ submodel: "value" }, { path: 1, interfaces: 1 }],
									},
								},
							],
						});

					if (!created_feature) {
						throw new Error(`Failed to create feature ${functor_description.name}`);
					}

					has_value = !!created_feature.set_label?.model?.at;
					feature_path = created_feature.set_label?.model!.path!;

					if (value_type === "state_machine") {
						const state_machine_name = functor_description.state_machine;
						const state_name = functor_description.state;

						const machine = await (api.chain.query as QueryPromiseChain)
							.model({ path: object_field_type })
							.state_machine({ name: state_machine_name })
							.execute({
								name: 1,
								model: { path: 1 },
								get_state: [
									{
										name: state_name as string,
									},
									{
										name: 1,
										model: { path: 1 },
									},
								],
							});

						const state_machine_path = machine?.model?.path;
						const state_path = machine?.get_state?.model?.path;

						if (!state_machine_path) {
							throw new Error(`Failed to find state machine ${state_machine_name}`);
						}

						if (!state_path) {
							throw new Error(`Failed to find state ${state_name as string} in state machine ${state_machine_name}`);
						}

						const machine_submodel = (api.chain.mutation as MutationPromiseChain).at({ path: created_feature.set_label?.model?.path }).at({ submodel: "machine" });

						const state_submodel = (api.chain.mutation as MutationPromiseChain).at({ path: created_feature.set_label?.model?.path }).at({ submodel: "state" });

						const r1 = await machine_submodel.set_reference({ reference: state_machine_path }).execute({
							model: { path: 1 },
						});

						const r2 = await state_submodel.set_reference({ reference: state_path }).execute({
							model: { path: 1 },
						});
					} else if (has_value && created_feature.set_label?.model) {
						let submodel = (api.chain.mutation as MutationPromiseChain).at({ path: feature_path }).at({ submodel: "value" });

						const value = functor_description.value;

						if (value_type === "string") {
							submodel = submodel.set_string_value({ value: value as string });
						} else if (value_type === "number") {
							submodel = submodel.set_number_value({ value: value as number });
						} else if (value_type === "boolean") {
							submodel = submodel.set_boolean_value({ value: value as boolean });
						} else if (value_type === "date") {
							submodel = submodel.set_number_value({ value: value!.getTime() });
						} else {
							throw new Error(`Invalid value type ${value_type}`);
						}

						const r = await submodel.execute({ model: { path: 1 } });
					}

					if (!feature_path) {
						throw new Error("Failed to create feature");
					}

					const condition_submodel = await (api.chain.mutation as MutationPromiseChain)
						.at({ path: transition.transition.model.path! })
						.at({ submodel: "conditions" })
						.create_submodel()
						.set_reference({ reference: feature_path })
						.execute({ model: { path: 1 } });
				}
			}
		}

		return this;
	}
}
