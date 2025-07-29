import { ChatAnthropic } from "@langchain/anthropic";

import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import * as queries from "./queries";
import { graph_query } from "../graph";

const model = new ChatAnthropic({
	apiKey: process.env.ANTHROPIC_API_KEY,
	model: "claude-3-haiku-20240307",
	// model: "claude-3-opus-20240229",
	temperature: 0,
});

export async function ask(query: string) {}

export async function explain(query: string) {}

export async function* extract(query: string): AsyncGenerator<{
	status: "FOUND" | "CREATED" | "AMBIGUITY";
	kind: "INSTANCE_OF" | "SUBCLASS_OF" | "REFERENCE" | "HAS_PROPERTY" | "MODEL";
	label: string;
	start: Ant | null;
	end: Ant | null;
	ambiguities: {
		path: string;
		options: {
			model: Ant;
			score: number;
		};
	}[];
}> {
	const prompt = ChatPromptTemplate.fromMessages([
		["system", extraction_system_prompt.replace(/\t/g, "")],
		["human", "{input}"],
	]);

	const chain = prompt.pipe(model).pipe(new JsonOutputParser());

	// const response = await chain.invoke({
	// 	input: query.replace(/\?/g, ""),
	// });

	const prototypes = await queries.prototypes();

	const stream = await chain.stream({
		input: query.replace(/\?/g, ""),
		history: prototypes.map((p) => ` - ${p.path}${p.label ? ` : ${p.label}` : ""}`).join("\n"),
	});

	console.log({
		input: query.replace(/\?/g, ""),
		history: prototypes.map((p) => ` - ${p.path}${p.label ? ` : ${p.label}` : ""}`),
	});

	let d: Answer | null = null;

	let recorded_objects = new Map<string, Object>();
	let recorded_inheritances = new Map<string, Inheritance>();
	let recorded_classes = new Map<string, Class>();

	let pageranks = new Map<string, number>();

	const _pageranks = await graph_query<{
		label: string;
		score: number;
	}>(`CALL algo.pageRank('Model', 'INSTANCE_OF') YIELD node, score RETURN node.name as label, score`);

	for (let pagerank of _pageranks) {
		// console.log(pagerank.label, Math.log10(1 + pagerank.score));
		pageranks.set(pagerank.label, pagerank.score);
	}

	for await (const _message of stream) {
		const message = _message as Answer;
		d = message;

		// console.log(JSON.stringify(message, null, 4));

		async function match(name: string) {
			const ngrams = return_ngrams(name);

			let results = new Map<string, number>();

			for (let ngram of ngrams) {
				const search_results = await graph_query<{
					path: string;
					score: number;
				}>(`CALL db.idx.fulltext.queryNodes('Model', $query) YIELD node, score RETURN node.name as path, score`, {
					query: ngram,
				});

				// console.log(ngram, search_results);

				for (let { path, score } of search_results) {
					if (!results.has(path)) {
						results.set(path, score);
					}

					results.set(path, results.get(path)! + score);
				}
			}

			const max_score = Math.max(...results.values());

			for (let [path, score] of results) {
				results.set(path, score / max_score);
			}

			let pagerank_scores = new Map<string, number>();

			for (let [path, score] of results) {
				if (pageranks.has(path)) {
					pagerank_scores.set(path, pageranks.get(path)!);
				} else {
					console.log("Path not found in pageranks: ", path);
				}
			}

			const max_pagerank = Math.max(...pagerank_scores.values());

			for (let [path, score] of pagerank_scores) {
				pagerank_scores.set(path, score / max_pagerank);
			}

			// console.log(pagerank_scores);

			// for each result of ngrams search, display the path, the score, the pagerank score, and the * of the two scores

			let combined_scores = new Map<string, number[]>();

			for (let [path, score] of results) {
				combined_scores.set(path, [score, pagerank_scores.get(path)!, score * pagerank_scores.get(path)!]);
			}

			return combined_scores || new Map<string, number[]>();
		}

		// Objects
		if (message && message.o) {
			for (let o of message.o) {
				if (!o.i) continue;

				if (recorded_objects.has(o.id)) {
					recorded_objects.set(o.id, o);
				} else {
					recorded_objects.set(o.id, o);

					console.log("Object", o.n, o.i);
					// const top_k = await top_k_prototypes(o.n, 5);

					// console.log({ label: o.n, top_k });

					const start = await Ant.object_from_path(o.id);
					// const end = await Ant.object_from_path(o.id);

					const combined_scores = await match(o.n);

					// console.log("Query: ", o.n);

					// console.log(results);

					// for each result of the results, replace the score with the ration of the score and the max score

					// console.log(combined_scores);

					if (combined_scores.size === 0) {
						yield {
							status: "CREATED",
							kind: "MODEL",
							label: o.n,
							start: start,
							end: null,
							ambiguities: [],
						};
						continue;
					}

					const best_option = [...combined_scores.entries()].sort((a, b) => b[1][2] - a[1][2])[0];

					if (best_option[1][2] < 0.5) {
						yield {
							status: "AMBIGUITY",
							kind: "MODEL",
							label: o.n,
							start: start,
							end: null,
							ambiguities: await Promise.all(
								[...combined_scores.entries()].map(async ([path, [score, pagerank_score, combined_score]]) => ({
									path,
									options: {
										model: (await Ant.object_from_path(path))!,
										score: combined_score,
									},
								})),
							),
						};
					} else {
						yield {
							status: start ? "FOUND" : "CREATED",
							kind: "MODEL",
							label: o.n,
							start: start,
							end: null,
							ambiguities: [],
						};
					}
				}
			}
		}

		// Inheritances
		if (message && message.i) {
			for (let i of message.i) {
				if (!i.i) continue;
				if (recorded_inheritances.has(i.p)) {
					recorded_inheritances.set(i.p, i);
				} else {
					recorded_inheritances.set(i.p, i);
					console.log("Inheritance", i.p, i.c, i.t, i.i);

					const start = await Ant.object_from_path(i.c);
					const end = await Ant.object_from_path(i.p);

					yield {
						status: "CREATED",
						kind: i.t === "subclass" ? "SUBCLASS_OF" : "INSTANCE_OF",
						label: i.t === "subclass" ? "subclass" : "instance",
						start: start,
						end: end,
						ambiguities: [],
					};
				}
			}
		}

		// Classes
		if (message && message.c) {
			for (let c of message.c) {
				if (!c.i) continue;
				if (recorded_classes.has(c.id)) {
					recorded_classes.set(c.id, c);
				} else {
					recorded_classes.set(c.id, c);
					console.log("Class", c.n, c.i);

					// const start = await Ant.object_from_path(c.id);
					// const end = await Ant.object_from_path(c.id);

					// yield {
					// 	status: "CREATED",
					// 	kind: "INSTANCE_OF",
					// 	label: c.n,
					// 	start: start,
					// 	end: end,
					// 	ambiguities: [],
					// };
				}
			}
		}
	}

	console.log(JSON.stringify(d, null, 4));
}

