import { NotFound } from "@aws-sdk/client-s3";
import { SHA256 } from "bun";
import { Effect } from "effect";
import fs from "fs";
import { getFileFromS3, uploadFileToS3 } from "./csv_export";
export default class HttpRequest {
	public url: string;
	public method: "GET" | "POST" | "PUT" | "DELETE";
	public headers: { [key: string]: string } = { "Content-Type": "application/json" };
	public query_params: { [key: string]: string | number | boolean } = {};
	public body: JsonBody | undefined = {};

	constructor(url: string, method: "GET" | "POST" | "PUT" | "DELETE") {
		this.url = url;
		this.method = method;
	}

	static GET(url: string) {
		return new HttpRequest(url, "GET");
	}

	static POST(url: string) {
		return new HttpRequest(url, "POST");
	}

	static PUT(url: string) {
		return new HttpRequest(url, "PUT");
	}

	static DELETE(url: string) {
		return new HttpRequest(url, "DELETE");
	}

	public set_url(url: string) {
		this.url = url;
	}

	public add_header(key: string, value: string) {
		this.headers[key] = value;
	}

	public add_headers(headers: { [key: string]: string }) {
		this.headers = { ...this.headers, ...headers };
	}

	public add_query_param(key: string, value: string | number | boolean) {
		this.query_params[key] = value;
	}

	public add_query_params(query_params: { [key: string]: string | number | boolean }) {
		this.query_params = { ...this.query_params, ...query_params };
	}

	public set_body(body: JsonBody) {
		this.body = body;
	}

	public get_request_hash() {
		const query_params = Object.keys(this.query_params)
			.map((key) => `${key}=${encodeURIComponent(this.query_params[key])}`)
			.join("&");
		const url = `${this.url}?${query_params}`;

		const hashed_url = new SHA256().update(this.method + url).digest("hex");

		return hashed_url;
	}

	public async make_call() {
		const query_params = Object.keys(this.query_params)
			.map((key) => `${key}=${encodeURIComponent(this.query_params[key])}`)
			// .map((key) => `${key}=${this.query_params[key]}`)
			.join("&");
		const url = `${this.url}?${query_params}`;

		// console.log(url,this.query_params)

		console.log(url);

		const hashed_url = new SHA256().update(this.method + url).digest("hex");

		// search for file called {hashed_url}.json in the mock folder at the root of the project

		const mock_file = `./mock/${hashed_url}.json`;

		let s3_file;

		try {
			s3_file = await getFileFromS3(process.env.AWS_FILES_BUCKET as string, `${hashed_url}.json`);
		} catch (e) {
			console.log(e);
		}

		if (s3_file) {
			const string_file = s3_file?.toString("utf-8");
			console.log("using s3 file", s3_file);
			return pre_parsing_formatter(JSON.parse(string_file));
		} else {
			// console.log("no s3 file found for ", hashed_url);
			// console.log("saving the mock file to s3");

			try {
				const file = fs.readFileSync(mock_file, "utf-8");

				if (file) {
					const buff = Buffer.from(file, "utf-8");
					await uploadFileToS3(buff, process.env.AWS_FILES_BUCKET as string, `${hashed_url}.json`);

					return pre_parsing_formatter(JSON.parse(file));
				} else {
					console.log("no file found at all for ", mock_file);
				}
			} catch (e) {}
		}

		console.log("no file found for ", hashed_url);

		// throw { message: "Mock Not found" };

		const res = await fetch(url, {
			method: this.method,
			headers: {
				...this.headers,
			},
			body: this.method !== "GET" ? JSON.stringify(this.body) : undefined,
		}).then((res) => res.json()).catch((e) => console.log(e));

		// store the response in a file called {hashed_url}.json in the mock folder at the root of the project

		// fs.writeFileSync(mock_file, JSON.stringify(res));

		// console.log("writing to mock file", mock_file);

		return pre_parsing_formatter(res);
	}

	public make_call_effect() {
		return Effect.tryPromise({
			try: async () => this.make_call(),
			catch: (e) => console.log(e),
		});
	}
}

interface JsonBody {
	[key: string]: any;
}

function pre_parsing_formatter(json: any) {
	try {

		if (JSON.stringify(json).indexOf("https://api.cfnews.net") === -1) {
			return json;
		} else {
			return preformate_json(json);
		}
	} catch (e) {
		console.log("error in pre_parsing_formatter")
		console.log(e);
		return json;
	}
}

function preformate_json(json: any) {
	// explore recursively the json object

	if (JSON.stringify(json).indexOf("https://api.cfnews.net") === -1) {
		return json;
	}

	const recursive = (json: any, key: string | null = null): any => {
		if (json === null) {
			return null;
		}

		if (Array.isArray(json)) {
			if (json.every((item) => item && typeof item === "object" && item.endpoint && (item.endpoint.indexOf("/acteur/") > -1 || item.endpoint.indexOf("/societe/") > -1 || item.endpoint.indexOf("/people/") > -1))) {
				const items = json
					.map((it) => {
						if (it.endpoint.indexOf("/acteur/") > -1) {
							return { ...it, kind: "acteur", related_people: [] };
						} else if (it.endpoint.indexOf("/societe/") > -1) {
							return { ...it, kind: "societe", related_people: [] };
						} else if (it.endpoint.indexOf("/people/") > -1) {
							return { ...it, kind: "people", related_companies: [], related_people: [] };
						} else {
							console.log("unknown kind", it.endpoint);
							return null;
						}
					})
					.filter((x) => x);

				let results = [];

				for (let item of items) {
					// const is_generic = ["PERSONNE(S) PHYSIQUE(S)", "BUSINESS ANGEL(S)", "MANAGER(S)", "FONDATEUR(S)", "INVESTISSEUR(S) PRIVÉ(S)", "CRÉANCIER(S)", "ACTIONNAIRES FAMILIAUX"].includes(item.name);

					if (item.kind === "acteur") {
						results.push(item);
					} else if (item.kind === "societe") {
						results.push(item);
					} else if (item.kind === "people") {
						let result_to_push_to = results.findLast((result) => result.kind === "acteur" || result.kind === "societe");

						if (result_to_push_to && result_to_push_to.kind === "acteur") {
							result_to_push_to.related_people.push(item);

							item.related_companies.push({
								...result_to_push_to,
								related_people: [],
							});
						}

						if (result_to_push_to && result_to_push_to.kind === "societe") {
							result_to_push_to.related_people.push(item);

							item.related_companies.push({
								...result_to_push_to,
								related_people: [],
							});
						}

						results.push(item);
					}
				}

				return results;
			}

			return json.map((item) => recursive(item, null));
		}

		if (typeof json === "object") {
			const keys = Object.keys(json);
			const result: any = {};

			for (const key of keys) {
				result[key] = recursive(json[key], key);
			}

			return result;
		}

		return json;
	};

	return recursive(json, null);
}
