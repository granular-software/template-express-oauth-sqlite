import { api } from "awmt-sdk";
import { type Model, type ModelMutation, type ModelMutationPromiseChain, type ModelMutationRequest, type ModelPromiseChain, type ModelRequest, type MutationPromiseChain, type QueryPromiseChain } from "awmt-sdk/api/schema";

type PointerType = ModelPromiseChain & {
	execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null>;
};

type MutationPointerType = ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>;
}

export class Pointer {
	constructor(path: string) {
		this.pointer = (api.chain.query as QueryPromiseChain).model({ path });
		this.assigned = true;
		this.path = path;

		return this;
	}

	private assigned: boolean;
	private path: string;

	private pointer: PointerType;

	interface<T extends keyof PointerType["as"]>(interface_name: T) {
		if (!this.assigned || !this.pointer) {
			throw new Error("Pointer not assigned");
		}

		const interf = this.pointer.as[interface_name];

		return interf;
	}

	async execute(request: ModelRequest) {
		if (!this.assigned || !this.pointer) {
			throw new Error("Pointer not assigned");
		}

		return this.pointer.execute(request);
	}
}

export class MutationPointer {
	constructor(path: string) {
		this.pointer = (api.chain.mutation as MutationPromiseChain).at({ path });
		this.assigned = true;
		this.path = path;

		return this;
	}

	private assigned: boolean;
	private path: string;

	private pointer: MutationPointerType;

	interface<T extends keyof MutationPointerType["as"]>(interface_name: T) {
		if (!this.assigned || !this.pointer) {
			throw new Error("Pointer not assigned");
		}

		const interf = this.pointer.as[interface_name];

		return interf;
	}

	async execute(request: ModelMutationRequest) {
		if (!this.assigned || !this.pointer) {
			throw new Error("Pointer not assigned");
		}

		return this.pointer.execute(request);
	}
}