function return_ngrams(text: string) {
	const words = text.split(" ");

	let ngrams = [];

	// return all the ngrams of the text from length 1 (all individual words) to the length of the text

	for (let i = 0; i < words.length; i++) {
		for (let j = i + 1; j <= words.length; j++) {
			ngrams.push(words.slice(i, j).join(" "));
		}
	}

	return ngrams.sort((a, b) => b.length - a.length);
}

let embeddings_map = new Map<
	string,
	{
		label: string;
		label_embeddings: number[];

		description: string | null;
		description_embeddings: number[] | null;
	}
>();

// import jison from "jison";

// const bnf = Bun.file("./api/methods/erDiagram.jison")

// const parser = new jison.Parser(bnf);

// console.log(parser);

import mermaid from "mermaid";

// const diagram = `classDiagram
// class Person {
//     +String name
// }
// class Interview {
//     +Date date
//     +Person interviewer
//     +Person interviewee
// }
// class PatrickCollison {
//     +Brother brother
// }
// class Brother {
//     +Person person
// }
// class CharlieMunger {
//     +Person person
// }
// PatrickCollison --* Brother
// Brother --* Person
// Person --* Interview
// Interview --* CharlieMunger
// Interview --* Brother`;

// import { Parser } from "jison";

// var parser = require("./erDiagram.js").parser;

// parser.yy = {
// 	parseError: function parseError(str: string, hash: any): void {
// 		if (hash.recoverable) {
// 			this.trace(str);
// 		} else {
// 			const error = new Error(str);
// 			// error.hash = hash;
// 			throw error;
// 		}
// 	},

// 	addRelation: function (...args: any[]): void {
// 		console.log("Adding relation:", args);
// 	},

