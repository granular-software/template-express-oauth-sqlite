import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

/* load and execute every .tsx file in components/ so bundles self-register */
export async function load_all_components(dir_relative = "../components"): Promise<void> {
	const abs_dir = resolve(import.meta.dir, dir_relative);
	const files = await readdir(abs_dir);
	await Promise.all(files.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts")).map((f) => import(join(abs_dir, f))));
}
