import * as fs from "fs";
const models_folder = "./components";

import { load_boot_queue } from "./api/boot";
import "./mcp_middleware";

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

const functions_files = await get_files(models_folder);

functions_files
	.filter((path) => !path.includes("__"))
	.filter((path) => !path.includes("/interfaces/")) // Skip interface files
	.filter((path) => path.endsWith(".ts")) // Only TypeScript files
	.filter(async (path) => {
		try {
			// Priority components (starting with _) are loaded first
			if (path.includes("/components/_")) {
				// console.log("Loading " + path);
				await import.meta.require(path);
				return false;
			}
		} catch (error) {}

		return true;
	})
	.filter(async (_path) => {
		const path = await _path;
		try {
			// console.log("Loading " + path);
			await import.meta.require(path);
		} catch (error) {}
	});

await load_boot_queue();

import "./api";

import "./os";

// import { EC2 } from "@aws-sdk/client-ec2";
// import { ECS, RunTaskCommandInput, waitUntilTasksRunning } from "@aws-sdk/client-ecs";

// const ecs = new ECS({
// 	region: "eu-west-3",
// });
// const ec2 = new EC2({
// 	region: "eu-west-3",
// // });

// const clusterName = "background_jobs";
// const taskDefinition = "background";
// const launchType = "FARGATE";

// app.use(mcpMiddleware);
