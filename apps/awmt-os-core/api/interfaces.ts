import { Context } from "effect";
import { ModelInterface } from "../native/native_model";

let interfaces = new Map<string, ModelInterface<any>>();

export function implement_interface<T>(interf: ModelInterface<T>) {
	interfaces.set(interf.name, interf);
}

export function find_interface<T>(interf: Context.Tag<T, T>) {
	const interf_name = interf.identifier as string;
	return interfaces.get(interf_name);
}

export type Interface = { [t: string]: Function & ((...args: any[]) => any) };

