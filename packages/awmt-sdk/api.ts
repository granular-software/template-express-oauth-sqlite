import createClient from "./api/createClient";
import "./api/typeMap.json";

export const api = createClient({
	fetcher: ({ query, variables }, fetch, qs) => {
		const url = "http://localhost:3000/graphql";

		const options = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ query, variables }),
		};

		return fetch(url, options)
			.then((response) => response.json())
			.catch((error) => console.error("Error:", error));
	},
	subscriptionCreatorOptions: {
		uri: "wss://localhost:3000/graphql",
		options: {
			connectionParams: {
				token: "MY_TOKEN",
			},
		},
	},
});