// 	addMembers: function (...args: any[]): void {
// 		console.log("Adding members:", args);
// 	},

// 	cleanupLabel: function (label: string): string {
// 		console.log("Cleaning up label:", label);
// 		return label;
// 	},

// 	addNamespace: function (name: string): void {
// 		console.log("Adding namespace:", name);
// 	},

// 	addClassesToNamespace: function (namespace: string, classes: string[]): void {
// 		console.log("Adding classes to namespace:", namespace, classes);
// 	},

// 	addClass: function (className: string): void {
// 		// console.log("Adding class:", className);
// 	},

// 	setClassLabel: function (className: string, label: string): void {
// 		console.log("Setting class label:", className, label);
// 	},

// 	addAnnotation: function (className: string, annotation: string): void {
// 		console.log("Adding annotation to class:", className, annotation);
// 	},

// 	addMember: function (className: string, member: string): void {
// 		console.log("Adding member to class:", className, member);
// 	},

// 	addNote: function (text: string, className?: string): void {
// 		if (className) {
// 			console.log("Adding note for class:", className, text);
// 		} else {
// 			console.log("Adding note:", text);
// 		}
// 	},

// 	setDirection: function (direction: string): void {
// 		console.log("Setting direction:", direction);
// 	},

// 	relationType: {
// 		AGGREGATION: "aggregation",
// 		EXTENSION: "extension",
// 		COMPOSITION: "composition",
// 		DEPENDENCY: "dependency",
// 		LOLLIPOP: "lollipop",
// 	},

// 	lineType: {
// 		LINE: "line",
// 		DOTTED_LINE: "dotted_line",
// 	},

// 	setClickEvent: function (className: string, functionName: string, functionArgs?: any[]): void {
// 		console.log("Setting click event for class:", className);
// 		console.log("Function name:", functionName);
// 		if (functionArgs) {
// 			console.log("Function arguments:", functionArgs);
// 		}
// 	},

// 	setTooltip: function (className: string, tooltip: string): void {
// 		console.log("Setting tooltip for class:", className, tooltip);
// 	},

// 	setLink: function (className: string, link: string, target?: string): void {
// 		console.log("Setting link for class:", className, link);
// 		if (target) {
// 			console.log("Link target:", target);
// 		}
// 	},

// 	setCssClass: function (className: string, cssClass: string): void {
// 		console.log("Setting CSS class for class:", className, cssClass);
// 	},

// 	setCssStyle: function (className: string, styles: string): void {
// 		console.log("Setting CSS style for class:", className, styles);
// 	},

// 	setAccTitle: function (title: string): void {
// 		console.log("Setting accessibility title:", title);
// 	},

// 	setAccDescription: function (description: string): void {
// 		console.log("Setting accessibility description:", description);
// 	},

// 	// Other utility functions
// 	trace: function trace(): void {
// 		console.log("Trace:", arguments);
// 	},
// };

// console.log(parser.parse(diagram))

// async function update_current_prototypes_embeddings() {
// 	const prototypes = await queries.prototypes();
// 	for (let prototype of prototypes) {
// 		const description = await Effect.runPromise(prototype.description());

// 		// console.log(prototype.path, prototype.label, description)

// 		if (prototype.label) {
// 			embeddings_map.set(prototype.path, {
// 				label: prototype.label,
// 				label_embeddings: await pipe(prototype.label),
// 				description: description ? description : null,
// 				description_embeddings: description ? await pipe(description) : null,
// 			});
// 		}
// 	}

// 	// console.log(embeddings_map);
// }

// async function top_k_prototypes(query: string, k: number) {
// 	const query_embeddings = await pipe(query);

// 	const scores = new Map<string, number>();

// 	for (let [path, { label_embeddings, description_embeddings }] of embeddings_map) {
// 		const label_score = cos_sim(label_embeddings, query_embeddings);
// 		const description_score = description_embeddings ? cos_sim(description_embeddings, query_embeddings) : 0;

// 		scores.set(path, Math.max(label_score, description_score));
// 	}

// 	// console.log(scores);

// 	const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);

// 	return sorted.slice(0, k).map(([path, score]) => ({ path, score }));
// }

// update_current_prototypes_embeddings();

const distance = (a: number[], b: number[]) => Math.hypot(...Object.keys(a).map((k: any) => b[k] - a[k]));

