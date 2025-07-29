import { append } from "../utils/path";
import { DeclarationQueue, ModelDeclaration, boot_queue } from "./boot";

export default function handle_declaration(queue: DeclarationQueue, path: string, declaration: ModelDeclaration) {
	if (declaration.has) {
		Object.keys(declaration.has).map((key) => {
			queue.push({
				path,
				op: "has_submodel",
				submodel: key,
			});

			handle_declaration(queue, append(path, key), declaration.has![key]);
		});
	}

	// if (declaration.is_a) {
	// 	declaration.is_a.map((class_name) =>
	// 		queue.push({
	// 			path,
	// 			op: "has_class",
	// 			class: class_name,
	// 		}),
	// 	);
	// }

	if (declaration.extends) {
		declaration.extends.map((superclass) => {
			queue.push({
				path,
				op: "extends",
				superclass,
			});
		});
	}

	if (declaration.instance_of) {
		declaration.instance_of.map((prototype) => {
			queue.push({
				path,
				op: "instance_of",
				prototype,
			});
		});
	}

	if (declaration.label) {
		queue.push({
			path,
			op: "set_label",
			label: declaration.label,
		});
	}

	if (declaration.description) {
		queue.push({
			path,
			op: "set_description",
			description: declaration.description,
		});
	}

	if (declaration.ref) {
		queue.push({
			path,
			op: "has_ref",
			ref: declaration.ref.path,
		});
	}

	if (declaration.submodel_templates) {
		declaration.submodel_templates.map((template) =>
			queue.push({
				path,
				op: "has_submodel_template",
				template,
			}),
		);
	}

	if (declaration.submodel_templates_from_prototypes) {
		declaration.submodel_templates_from_prototypes.map((template) =>
			queue.push({
				path,
				op: "has_submodel_templates_from_prototypes",
				template,
			}),
		);
	}

	// if (declaration.should_be_a) {
	// 	declaration.should_be_a.map((ref) =>
	// 		queue.push({
	// 			path,
	// 			op: "should_be_a",
	// 			ref,
	// 		}),
	// 	);
	// }

	if (declaration.string_value) {
		queue.push({
			path,
			op: "string_value",
			value: declaration.string_value,
		});
	}

	if (declaration.number_value) {
		queue.push({
			path,
			op: "number_value",
			value: declaration.number_value,
		});
	}

	if (declaration.boolean_value) {
		queue.push({
			path,
			op: "boolean_value",
			value: declaration.boolean_value,
		});
	}

	if (declaration.interface_constraints) {
		for (let constraint of declaration.interface_constraints) {
			queue.push({
				path,
				op: "interface_constraint",
				interface: constraint,
			});
		}
	}

	if (declaration.prototype_constraints) {
		for (let constraint of declaration.prototype_constraints) {
			queue.push({
				path,
				op: "prototype_constraint",
				prototype: constraint,
			});
		}
	}

	if (declaration.superclass_constraints) {
		for (let constraint of declaration.superclass_constraints) {
			queue.push({
				path,
				op: "superclass_constraint",
				superclass: constraint,
			});
		}
	}

	if (declaration.set_of) {
		queue.push({
			path,
			op: "set_of",
			template: declaration.set_of,
		});
	}

	if (declaration.in_set) {
		queue.push({
			path,
			op: "in_set",
			set: declaration.in_set,
		});
	}

	return queue;
}
