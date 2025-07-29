import { Effect } from "effect";

const cache = new Map<string, Promise<Effect.Effect.Success<any>>>();

export function get_call_from_cache(path: string, interf: string, method: string) {
	const key = `${path}.${interf}.${method}`;

	return cache.get(key);
}

export function set_call_to_cache(path: string, interf: string, method: string, value: any) {
	const key = `${path}.${interf}.${method}`;

	cache.set(key, value);
}
