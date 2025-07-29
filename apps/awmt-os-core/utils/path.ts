import clean_name from "./clean_name";

function split(path: string) {
	if (!path) {
		console.trace();
		throw new Error("Model path is undefined");
	}
	return path.split(":").filter((x) => x);
}

function depth(path: string) {
	return split(path).length;
}

export function get_head(path: string) {
	return split(path)[0];
}

export function get_tail(path: string) {
	if (depth(path) === 1) return null;
	return split(path).slice(1).join(":");
}

export function get_tail_parts(path: string) {
	return split(path).slice(1);
}


export function is_root(path: string) {
	return split(path).length === 1;
}

export function is_valid(path: string) {
	return split(path).map(clean_name).join(":") === path;
}

export function precursor(path: string) {
	const path_length = split(path).length;

	if (path_length <= 1) return null;

	return split(path)
		.slice(0, path_length - 1)
		.join(":");
}

export function triangularize(path: string): string[] {
	const head = get_head(path);

	const tail = get_tail(path);

	if (!tail) return [head];
	else return [head, ...triangularize(tail).map((x) => head + ":" + x)];
}

export function append(path: string, relative_path: string) {
	return [...split(path), ...split(relative_path)].join(":");
}
