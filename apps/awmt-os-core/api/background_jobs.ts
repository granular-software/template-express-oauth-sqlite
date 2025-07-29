interface BackgroundJobOptions {
	on_started?: () => void;
	on_update?: (message: string) => void;
	on_error?: (error: Error) => void;
	on_end?: () => void;
}

export function start_background_job(name: string, options: BackgroundJobOptions) {
	const job = new BackgroundJob(name, options);

	job.start();

	return job;
}

class BackgroundJob {
	private name: string;
	private options: BackgroundJobOptions;

	private worker: Worker | undefined;

	constructor(name: string, options: BackgroundJobOptions) {
		this.name = name;
		this.options = options;
	}

	public start() {
		if (this.options.on_started) {
			this.options.on_started();
		}

		const worker_url = new URL("../background_jobs/connector_refresh.ts", import.meta.url).href;
		const worker = new Worker(worker_url);

		this.worker = worker;

		worker.onmessage = (event) => {
			console.log("event data", event.data);
		};

		worker.addEventListener("close", (event) => {
			console.log("worker is being closed");
		});
	}

	public update(message: string) {
		if (this.options.on_update) {
			this.options.on_update(message);
		}
	}

	public error(error: Error) {
		if (this.options.on_error) {
			this.options.on_error(error);
		}
	}

	public end() {
		if (this.options.on_end) {
			this.options.on_end();
		}
	}
}

export class BackgroundWorker {
	constructor(worker: Worker) {
		this.worker = worker;
	}

	private worker: Worker;

	private _progress = 0;

	private _start_time = new Date()

	public send_update(message: string) {
		this.worker.postMessage(message);
	}

	public send_error(error: Error) {
		this.worker.postMessage(error);
	}

	public shut_down() {
		this.worker.terminate();
	}

	public set_progress(progress: number) {
		this.worker.postMessage({ type: "progress", progress });
		this._progress = progress;
	}

	get progress() {
		return this._progress;
	}

	get start_time() {
		return this._start_time;
	}
}
