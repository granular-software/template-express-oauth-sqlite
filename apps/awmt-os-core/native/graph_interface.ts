import { Context, Effect } from "effect";
import { Ant } from "./tags";

export async function handler<T>(ant: Ant, interf: Context.Tag<T, T>, method: keyof T) {

	const handler = await ant.use_handler(interf, method);
	// @ts-ignore
	return await ant.provide(handler);
}

export default function graph_interface<T, K extends keyof T>(interf: Context.Tag<T, T>) {
	let api_schema: (arg0: { query: { typeDefs: string | null; resolvers: {} | undefined }; mutation: { typeDefs: string | null; resolvers: {} | undefined } }) => any;
	let service_name = interf.identifier as string;

	let query_resolvers = {};

	let mutation_resolvers = {};

	return {
		schema: (query_typedefs: string | null, mutation_typedefs: string | null) => {
			api_schema = build_api_schema(service_name) as any;

			const resp = {
				query: (method: K, handler: unknown) => {
					// @ts-ignore
					query_resolvers[method] = handler;
					return resp;
				},

				mutation: (method: K, handler: unknown) => {
					// @ts-ignore
					mutation_resolvers[method] = handler;
					return resp;
				},

				build: () => {
					return api_schema({
						query: {
							typeDefs: query_typedefs || "",
							resolvers: query_typedefs ? query_resolvers : undefined,
						},
						mutation: {
							typeDefs: mutation_typedefs || "",
							resolvers: mutation_typedefs ? mutation_resolvers : undefined,
						},
					});
				},
			};

			return resp;
		},
	};
}

function build_api_schema(name: string) {
	return ({
		query,
		mutation,
	}: {
		query?: {
			typeDefs: string;
			resolvers: any;
		};
		mutation?: {
			typeDefs: string;
			resolvers: any;
		};
	}) => {
		let QueryName = name;
		let MutationName = name + "Mutation";

		let InterfaceResolver = query?.typeDefs
			? {
					[QueryName]: async (ant: Ant) => ant,
			  }
			: {};

		let MutationResolver = mutation?.typeDefs
			? {
					[MutationName]: async (ant: Ant) => ant,
			  }
			: {};

		let q_typeDefs = query?.typeDefs
			? `
				type Interface {
					${query ? `${QueryName}: ${QueryName}` : ``}
				}

			  	${query?.typeDefs || ""}
			`
			: ``;

		let m_typeDefs = mutation?.typeDefs
			? `
				type MutationInterface {
					${mutation ? `${MutationName}: ${MutationName}` : ``}
				}

				${mutation?.typeDefs || ""}
			`
			: ``;

		let resolvers = {};

		if (query?.typeDefs) {
			resolvers = {
				...resolvers,
				[QueryName]: query?.resolvers,
				Interface: InterfaceResolver,
			};
		}

		if (mutation?.typeDefs) {
			resolvers = {
				...resolvers,
				[MutationName]: mutation?.resolvers,
				MutationInterface: MutationResolver,
			};
		}

		return {
			typeDefs: `
				${q_typeDefs}
				${m_typeDefs}
		`,
			resolvers: resolvers as any,
		};
	};
}
