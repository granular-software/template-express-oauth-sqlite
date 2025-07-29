import { snakeCase } from "snake-case";
import { faker } from "@faker-js/faker";

export default function clean_name(name?: string) {
	if (!name) return snakeCase("m" + faker.string.nanoid(16).toString().toLowerCase().replace(/-/g, ""));

	return name
		.split(":")
		.map((name) => snakeCase(name))
		.join(":");
}

export function clean_submodel_name(name?: string) {
	if (!name) return snakeCase("s" + faker.string.nanoid(6).toString().toLowerCase().replace(/-/g, ""));

	return snakeCase(name);
}

export function clean_feature_name(name?: string) {
	if (!name) return snakeCase("f" + faker.string.nanoid(16).toString().toLowerCase().replace(/-/g, ""));

	return snakeCase(name);
}

export function random_path_name() {
	return faker.string.nanoid(16).toString().toLowerCase().replace(/-/g, "");
}
