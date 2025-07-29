import { Effect } from "effect";
import { Ant } from "../api/Ant";

const ImporterMap = new Map<string, ImporterModel>();

export default class ImporterModel {
	constructor(id: string) {
		console.log("Importer");
		this.id = id;
	}

	protected id: string;
	protected total_pages: number = 0;
	protected pages_processed: number = 0;
	protected objects_processed: number = 0;
	protected remaining_objects: number = 0;
	protected failed_objects: number = 0;

	public ant: Ant | null = null;

	static create(ant: Ant) {
		const that = this;
		const id = crypto.randomUUID();
		const impo = new ImporterModel(id);

		// const ant = Ant.create_model(id, id, {
		// 	instance_of: ["csv_export"],
		// });

		ImporterMap.set(id, impo);

		console.log("CREATED IMPORTER", id);

		// const cl = this;

		const set_ant = (a: Ant) => {
			impo.ant = a;
		};

		return Effect.gen(function* (_) {
			const _ant = yield* _(Ant.from_path(ant.path));

			if (!_ant) {
				return null;
			}

			const importer = yield* _(_ant.instantiate());

			yield* _(Effect.logInfo("Created importer model with ant " + importer?.path));

			if (!importer) {
				return null;
			}

			set_ant(importer);

			yield* _(importer.set_number_value_at("start_date", new Date().getTime()));

			return impo;
		});
	}

	public end() {
		const that = this;
		const d = new Date().getTime();
		return Effect.gen(function* (_) {
			const ant = that.ant;

			if (!ant) {
				return null;
			}

            yield* _(ant.set_number_value_at("objects_processed", that.objects_processed));
			yield* _(ant.set_number_value_at("end_date", d));

			// const pages_processed = yield* _(ant.number_value("pages_processed"));

			// if (pages_processed) {
			// 	yield* _(ant.set_number_value_at("pages_processed", pages_processed));
			// }

			// return true;
		});
	}

	public increment_pages_processed() {
		// this.pages_processed++;

		const that = this;

		return Effect.gen(function* (_) {
			that.pages_processed++;

			const ant = that.ant;

			if (!ant) {
				return null;
			}

			yield* _(ant.set_number_value_at("pages_processed", that.pages_processed));
		});
	}

	public increment_objects_processed() {
		const that = this;

		const should_do = that.objects_processed % 10 === 0;

		return Effect.gen(function* (_) {
			that.objects_processed++;

			const ant = that.ant;

			if (!ant) {
				return null;
			}

			// set_number_value_at ONLY if it has not been set in the last 5 seconds (5000 ms) to avoid overwriting the value

			if (should_do) {
				yield* _(ant.set_number_value_at("objects_processed", that.objects_processed));
			}
		});
	}

	public increment_failed_objects() {
		// this.failed_objects++;

		const that = this;

		return Effect.gen(function* (_) {
			that.failed_objects++;

			const ant = that.ant;

			if (!ant) {
				return null;
			}

			yield* _(ant.set_number_value_at("failed_objects", that.failed_objects));
		});
	}

	public set_remaining_objects(remaining: number) {
		// this.remaining_objects = remaining;

		const that = this;

		return Effect.gen(function* (_) {
			that.remaining_objects = remaining;

			const ant = that.ant;

			if (!ant) {
				return null;
			}

			yield* _(ant.set_number_value_at("remaining_objects", remaining));
		});
	}

	public set_total_pages(total: number) {
		// this.total_pages = total;

		const that = this;

		return Effect.gen(function* (_) {
			that.total_pages = total;

			const ant = that.ant;

			if (!ant) {
				return null;
			}

			yield* _(ant.set_number_value_at("total_pages", total));
		});
	}

	static get(id: string) {
		return ImporterMap.get(id);
	}

	static remove(id: string) {
		return ImporterMap.delete(id);
	}
}
