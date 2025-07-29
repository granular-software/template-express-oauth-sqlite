import { Context, Effect } from "effect";
import graph_interface, { handler } from "../../../native/graph_interface";
import { Ant } from "../../../native/tags";

export interface Date {
	readonly s_timestamp: (ant: Ant) => Effect.Effect<Ant, unknown, number | null>;
	readonly ms_timestamp: (ant: Ant) => Effect.Effect<Ant, unknown, number | null>;

	readonly get: (ant: Ant, format: string) => Effect.Effect<Ant, unknown, string | null>;

	readonly set_now: (ant: Ant) => Effect.Effect<Ant, unknown, Ant>;
	readonly set_timestamp: (ant: Ant, timestamp: number) => Effect.Effect<Ant, unknown, Ant>;
	readonly set: (ant: Ant, format: string, date: string) => Effect.Effect<Ant, unknown, Ant>;

	readonly add_seconds: (ant: Ant, seconds: number) => Effect.Effect<Ant, unknown, Ant>;
	readonly add_minutes: (ant: Ant, minutes: number) => Effect.Effect<Ant, unknown, Ant>;
	readonly add_hours: (ant: Ant, hours: number) => Effect.Effect<Ant, unknown, Ant>;
	readonly add_days: (ant: Ant, days: number) => Effect.Effect<Ant, unknown, Ant>;
	readonly add_months: (ant: Ant, months: number) => Effect.Effect<Ant, unknown, Ant>;
	readonly add_years: (ant: Ant, years: number) => Effect.Effect<Ant, unknown, Ant>;
}

export const Date = Context.Tag<Date>("Date");

export const Schema = graph_interface(Date)
	.schema(
		/* GraphQL */ `
			type Date {
				ms_timestamp: Float
				s_timestamp: Float
				get(format: String!): String
			}
		`,
		/* GraphQL */ `
			type DateMutation {
				set_now: Date
				set_timestamp(timestamp: Float!): Date
				set(format: String!, date: String!): Date
				add_seconds(seconds: Int!): Date
				add_minutes(minutes: Int!): Date
				add_hours(hours: Int!): Date
				add_days(days: Int!): Date
				add_months(months: Int!): Date
				add_years(years: Int!): Date
			}
		`,
	)
	// .query("get_timestamp", async (ant: Ant, args: {}) => {
	// 	const get_timestamp = await handler(ant, Date, "get_timestamp");
	// 	return Effect.runPromise(await get_timestamp(ant));
	// })
	.query("s_timestamp", async (ant: Ant, args: {}) => {
		const s_timestamp = await handler(ant, Date, "s_timestamp");
		return Effect.runPromise(await s_timestamp(ant));
	})
	// .query("ms_timestamp", async (ant: Ant, args: {}) => {
	// 	console.log("MS TIMESTAMP")
	// 	const ms_timestamp = await handler(ant, Date, "ms_timestamp");
	// 	return Effect.runPromise(await ms_timestamp(ant));
	// })
	.query("ms_timestamp", async (ant: Ant) => {
		console.log("MS TIMESTAMP", ant.path);

		const interfaces = await Effect.runPromise(ant.provided_interfaces());

		console.log("Interfaces", interfaces);

		const ms_timestamp = await handler(ant, Date, "ms_timestamp");
		return Effect.runPromise(await ms_timestamp());
	})
	.query("get", async (ant: Ant, args: { format: string }) => {
		const get = await handler(ant, Date, "get");
		return Effect.runPromise(await get(ant, args.format));
	})

	.mutation("set_now", async (ant: Ant, args: {}) => {
		const set_now = await handler(ant, Date, "set_now");
		return Effect.runPromise(await set_now(ant));
	})
	.mutation("set_timestamp", async (ant: Ant, args: { timestamp: number }) => {
		const set_timestamp = await handler(ant, Date, "set_timestamp");
		return Effect.runPromise(await set_timestamp(ant, args.timestamp));
	})
	.mutation("set", async (ant: Ant, args: { format: string; date: string }) => {
		const set = await handler(ant, Date, "set");
		return Effect.runPromise(await set(ant, args.format, args.date));
	})
	.mutation("add_seconds", async (ant: Ant, args: { seconds: number }) => {
		const add_seconds = await handler(ant, Date, "add_seconds");
		return Effect.runPromise(await add_seconds(ant, args.seconds));
	})
	.mutation("add_minutes", async (ant: Ant, args: { minutes: number }) => {
		const add_minutes = await handler(ant, Date, "add_minutes");
		return Effect.runPromise(await add_minutes(ant, args.minutes));
	})
	.mutation("add_hours", async (ant: Ant, args: { hours: number }) => {
		const add_hours = await handler(ant, Date, "add_hours");
		return Effect.runPromise(await add_hours(ant, args.hours));
	})
	.mutation("add_days", async (ant: Ant, args: { days: number }) => {
		const add_days = await handler(ant, Date, "add_days");
		return Effect.runPromise(await add_days(ant, args.days));
	})
	.mutation("add_months", async (ant: Ant, args: { months: number }) => {
		const add_months = await handler(ant, Date, "add_months");
		return Effect.runPromise(await add_months(ant, args.months));
	})
	.mutation("add_years", async (ant: Ant, args: { years: number }) => {
		const add_years = await handler(ant, Date, "add_years");
		return Effect.runPromise(await add_years(ant, args.years));
	})

	.build();
