import { Effect } from "effect";
import { native_model } from "../../native/native_model";
import CATEGORY from "../../native/feature_categories";
import moment from "moment";
import { Date } from "./interfaces/date";

export const date = native_model.path("date").label("Date");

date.implement_interface(Date).provide({
	ms_timestamp: (ant) =>
		Effect.gen(function* (_) {
			const timestamp = yield* _(ant.number_value());
			if (!timestamp) return null;

			return timestamp;
		}),

	s_timestamp: (ant) =>
		Effect.gen(function* (_) {
			const timestamp = yield* _(ant.number_value());
			if (!timestamp) return null;
			return Math.floor(timestamp / 1000);
		}),

	set_now: (ant) =>
		Effect.gen(function* (_) {
			const timestamp = moment().valueOf();
			yield* _(ant.set_number_value(timestamp));
			return ant;
		}),

	set_timestamp: (ant, timestamp) =>
		Effect.gen(function* (_) {
			yield* _(Effect.logInfo("Setting timestamp to " + timestamp));
			yield* _(ant.set_number_value(timestamp));
			return ant;
		}),

	get: (ant, format) =>
		Effect.gen(function* (_) {
			const timestamp = yield* _(ant.number_value());
			if (!timestamp) return null;
			return moment(timestamp).format(format);
		}),

	set: (ant, format, date) =>
		Effect.gen(function* (_) {
			const timestamp = moment(date, format).valueOf();
			yield* _(ant.set_number_value(timestamp));
			return ant;
		}),

	add_seconds: (ant, seconds) =>
		Effect.gen(function* (_) {
			const current_timestamp = yield* _(ant.number_value());
			const new_date = moment(current_timestamp).add(seconds, "seconds").valueOf();
			yield* _(ant.set_number_value(new_date));
			return ant;
		}),

	add_minutes: (ant, minutes) =>
		Effect.gen(function* (_) {
			const current_timestamp = yield* _(ant.number_value());
			const new_date = moment(current_timestamp).add(minutes, "minutes").valueOf();
			yield* _(ant.set_number_value(new_date));
			return ant;
		}),

	add_hours: (ant, hours) =>
		Effect.gen(function* (_) {
			const current_timestamp = yield* _(ant.number_value());
			const new_date = moment(current_timestamp).add(hours, "hours").valueOf();
			yield* _(ant.set_number_value(new_date));
			return ant;
		}),

	add_days: (ant, days) =>
		Effect.gen(function* (_) {
			const current_timestamp = yield* _(ant.number_value());
			const new_date = moment(current_timestamp).add(days, "days").valueOf();
			yield* _(ant.set_number_value(new_date));
			return ant;
		}),

	add_months: (ant, months) =>
		Effect.gen(function* (_) {
			const current_timestamp = yield* _(ant.number_value());
			const new_date = moment(current_timestamp).add(months, "months").valueOf();
			yield* _(ant.set_number_value(new_date));
			return ant;
		}),

	add_years: (ant, years) =>
		Effect.gen(function* (_) {
			const current_timestamp = yield* _(ant.number_value());
			const new_date = moment(current_timestamp).add(years, "years").valueOf();
			yield* _(ant.set_number_value(new_date));
			return ant;
		}),
});

// const date_before_filter = new native_model("date_before_filter", "Before").with({
// 	has: {
// 		date: {
// 			instance_of: ["date"],
// 		},
// 	},
// });

// const date_after_filter = new native_model("date_after_filter", "After").with({
// 	has: {
// 		date: {
// 			instance_of: ["date"],
// 		},
// 	},
// });

// date.feature(date_before_filter, CATEGORY.FILTER);
// date.feature(date_after_filter, CATEGORY.FILTER);
