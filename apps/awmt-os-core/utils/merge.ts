import fs from "fs";
import { set } from "object-path";

const example = fs.readFileSync("utils/example.txt", "utf-8");

// @ts-ignore
const jsons = JSON.parse(example)?.data.model.features.map((f) => JSON.parse(f.model.string_value));

export default function merge(jsons: any[]): any {
	let properties = new Map<(string | number)[], any>();

	function explore(json: any, path: (string | number)[]): any {
		let current_property = properties.get(path);

		if (typeof json === "string") {
			if (current_property === undefined || current_property === null) properties.set(path, json);
			return;
		}
		if (typeof json === "number") {
			if (current_property === undefined || current_property === null) properties.set(path, json);
			return;
		}
		if (typeof json === "boolean") {
			if (current_property === undefined || current_property === null) properties.set(path, json);
			return;
		}

		if (Array.isArray(json) && json.length === 0) {
			if (current_property === undefined || current_property === null) properties.set(path, json);
			return;
		}

		if (Array.isArray(json) && typeof json[0] === "string") {
			if (current_property === undefined || current_property === null || current_property.length === 0) properties.set(path, json);
			return;
		}

		if (Array.isArray(json) && typeof json[0] === "number") {
			if (current_property === undefined || current_property === null || current_property.length === 0) properties.set(path, json);
			return;
		}

		if (Array.isArray(json) && typeof json[0] === "boolean") {
			if (current_property === undefined || current_property === null || current_property.length === 0) properties.set(path, json);
			return;
		}

		if (Array.isArray(json)) {
			json.forEach((value, index) => {
				explore(value, [...path, 0]);
			});
			return;
		}
		if (typeof json === "object" && json !== null) {
			Object.keys(json).forEach((key) => {
				explore(json[key], [...path, key]);
			});
			return;
		}

		if (current_property === undefined || current_property === null) properties.set(path, json);

		return;
	}

	explore(jsons, ["data"]);

	let data = {};

	properties.forEach((value, key) => {
		// console.log(key, value);
		try {
			if(value !== null) set(data, key, value);
		} catch (e) {
			console.log(e);
		}
	});

    // @ts-ignore
	return data.data[0];
}

console.log(merge(jsons));