// import { pipeline, cos_sim } from "@xenova/transformers";
// import { extraction_system_prompt } from "./prompts";
import { Effect } from "effect";
import { Ant } from "../Ant";
// Allocate a pipeline for sentiment-analysis
// let _pipe = await pipeline("feature-extraction", "Xenova/bge-small-en-v1.5");
// const pipe = async (text: string) => _pipe(text, { pooling: "mean", normalize: true }).then((x: any) => x.tolist()[0]);

const start_time = Date.now();

// let manchester_city = await pipe("manchester city");
// let manchester_united = await pipe("manchester united");

// let person = await pipe("person");
// let ceo = await pipe("ceo");
// let nvidia = await pipe("nvidia");

// let gpu = await pipe("gpu");

// let [manchester_city, manchester_united, person, ceo, nvidia, gpu, haaland, football_player] = await Promise.all([pipe("manchester city"), pipe("man city"), pipe("founder"), pipe("ceo"), pipe("nvidia"), pipe("gpu"), pipe("erling haaland"), pipe("football player")]);

// console.log("Time taken: ", Date.now() - start_time);

// I have an array of float, i want to know how many kb it takes

const kb = (a: number[]) => (a.length * 4) / 1024;

// console.log({
// 	manchester: cos_sim(manchester_city, manchester_united),
// 	person_ceo: cos_sim(person, ceo),
// 	person_nvidia: cos_sim(person, nvidia),
// 	gpu: cos_sim(nvidia, gpu),
// 	id: cos_sim(person, person),

// 	haaland: cos_sim(haaland, football_player),

// 	// instance: cos_sim(football_club, instance_of_football_club),
// 	// dec: cos_sim(football_club, manchester_city),
// 	// inst: cos_sim(instance_of_football_club, manchester_city),

// 	manchester_city_kb: kb(manchester_city),
// });

interface Answer {
	o: Object[]; // objects
	c: Class[]; // classes
	i: Inheritance[]; // inheritances
}

type ObjectIdentifier = string;
type ClassIdentifier = string;

interface Object {
	id: string; // identifier
	n: string; // name
	d: string; // description

	p: Property[]; // properties
	i: number; // the importance of that object in the query (1 to 10)
}

interface Class {
	id: string; // identifier
	n: string; // name
	d: string; // description
	i: number; // the importance of that class in the query (1 to 10)
}

interface Property {
	n: string; // name
	t: string; // type

	r?: ObjectIdentifier | ClassIdentifier; // reference
	v?: string | number | boolean; // value
	i: number; // the importance of that property in the query (1 to 10)
}

interface Inheritance {
	p: ClassIdentifier; // parent
	c: ObjectIdentifier | ClassIdentifier; // child
	t: "subclass" | "instance"; // type
	i: number; // the importance of that inheritance in the query (1 to 10)
}


export const extraction_system_prompt = `
System : You are an agent specialized in natural language processing. Analyze the user query syntactically and semantically. Identify objects, properties, classes, and relationships. 

Your answer should be a JSON object using the specified structure without additional explanations.
    
You should extract the data from the paragraph "Input".
    
Interface definitions:
    
interface Answer {{
    o: Object[]; // objects
    c: Class[]; // classes
    i: Inheritance[]; // inheritances
}}
    
type ObjectIdentifier = string;
type ClassIdentifier = string;
    
interface Object {{
    id: string; // identifier
    n: string; // name
    d: string; // description
    
    p: Property[]; // properties
	i: number // the importance of that object in the query (1 to 10)
}}
    
interface Class {{
    id: string; // identifier
    n: string; // name
    d: string; // description
	i: number // the importance of that class in the query (1 to 10)
}}
    
interface Property {{
    n: string; // name
    t: string; // type
    
    r?: ObjectIdentifier | ClassIdentifier; // reference
    v?: string | number | boolean; // value
	i: number // the importance of that property in the query (1 to 10)
}}
    
interface Inheritance {{
    p: ClassIdentifier; // parent
    c: ObjectIdentifier | ClassIdentifier; // child
    t: "subclass" | "instance"; // type
    i: number // the importance of that inheritance in the query (1 to 10)
}}

You can use the following existing classes and objects :

{history}

Important : Only use the data present in the input to generate the answer, do not use your own knowledge or perform additional research. If the query is formulated as a question, your role is not to provide an answer, it is to extract the data from the question.
`;
