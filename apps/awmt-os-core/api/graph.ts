import { commandOptions, createClient, Graph } from "redis";
import fs from "fs";
// const redis_url = process.env.ENVIRONMENT === "dev" ? "redis://localhost:6379" : "redis://172.31.20.254:6379";

// "redis://35.180.67.161:6379";


const redis_url = process.env.REDIS_URL || "redis://172.31.20.254:6379" as string;


// let url = "redis://localhost:6379";

// @ts-ignore
const _client = createClient({ password: "simplifier", url: redis_url })

console.log(`— Redis Database : ${redis_url}`);

_client.on("error", (err: unknown) => {
	console.error(err);
});

_client.on("connect", () => {
	console.log("Redis client connected");

	// @ts-ignore
	const _graph = new Graph(_client, "graph");

	// _graph.query(`CREATE INDEX FOR (n:Model) ON (n.name)`);
	// _graph.query(`CREATE INDEX FOR (n:Model) ON (n.id)`);
	// _graph.query(`CREATE INDEX FOR (n:VirtualSubmodel) ON (n.name)`);
	// _graph.query(`CREATE INDEX FOR (n:VirtualSubmodel) ON (n.id)`);
});

_client.connect();

// @ts-ignore
export const client: typeof _client = _client;

// @ts-ignore
const graph = new Graph(_client, process.env.GRAPH_NAME as string);

let i = 0;

export async function graph_query<T>(
	q: string,
	variables?: {
		[k: string]: string | string[] | number | number[] | boolean | boolean[] | null | string[][] | number[][]
	},
) {
	const resp = await graph.query<T>(q, {
		params: variables ? variables : {},
	});

	return resp.data || [];
}

const unique = (numbers: number[]) => [...new Set(numbers)];

export async function graph_query_on_nodes<T>(
	q: string,
	nodes: number[],
	variables?: {
		[k: string]: string | string[] | number | number[] | boolean | boolean[] | null;
	},
): Promise<T[]> {
	const resps = await Promise.all(
		unique(nodes).map(async (node) => {
			const start = Date.now();

			try {
				const resp = await graph.query<T>(q, {
					params: variables ? { ...variables, node } : { node },
				});

				const duration = Date.now() - start;

				// console.log(`graph_query_on_nodes : ${duration}ms`)

				// if (duration > 50) {
				// 	const params = variables ? { ...variables, node } : { node };
				// 	// append the params to the beginning of the query in a valide manner

				// 	const to_send = params ? `CYPHER ${queryParamsToString(params)} ${q}` : q;

				// 	const profile = await client.sendCommand(["GRAPH.QUERY", "graph", to_send])

				// 	console.log(profile);
				// }

				return resp.data || [];
			} catch (error) {
				console.error(error);
				return [];
			}
		}),
	);

	return resps.flat();
}

export function clean_metadata(metadata: string[]): {
	execution_time: number;
	cached: boolean;
	nodes_created: number;
	properties_set: number;
} {
	const execution_time =
		metadata
			.find((m) => m.includes("Query internal execution time"))
			?.split(":")[1]
			.trim()
			.split(" ")[0] || "-1";

	const cached =
		metadata
			.find((m) => m.includes("Cached execution"))
			?.split(":")[1]
			.trim() || "0";

	const nodes_created =
		metadata
			.find((m) => m.includes("Nodes created"))
			?.split(":")[1]
			.trim() || "0";

	const properties_set =
		metadata
			.find((m) => m.includes("Properties set"))
			?.split(":")[1]
			.trim() || "0";

	return {
		execution_time: Number(execution_time),
		cached: cached === "1",
		nodes_created: Number(nodes_created),
		properties_set: Number(properties_set),
	};
}

// import io from "@pm2/io";

let start_time = Date.now();

setInterval(async () => {
	const count_models = await graph_query<{ count: number }>(`MATCH (n:Model) RETURN count(n) as count`);
	// const metric = io.metric({ name: "Models count" });
	// const uptime = io.metric({ name: "Uptime" });
	const count = count_models[0].count;
	const count_nodes = await graph_query<{ count: number }>(`MATCH (n) RETURN count(n) as count`);
	// const nodes_metric = io.metric({ name: "Nodes count" });
	const nodes_count = count_nodes[0].count;
	// const nodes_count_duration = clean_metadata(count_nodes.metadata).execution_time;
	// metric.set(count);
	// nodes_metric.set(nodes_count);
	// console.log(`${new Date().toISOString()} - Models count: ${count} - Nodes count: ${nodes_count} - Uptime: ${Math.floor((Date.now() - start_time) / 1000)}`);
	// if (count > 1) uptime.set(Math.floor((Date.now() - start_time) / 1000));

	// make this redis query : INFO latencystats

	const latency = await client.INFO("latencystats");

	const command = await client.INFO("commandstats");

	const latency_percentiles = latency
		.split("\n")
		.find((line) => line.includes("latency_percentiles_usec_graph.QUERY"))
		?.split(":")[1]
		.trim()
		.split(",") as string[];

	const latency_percentiles_50p_ms = Math.floor(Number(latency_percentiles[0].split("=")[1])) / 1000;
	const latency_percentiles_99p_ms = Math.floor(Number(latency_percentiles[1].split("=")[1])) / 1000;
	const latency_percentiles_999p_ms = Math.floor(Number(latency_percentiles[2].split("=")[1])) / 1000;

	const command_stats = command
		.split("\n")
		.find((line) => line.includes("graph.QUERY"))
		?.split(",") as string[];

	const calls = Number(command_stats[0].split("=")[1]);
	const failed_calls = Number(command_stats[4].split("=")[1]);

	console.log(JSON.stringify({
		models: count,
		nodes: nodes_count,
		calls,
		latency_percentiles_50p_ms,
		latency_percentiles_99p_ms,
		latency_percentiles_999p_ms,
		failed_calls,
	}));
}, 60000);

// const dumpedData = await client.dump(commandOptions({ returnBuffers: true }), "graph");
// // save dumped data to a file
// fs.writeFileSync("dump_test.rdb", dumpedData, "binary");

// // Read the dump back from the file in binary mode
// const dumpFromFile = fs.readFileSync("dump.rdb", "binary");
// const buffer = Buffer.from(dumpFromFile, 'binary')

// try {
// 	await client.restore('graph3', 0, buffer, {
// 		REPLACE: true,
// 	});
// 	console.log("Key restored successfully");
// } catch (error) {
// 	console.error(error);
// }

type QueryParam = null | string | number | boolean | QueryParams | Array<QueryParam>;

type QueryParams = {
	[key: string]: QueryParam;
};

function queryParamsToString(params: QueryParams): string {
	const parts = [];
	for (const [key, value] of Object.entries(params)) {
		parts.push(`${key}=${queryParamToString(value)}`);
	}
	return parts.join(" ");
}

function queryParamToString(param: QueryParam): string {
	if (param === null) {
		return "null";
	}

	switch (typeof param) {
		case "string":
			return `"${param.replace(/["\\]/g, "\\$&")}"`;

		case "number":
		case "boolean":
			return param.toString();
	}

	if (Array.isArray(param)) {
		return `[${param.map(queryParamToString).join(",")}]`;
	} else if (typeof param === "object") {
		const body = [];
		for (const [key, value] of Object.entries(param)) {
			body.push(`${key}:${queryParamToString(value)}`);
		}
		return `{${body.join(",")}}`;
	} else {
		throw new TypeError(`Unexpected param type ${typeof param} ${param}`);
	}
}
