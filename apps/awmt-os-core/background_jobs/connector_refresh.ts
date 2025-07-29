import { Ant, StandaloneObjectAnt } from "../api/Ant";
import { BackgroundWorker } from "../api/background_jobs";

declare var self: Worker;
let elements_processed = 0;
let elements_total = 0;
let elements_remaining = 0;
let failed_elements = 0;

const stripe_private = process.env.STRIPE_PRIVATE_KEY || "";

import Stripe from "stripe";

const stripe = new Stripe(stripe_private, {
	apiVersion: "2023-10-16",
});

let last_id: string | undefined = undefined;

let has_more = true;

async function get_invoices(start_after: string | undefined) {
	const list = await stripe.invoices.list({
		limit: 100,
		starting_after: start_after,
	});

	return list;
}

while (has_more) {
	const start = Date.now();
	const list = await get_invoices(last_id);
	console.log("Fetched in " + (Date.now() - start) + "ms");

	has_more = list.has_more;
	elements_total += list.data.length;
	elements_remaining += list.data.length;

	for (const invoice of list.data) {
		elements_remaining -= 1;
		elements_processed += 1;

		// console.log("invoice", invoice.id);

		const [invoice_ant, existing] = await Ant.do(StandaloneObjectAnt.assert_standalone("moisof_tubrkwl9ww", invoice.id));

		console.log(elements_processed, "/", elements_total, "remaining");

		console.log("invoice", invoice_ant.nodes);
	}

	if (list.has_more) {
		has_more = true;
		last_id = list.data[list.data.length - 1].id;
	}
}

console.log("elements_processed", elements_processed);

const worker = new BackgroundWorker(self);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

worker.send_update("-- Starting at " + worker.start_time);

await delay(4000);

worker.send_update("-- Finished in " + (Date.now() - worker.start_time.getTime()) + "ms");

await delay(4000);

// const self = this as unknown as Worker;

// self.onmessage = (event: MessageEvent) => {

//     console.log(event.data);
//     self.postMessage("world from worker");
// };

const test = await Ant.do(Ant.assert("test"));

console.log({ test });

worker.shut_down();
