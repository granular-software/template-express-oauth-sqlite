import type { ActionOutput, FieldDefinition, SerializedView, ViewComponent } from "@joshu/os-types";
import { MutationPointer, Pointer } from "./pointer";

export class Action {
	constructor(id: string) {
		this.id = id;
	}

	id: string;
	_loaded: boolean = false;

	_label: string = "";
	_description: string = "";

	_model: Pointer | null = null;

	_output: ActionOutput | null = null;

	_fields: FieldDefinition[] = [];

	_state: "created" | "preparing" | "running" | "success" | "error" = "created";

	_created_at: string = "";

	_created_by: "user" | "agent" = "user";

	_window_id: string | null = null;

	async get_report() {
		const pointer = new Pointer(this.id);

		const _report = await pointer.interface("Action").execute({
			id: true,
			created_at: true,
			fields: true,
			model: {
				path: true,
				label: true,
				description: true,
			},
			output: true,
			state: true,
		});

		if (!_report) {
			throw new Error("Action report not found : " + this.id);
		}

		const report = {
			id: _report.id,
			created_at: _report.created_at,
			fields: JSON.parse(_report.fields) as FieldDefinition[],
			action_instance_model: _report.model?.path!,
			description: _report.model?.description!,
			label: _report.model?.label!,
			output: JSON.parse(_report.output) as ActionOutput,
			state: _report.state as "created" | "preparing" | "running" | "success" | "error",
		};

		this._state = report.state;
		this._output = report.output;
		this._fields = report.fields;
		this._label = report.label;
		this._description = report.description;
		this._model = new Pointer(report.action_instance_model);
		this._loaded = true;


		return report;
	}

	async fill_fields(fields: FieldDefinition[]) {
		const pointer = new MutationPointer(this.id);

		const _report = await pointer.interface("ActionMutation").execute({
			fill: [
				{
					values: JSON.stringify(fields),
				},

				{
					id: true,
					state: true,
				},
			],
		});

		return await this.get_report();
	}

	async apply() {
		const pointer = new MutationPointer(this.id);

		const _report = await pointer.interface("ActionMutation").execute({
			apply: {
				id: true,
				state: true,
			},
		});

		return await this.get_report();
	}
}