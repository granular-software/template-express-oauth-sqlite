import { Effect } from "effect";
import { Ant } from "../Ant";

export async function get_mutable_path_end(ant: Ant) {
	let _ant = ant;
	if (!ant.is_mutable) {
		_ant = await Effect.runPromise(ant.mutable());
	}

	if (_ant.mutable_path.length === 0) {
		const refresh_ant = await Effect.runPromise(Ant.from_path(ant.path));

		if (!refresh_ant) {
			throw new Error("Ant not found");
		}

		_ant = await Effect.runPromise(refresh_ant.mutable());

		return _ant.mutable_path[_ant.mutable_path.length - 1].id


	}

	const mutable_path_end = _ant.mutable_path[_ant.mutable_path.length - 1];

	return mutable_path_end.id;
}
