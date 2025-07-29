import * as fs from "fs";
const components_folder = "./components";

async function get_files(dir: string): Promise<string[]> {
	const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		dirents.map((dirent) => {
			const res = `${dir}/${dirent.name}`;
			return dirent.isDirectory() ? get_files(res) : res;
		}),
	);
	return Array.prototype.concat(...files);
}

const component_files = await get_files(components_folder);

// Filter to get only TypeScript model files (not interface files)
const model_files = component_files
	.filter((path) => path.endsWith('.ts'))
	.filter((path) => !path.includes('/interfaces/'))
	.filter((path) => !path.includes("__"));

// First load priority models (from components starting with _)
model_files
	.filter((path) => path.includes("/components/_"))
	.forEach(async (path) => {
		try {
			// console.log("Loading priority model " + path);
			await import.meta.require(path);
		} catch (error) {}
	});

// Then load regular models (from components not starting with _)
model_files
	.filter((path) => !path.includes("/components/_"))
	.forEach(async (path) => {
		try {
			// console.log("Loading model " + path);
			await import.meta.require(path);
		} catch (error) {}
	});
