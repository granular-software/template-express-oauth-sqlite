import { createClient as createGraphQLClient, linkTypeMap, ClientOptions } from "graphql-typed-client";
import typeMapJson from "./typeMap.json";

const createClient = (options: ClientOptions) => {
  // @ts-ignore
	const typeMap = linkTypeMap(typeMapJson);
	return createGraphQLClient({
		...options,
		queryRoot: typeMap.Query,
		mutationRoot: typeMap.Mutation,
	});
};

export default createClient;