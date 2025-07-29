import { z } from "zod";
import { StateDefinition } from "./AwmtStateMachine";
import { api } from "./api";
import { MutationPromiseChain, QueryPromiseChain } from "./api/__schema";

export default class AwmtStateMachineSnapshot<
	TransitionStates extends StateDefinition,
	FinaleStates extends StateDefinition,
	TargetObjectSchema extends z.ZodObject<any>
> {
	constructor(instance_path: string, state_machine_snapshot_path: string, state_machine_path: string) {
		this.instance_path = instance_path;
		this.state_machine_snapshot_path = state_machine_snapshot_path;
		this.state_machine_path = state_machine_path;
	}

	private instance_path: string;
	private state_machine_snapshot_path: string;
	private state_machine_path: string;

	get get() {
		return (api.chain.query as QueryPromiseChain).model({ path: this.state_machine_snapshot_path }).as
			.StateMachineSnapshot.execute;
	}

	async current() {
		const result = await (api.chain.query as QueryPromiseChain).model({ path: this.instance_path }).execute({
			state: [
				{ name: this.state_machine_path },
				{
					current: {
						name: 1,
						entry: 1,
						state: {
							description: 1,
						},
					},
				},
			],
		});

		if (!result || !result.state || !result.state.current) {
			throw new Error("Failed to retrieve current state");
		}

		const current_state = result.state.current;

		if (!current_state.name) {
			throw new Error("Failed to retrieve current state name");
		}

		return {
			name: current_state.name,
			is_entry: current_state.entry,
			is_finale: current_state.finale,
			description: current_state?.state?.description,
		};
	}

	async outcomes() {
		return (api.chain.query as QueryPromiseChain)
			.model({ path: this.state_machine_snapshot_path })
			.as.StateMachineSnapshot.current.state.outcomes.execute({
				name: 1,
			});
	}

	get history() {
		return (api.chain.query as QueryPromiseChain).model({ path: this.state_machine_snapshot_path }).as
			.StateMachineSnapshot.history.execute;
	}

	reach(target_state: keyof TransitionStates | keyof FinaleStates) {
		const target_state_name = target_state as string;

		return {
			get: (api.chain.mutation as MutationPromiseChain)
				.at({ path: this.state_machine_snapshot_path })
				.as.StateMachineSnapshotMutation.reach({ state: target_state_name }).execute,
		};

		// if (!result || !result.state || !result.state.current) {
		// 	throw new Error("Failed to reach state " + target_state_name);
		// }

		// const current_state = result.state.current;

		// if (!current_state.name) {
		// 	throw new Error("Failed to reach state " + target_state_name);
		// }

		// return {
		// 	name: current_state.name,
		// 	is_entry: current_state.entry,
		// 	is_finale: current_state.finale,
		// 	description: current_state?.state?.description,
		// };
	}
}
