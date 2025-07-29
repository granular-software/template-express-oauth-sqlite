"server-only";

import { ChatAnthropic } from "@langchain/anthropic";
import { CommaSeparatedListOutputParser, JsonOutputParser, StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
// import { search_feature_prototypes, search_models, search_submodels } from "./agent/queries/SearchModels";
// import { ReactNode } from "react";
// import { PatternUI } from "./PatternUI";

export enum IntentType {
	"Selection", // User wants to filter data based on criteria
	"Validation", // User wants to validate or check something
	"Aggregation", // User wants to aggregate or group data
	"Chart", // User wants to visualize data in a chart or graph
	"Hook", // User wants to trigger a specific action or event
	"Task", // User wants to perform a task or action
	"UpdateValue", // User wants to update a value or attribute
	"CreateObject", // User wants to create a new object or instance
}

export interface ClassBase {
	local_identifier: string;
	name: string;
	instruction: string;
	used_by: string[];
}

export interface ClassDraft extends ClassBase {
	kind: "draft";
	loading: boolean;
	reranking: boolean;

	finished: boolean;
}

export interface ClassAmbiguity extends ClassBase {
	kind: "ambiguity";

	options: {
		class: ClassFixed;
		score: number;
		label: string;
		description: string;
	}[];
}

export interface ClassFixed extends ClassBase {
	kind: "fixed";
	graph_path: string;
}

export interface ArgumentBase {
	identifier: string;
	intent: string;
	description: string;
	type: string;
	// attributes: Record<string, string | number | boolean>;
	attributes: Record<string, string>;
}

export interface ArgumentDraft extends ArgumentBase {
	kind: "draft";
	loading: boolean;
	reranking: boolean;
}

export interface ArgumentAmbiguity extends ArgumentBase {
	kind: "ambiguity";

	options: {
		argument: ArgumentFixed;
		score: number;
		label: string;
		description: string;
	}[];

	current_value_type: "string" | "number" | "boolean";
	current_value: string | number | boolean;
}

export interface ArgumentFixed extends ArgumentBase {
	kind: "fixed";
	graph_path: string;
}

export interface IntentBase {
	local_identifier: string;
	intent_type: IntentType;
	instruction: string;
	target: string;
	target_relevance: 0 | 1 | 2 | 3 | 4 | 5;
	// argument_drafts: ArgumentDraft[];
	used_by: string[];

	version: number;
}

export interface IntentDraft extends IntentBase {
	kind: "draft";
	loading: boolean;
	reranking: boolean;

	finished: boolean;
}

export interface IntentAmbiguity extends IntentBase {
	kind: "ambiguity";

	options: {
		intent: IntentFixed;
		score: number;
		label: string;
		description: string;
	}[];
}

export interface IntentFixed extends IntentBase {
	kind: "fixed";
	graph_path: string;

	// argument_ambiguous: ArgumentAmbiguity[];
	// argument_fixed: ArgumentFixed[];
}

export type ClassSum = {
	identifier: string;
	kind: "fixed" | "ambiguities" | "draft";
	options?: { path: string; score: number; label: string; description: string }[];
	loading: boolean;
	reranking: boolean;
}[];

export type IntentSum = {
	identifier: string;
	kind: "fixed" | "ambiguities" | "draft";
	options?: { path: string; score: number; label: string; description: string }[];
	// arguments: Record<string, ArgumentDraft | ArgumentAmbiguity | ArgumentFixed>;
	loading: boolean;
	reranking: boolean;
}[];

export type ArgumentSum = {
	identifier: string;
	kind: "fixed" | "ambiguities" | "draft";
	options?: { path: string; score: number; label: string; description: string }[];
	loading: boolean;
	reranking: boolean;
}[];

export interface SerializedPattern {
	query: string;

	classes_sum: ClassSum;
	intents_sum: IntentSum;
	arguments_sum: ArgumentSum;

	class_drafts: Record<string, ClassDraft>;
	intent_drafts: Record<string, IntentDraft>;
	argument_drafts: Record<string, ArgumentDraft>;

	class_ambiguities: Record<string, ClassAmbiguity>;
	intent_ambiguities: Record<string, IntentAmbiguity>;
	argument_ambiguities: Record<string, ArgumentAmbiguity>;

	class_fixed: Record<string, ClassFixed>;
	intent_fixed: Record<string, IntentFixed>;
	argument_fixed: Record<string, ArgumentFixed>;
}

export interface SerializedHistory {
	classes: ClassFixed[];
	intents: IntentFixed[];
	arguments: ArgumentFixed[];
}

export interface ParsedPattern {
	classes: ParsedClass[];
	intents: ParsedIntent[];
	// args: ParsedArgument[];
}

interface ParsedIntent {
	type: IntentType;
	instruction: string;
	identifier: string;
	target: string;
	target_relevance: 0 | 1 | 2 | 3 | 4 | 5;
	arguments: ParsedArgument[];

	r: number;
}

interface ParsedClass {
	identifier: string;
	type: string;
	name: string;
	attributes: ParsedClass[];

	r: number;
}

interface ParsedArgument {
	type: string;
	identifier: string;
	description: string;
	attributes: Record<string, string>;
}

export class History {
	constructor(serialized: SerializedHistory) {
		this.classes = new Map(Object.entries(serialized.classes).map(([key, value]) => [value.local_identifier, value]));
		this.intents = new Map(Object.entries(serialized.intents).map(([key, value]) => [value.local_identifier, value]));
		this.arguments = new Map(Object.entries(serialized.arguments).map(([key, value]) => [value.identifier, value]));
	}

	private classes: Map<string, ClassFixed>;
	private intents: Map<string, IntentFixed>;
	private arguments: Map<string, ArgumentFixed>;

	add_class(_class: ClassFixed) {
		this.classes.set(_class.local_identifier, _class);
	}

	add_intent(intent: IntentFixed) {
		this.intents.set(intent.local_identifier, intent);
	}

	add_dependency(target: string, source: string) {
		if (this.classes.has(target)) {
			this.classes.get(target)?.used_by.includes(source) || this.classes.get(target)?.used_by.push(source);
		} else if (this.intents.has(target)) {
			this.intents.get(target)?.used_by.includes(source) || this.intents.get(target)?.used_by.push(source);
		}

		return this;
	}

	search(identifier: string) {
		if (this.classes.has(identifier)) {
			return this.classes.get(identifier);
		} else if (this.intents.has(identifier)) {
			return this.intents.get(identifier);
		} else {
			return null;
		}
	}

	get() {
		return {
			classes: Object.values(Object.fromEntries(this.classes)),
			intents: Object.values(Object.fromEntries(this.intents)),
			arguments: Object.values(Object.fromEntries(this.arguments)),
		};
	}
}

export class Pattern {
	constructor(query: string, history: SerializedHistory) {
		this.query = query;

		this.history = new History(history);

		this.draft_classes = new Map();
		this.draft_intents = new Map();
		this.draft_arguments = new Map();

		this.ambiguity_classes = new Map();
		this.ambiguity_intents = new Map();
		this.ambiguity_arguments = new Map();

		this.classes = new Map();
		this.intents = new Map();
		this.arguments = new Map();
	}

	static load(serialized: SerializedPattern, history: SerializedHistory) {
		const pattern = new Pattern(serialized.query, history);

		pattern.draft_classes = new Map(Object.entries(serialized.class_drafts));
		pattern.draft_intents = new Map(Object.entries(serialized.intent_drafts));
		pattern.draft_arguments = new Map(Object.entries(serialized.argument_drafts));

		pattern.ambiguity_classes = new Map(Object.entries(serialized.class_ambiguities));
		pattern.ambiguity_intents = new Map(Object.entries(serialized.intent_ambiguities));
		pattern.ambiguity_arguments = new Map(Object.entries(serialized.argument_ambiguities));

		pattern.classes = new Map(Object.entries(serialized.class_fixed));
		pattern.intents = new Map(Object.entries(serialized.intent_fixed));
		pattern.arguments = new Map(Object.entries(serialized.argument_fixed));

		return pattern;
	}

	query: string;

	history: History;

	draft_classes: Map<string, ClassDraft>;
	draft_intents: Map<string, IntentDraft>;
	draft_arguments: Map<string, ArgumentDraft>;

	ambiguity_classes: Map<string, ClassAmbiguity>;
	ambiguity_intents: Map<string, IntentAmbiguity>;
	ambiguity_arguments: Map<string, ArgumentAmbiguity>;

	classes: Map<string, ClassFixed>;
	intents: Map<string, IntentFixed>;
	arguments: Map<string, ArgumentFixed>;

	update_with_parsed_data(data: ParsedPattern) {
		let parsed_classes = data.classes || [];
		let parsed_intents = data.intents || [];

		const new_classes = parsed_classes.filter((_class) => !this.classes.has(_class.identifier));
		const new_intents = parsed_intents.filter((intent) => !this.intents.has(intent.identifier));

		// Empty the current draft classes and intents

		this.draft_classes.clear();
		this.draft_intents.clear();

		this.draft_arguments.clear();

		// Replace the current classes and intents with the new ones (new_classes and new_intents that are not alreadyn ambiguous or fixed)

		new_classes
			.filter(
				// ignore the ones that are already ambiguous or fixed
				(_class) => !this.ambiguity_classes.has(_class.identifier) && !this.classes.has(_class.identifier),
			)
			.forEach((_class) => {
				// If not already in history, add the class to the draft classes

				// if (!this.history.search(_class.identifier)) {
				this.draft_classes.set(_class.identifier, {
					kind: "draft",
					local_identifier: _class.identifier,
					name: _class.name,
					instruction: _class.name,
					used_by: [],
					loading: false,
					reranking: false,

					finished: !!_class.r || false,
				});
				// }
			});

		new_intents
			.filter(
				// ignore the ones that are already ambiguous or fixed
				(intent) => !this.ambiguity_intents.has(intent.identifier) && !this.intents.has(intent.identifier),
			)
			.forEach((intent) => {
				// If not already in history, add the intent to the draft intents

				if (!this.history.search(intent.identifier)) {
					this.draft_intents.set(intent.identifier, {
						kind: "draft",
						local_identifier: intent.identifier,
						intent_type: intent.type,
						instruction: intent.instruction,
						target: intent.target,
						target_relevance: intent.target_relevance,
						// argument_drafts: intent.arguments?.map((arg) => ({ kind: "draft", loading: false, reranking: false, ...arg })),
						used_by: [],
						loading: false,
						reranking: false,

						finished: !!intent.r || false,
						version: 0,
					});
				}

				intent.arguments?.forEach((arg) => {
					// console.log("Set draft argument", arg.identifier, "to", intent.identifier);

					this.draft_arguments.set(arg.identifier, {
						kind: "draft",
						intent: intent.identifier,
						loading: false,
						reranking: false,
						...arg,
					});
				});
			});

		// console.log("Draft arguments: ", this.draft_arguments.size);

		// Based on the targets of the intents (that may target classes or other intents), update the values of "used_by" in the classes and intents of this pattern and of the history

		new_intents.forEach((intent) => {
			let target = intent.target;

			if (this.classes.has(target)) {
				this.classes.get(target)?.used_by.includes(intent.identifier) || this.classes.get(target)?.used_by.push(intent.identifier);
			} else if (this.intents.has(target)) {
				this.intents.get(target)?.used_by.includes(intent.identifier) || this.intents.get(target)?.used_by.push(intent.identifier);
			} else if (this.ambiguity_classes.has(target)) {
				this.ambiguity_classes.get(target)?.used_by.includes(intent.identifier) ||
					this.ambiguity_classes.get(target)?.used_by.push(intent.identifier);
			} else if (this.ambiguity_intents.has(target)) {
				this.ambiguity_intents.get(target)?.used_by.includes(intent.identifier) ||
					this.ambiguity_intents.get(target)?.used_by.push(intent.identifier);
			} else if (this.draft_classes.has(target)) {
				this.draft_classes.get(target)?.used_by.includes(intent.identifier) ||
					this.draft_classes.get(target)?.used_by.push(intent.identifier);
			} else if (this.draft_intents.has(target)) {
				this.draft_intents.get(target)?.used_by.includes(intent.identifier) ||
					this.draft_intents.get(target)?.used_by.push(intent.identifier);
			} else {
				this.history = this.history.add_dependency(target, intent.identifier);
			}
		});
	}

// 	async fetch_structured_data() {
// 		const draft_classes = [...this.draft_classes.values()].filter((cl) => cl.finished);

// 		console.log([...this.draft_classes.values()]);

// 		await Promise.all(
// 			(draft_classes || []).map(async (_class) => {
// 				// for (let _class of this.draft_classes.values()) {
// 				// mark the class as loading

// 				_class.loading = true;

// 				// ui.update(<PatternUI {...this.serialize()} start={new Date().getTime()} />);

// 				// const options = await search_models(_class.name);

// 				// console.log({ options });

// 				_class.loading = false;

// 				// ui.update(<PatternUI {...this.serialize()} start={new Date().getTime()} />);

// 				// If the class is already fixed, skip it

// 				if (this.history.search(_class.local_identifier)) {
// 					this.draft_classes.delete(_class.local_identifier);

// 					// continue;
// 					return;
// 				}

// 				_class.reranking = true;

// 				// ui.update(<PatternUI {...this.serialize()} start={new Date().getTime()} />);

// 				const reranked = await this.rerank(
// 					_class.name + " : " + _class.instruction,
// 					options.data.search_models?.map((m) => ({
// 						path: m.model.path,
// 						label: m.model.label,
// 						description: m.model.description,
// 						score: m.score,
// 					})),
// 				);

// 				console.log(_class.name, reranked.length);

// 				if (reranked.length === 1) {
// 					const fixed: ClassFixed = {
// 						kind: "fixed",
// 						local_identifier: _class.local_identifier,
// 						name: _class.name,
// 						instruction: _class.name,
// 						// graph_path: options.data.search_models[0].model.path,
// 						graph_path: reranked[0].path,
// 						used_by: _class.used_by,
// 					};

// 					this.classes.set(_class.local_identifier, fixed);

// 					this.draft_classes.delete(_class.local_identifier);

// 					this.history.add_class(fixed);
// 				} else if (reranked.length > 1) {
// 					const ambiguity: ClassAmbiguity = {
// 						kind: "ambiguity",
// 						local_identifier: _class.local_identifier,
// 						name: _class.name,
// 						instruction: _class.name,
// 						options: reranked?.map((o) => ({
// 							class: {
// 								kind: "fixed",
// 								local_identifier: _class.local_identifier,
// 								name: _class.name,
// 								instruction: _class.name,
// 								graph_path: o.path,
// 								used_by: _class.used_by,
// 							},
// 							score: o.score,
// 							label: o.label,
// 							description: o.description,
// 						})),
// 						used_by: _class.used_by,
// 					};

// 					this.ambiguity_classes.set(_class.local_identifier, ambiguity);

// 					this.draft_classes.delete(_class.local_identifier);
// 				} else {
// 					_class.loading = false;
// 					_class.reranking = false;
// 				}
// 				// }
// 			}),
// 		);

// 		// let draft_intents = [...this.draft_intents.values()];

// 		// while (this.draft_intents.size > 0) {

// 		let draft_intents = [...this.draft_intents.values()].filter((cl) => cl.finished);

// 		for (let intent of draft_intents) {
// 			// while (draft_intents.length > 0) {
// 			// draft_intents = [...this.draft_intents.values()];
// 			// const impacted_child_intents = new Set<IntentDraft>();

// 			// await Promise.all(
// 			// draft_intents.map(async (intent) => {
// 			const target = this.get_target(intent);

// 			if (this.history.search(intent.local_identifier)) {
// 				const history_intent = this.history.search(intent.local_identifier) as IntentFixed;

// 				this.draft_intents.delete(intent.local_identifier);

// 				// ui.update(<PatternUI {...this.serialize()} start={new Date().getTime()} />);
// 				continue;
// 			}

// 			if (target && target.kind === "fixed") {
// 				intent.loading = true;

// 				// ui.update(<PatternUI {...this.serialize()} start={new Date().getTime()} />);

// 				const options = await search_feature_prototypes(intent.intent_type + " : " + intent.instruction, target.graph_path);

// 				intent.loading = false;

// 				// ui.update(<PatternUI {...this.serialize()} start={new Date().getTime()} />);

// 				intent.reranking = true;

// 				// ui.update(<PatternUI {...this.serialize()} start={new Date().getTime()} />);

// 				const draft_arguments = Object.entries(this.arguments)
// 					.filter(([key, value]) => value.intent === intent.local_identifier)
// 					.map(([key, value]) => value) as ArgumentDraft[];

// 				console.log("Draft arguments for intent: ", intent.local_identifier, draft_arguments.length);

// 				const subquery = `${intent.intent_type} : ${intent.instruction} 
// 					${(draft_arguments || []).map((a) => ` - ${a.description} : ${JSON.stringify(a.attributes)}`).join("\n")}`.replace(/\t/g, "");

// 				const reranked = await this.rerank(
// 					subquery,
// 					options.data.model.feature_prototypes?.map((o) => ({
// 						path: o.model.path,
// 						label: o.model.label,
// 						description: o.model.description,
// 						score: 1,
// 					})),
// 					// options.data.model.search_feature_prototypes?.map((m) => ({
// 					// 	path: m.feature.model.path,
// 					// 	label: m.feature.model?.label,
// 					// 	description: m.feature.model?.description,
// 					// 	score: m.score,
// 					// })),
// 				);

// 				console.log(subquery, reranked.length);

// 				if (reranked.length === 1) {
// 					const fixed: IntentFixed = {
// 						kind: "fixed",
// 						local_identifier: intent.local_identifier,
// 						intent_type: intent.intent_type,
// 						instruction: intent.instruction,
// 						target: intent.target,
// 						target_relevance: intent.target_relevance,
// 						// argument_drafts: intent.argument_drafts,
// 						// argument_ambiguous: [],
// 						// argument_fixed: [],
// 						// arguments: intent.arguments,
// 						// graph_path: options.data.model.search_feature_prototypes[0].feature.model.path,
// 						graph_path: reranked[0].path,
// 						used_by: intent.used_by,
// 						version: 0,
// 					};

// 					this.intents.set(intent.local_identifier, fixed);

// 					// await this.fetch_structured_arguments(fixed, ui);

// 					this.history.add_intent(fixed);

// 					this.draft_intents.delete(intent.local_identifier);
// 				} else if (reranked.length > 1) {
// 					const ambiguity: IntentAmbiguity = {
// 						kind: "ambiguity",
// 						local_identifier: intent.local_identifier,
// 						intent_type: intent.intent_type,
// 						instruction: intent.instruction,
// 						target: intent.target,
// 						target_relevance: intent.target_relevance,
// 						// argument_drafts: intent.argument_drafts,
// 						options: reranked?.map((o) => ({
// 							intent: {
// 								kind: "fixed",
// 								local_identifier: intent.local_identifier,
// 								intent_type: intent.intent_type,
// 								instruction: intent.instruction,
// 								target: intent.target,
// 								target_relevance: intent.target_relevance,
// 								// arguments: intent.arguments,
// 								// argument_drafts: intent.argument_drafts,
// 								// argument_ambiguous: [],
// 								// argument_fixed: [],
// 								graph_path: o.path,
// 								used_by: intent.used_by,
// 								version: 0,
// 							},
// 							score: o.score,
// 							label: o.label,
// 							description: o.description,
// 						})),
// 						used_by: intent.used_by,
// 						version: 0,
// 					};

// 					this.ambiguity_intents.set(intent.local_identifier, ambiguity);

// 					// intent.used_by.map((child) => {
// 					// 	impacted_child_intents.add(this.draft_intents.get(child)!);
// 					// });

// 					this.draft_intents.delete(intent.local_identifier);
// 				}
// 			} else if (!target) {
// 				const target_from_history = this.history.search(intent.target);

// 				if (target_from_history) {
// 					const _found = await search_feature_prototypes(
// 						intent.intent_type + " : " + intent.instruction,
// 						(target_from_history as ClassFixed).graph_path,
// 					);

// 					const draft_arguments = Object.entries(this.draft_arguments)
// 						.filter(([_, value]) => value.intent === intent.local_identifier)
// 						.map(([_, value]) => value) as ArgumentDraft[];

// 					const subquery = `${intent.intent_type} : ${intent.instruction} 
// 					${(draft_arguments || []).map((a) => ` - ${a.description} : ${JSON.stringify(a.attributes)}`).join("\n")}`.replace(/\t/g, "");

// 					const reranked = await this.rerank(
// 						subquery,
// 						// _found.data.model.search_feature_prototypes?.map((o) => ({
// 						// 	path: o.feature.model.path,
// 						// 	label: o.feature.model?.label,
// 						// 	description: o.feature.model?.description,
// 						// 	score: o.score,
// 						// })),
// 						_found.data.model.feature_prototypes?.map((o) => ({
// 							path: o.model.path,
// 							label: o.model.label,
// 							description: o.model.description,
// 							score: 1,
// 						})),
// 					);

// 					if (reranked.length === 1) {
// 						const fixed: IntentFixed = {
// 							kind: "fixed",
// 							local_identifier: intent.local_identifier,
// 							intent_type: intent.intent_type,
// 							instruction: intent.instruction,
// 							target: intent.target,
// 							target_relevance: intent.target_relevance,
// 							// argument_drafts: intent.argument_drafts,
// 							// argument_ambiguous: [],
// 							// argument_fixed: [],
// 							// graph_path: _found.data.model.search_feature_prototypes[0].feature.model.path,
// 							graph_path: reranked[0].path,
// 							used_by: intent.used_by,
// 							version: 0,
// 						};

// 						this.intents.set(intent.local_identifier, fixed);

// 						this.history.add_intent(fixed);

// 						// await this.fetch_structured_arguments(fixed, ui);

// 						this.draft_intents.delete(intent.local_identifier);
// 					} else if (reranked.length > 1) {
// 						const ambiguity: IntentAmbiguity = {
// 							kind: "ambiguity",
// 							local_identifier: intent.local_identifier,
// 							intent_type: intent.intent_type,
// 							instruction: intent.instruction,
// 							target: intent.target,
// 							target_relevance: intent.target_relevance,
// 							// argument_drafts: intent.argument_drafts,
// 							options: reranked?.map((o) => ({
// 								intent: {
// 									kind: "fixed",
// 									local_identifier: intent.local_identifier,
// 									intent_type: intent.intent_type,
// 									instruction: intent.instruction,
// 									target: intent.target,
// 									target_relevance: intent.target_relevance,
// 									// arguments: intent.arguments,
// 									// argument_drafts: intent.argument_drafts,
// 									// argument_ambiguous: [],
// 									// argument_fixed: [],
// 									graph_path: o.path,
// 									used_by: intent.used_by,
// 									version: 0,
// 								},
// 								score: o.score,
// 								label: o?.label,
// 								description: o?.description,
// 							})),
// 							used_by: intent.used_by,
// 							version: 0,
// 						};

// 						this.ambiguity_intents.set(intent.local_identifier, ambiguity);

// 						// intent.used_by.map((child) => {
// 						// 	impacted_child_intents.add(this.draft_intents.get(child)!);
// 						// });

// 						this.draft_intents.delete(intent.local_identifier);
// 					} else {
// 						console.log("No options found for intent: ", intent.local_identifier, "(" + intent.target + ")");
// 					}
// 				} else {
// 					console.log("Target not found for intent: ", intent.local_identifier, "(" + intent.target + ")");

// 					intent.loading = false;
// 					intent.reranking = false;
// 				}
// 			}
// 			// }
// 			// }),
// 			// );

// 			// draft_intents = [...impacted_child_intents];
// 		}

// 		const fixed_intents = [...this.intents.values()];

// 		for (let intent of fixed_intents) {
// 			// const target = this.get_target(intent);

// 			const arguments_structured = await this.fetch_structured_arguments(intent);

// 			console.log("Structured arguments for intent: ", intent.local_identifier, arguments_structured, "found");

// 			if (arguments_structured) {
// 				const serialized = this.serialize();

// 				// console.log(JSON.stringify(this.serialize(), null, 4));
				
// 				// ui.update(<pre>{JSON.stringify(serialized.intent_fixed["GetOverdueInvoices"], null, 4)}</pre>);
// 				// ui.update(<PatternUI {...this.serialize()} start={42} />);
// 			}
// 		}
// 	}

// 	async fetch_structured_arguments(intent: IntentFixed) {
// 		console.log("Fetch structured arguments for intent: ", intent.local_identifier);
// 		// for (let intent of fixed_intents.values()) {
// 		const target = this.get_target(intent) as ClassFixed;

// 		if (!target) return;
// 		if (target.kind !== "fixed") return;

// 		let arguments_structured = 0;

// 		console.log("Draft argument size: ", this.draft_arguments.size);
// 		console.log("Fixed argument size: ", this.arguments.size);

// 		const draft_arguments = Array.from(this.draft_arguments)
// 			.map(([key, value]) => value)
// 			.filter((value) => value.intent === intent.local_identifier)
// 			.map((value) => value) as ArgumentDraft[];

// 		console.log("Draft arguments for intent: ", intent.local_identifier, draft_arguments.length);

// 		// console.log(Array.from(this.draft_arguments).map(([key, value]) => value));

// 		const that = this;

// 		await Promise.all(
// 			(draft_arguments || [])
// 				// .filter((arg) => !intent.argument_fixed.map((a) => a.identifier).includes(arg.identifier))
// 				.map(async (argument_draft) => {
// 					// argument_draft.loading = true;

// 					this.draft_arguments.set(argument_draft.identifier, {
// 						...argument_draft,
// 						loading: true,
// 					});

// 					// ui.update(<PatternUI {...that.serialize()} start={42} />);

// 					let [own_options, target_options] = await Promise.all([
// 						search_submodels(`${argument_draft.description} (${argument_draft.type})`, intent.graph_path),
// 						search_submodels(`${argument_draft.description} (${argument_draft.type})`, target.graph_path),
// 					]);

// 					let options = [
// 						...own_options.data.model.submodels.map((x) => ({
// 							model: {
// 								path: x.path,
// 								label: x.label,
// 								description: x.description,
// 							},
// 							on: "functor",
// 						})),

// 						...target_options.data.model.submodels.map((x) => ({
// 							model: {
// 								path: x.path,
// 								label: x.label,
// 								description: x.description,
// 							},
// 							on: "target",
// 						})),
// 					] as {
// 						model: { path: string; label: string; description: string };
// 						score: number;
// 						on: "functor" | "target";
// 					}[];

// 					this.draft_arguments.set(argument_draft.identifier, {
// 						...argument_draft,
// 						loading: false,
// 						reranking: true,
// 					});

// 					// ui.update(<PatternUI {...that.serialize()} start={42} />);

// 					const reranked = await this.rerank_arguments(
// 						`${argument_draft.description} (${argument_draft.type})`,
// 						argument_draft.attributes,
// 						{
// 							path: target.graph_path,
// 							label: target.name,
// 							description: target.name,
// 						},
// 						options.map((m) => ({
// 							path: m.model.path,
// 							label: m.model.label,
// 							description: m.model.description,
// 							score: m.score,
// 							on: m.on,
// 						})),
// 					);

// 					// console.log(JSON.stringify(reranked, null, 4));

// 					argument_draft.reranking = false;

// 					if (reranked.length === 1) {
// 						const fixed: ArgumentFixed = {
// 							kind: "fixed",
// 							intent: intent.local_identifier,
// 							description: argument_draft.description,
// 							identifier: argument_draft.identifier,
// 							type: argument_draft.type,
// 							attributes: argument_draft.attributes,
// 							graph_path: reranked[0].path,
// 						};

// 						// if (!intent.argument_fixed.map((a) => a.identifier).includes(fixed.identifier)) intent.argument_fixed.push(fixed);

// 						// intent.argument_drafts = intent.argument_drafts.filter((a) => a.identifier !== argument_draft.identifier);

// 						this.arguments.set(argument_draft.identifier, fixed);

// 						this.draft_arguments.delete(argument_draft.identifier);

// 						arguments_structured++;
// 					} else if (reranked.length > 1) {
// 						const ambiguity: ArgumentAmbiguity = {
// 							kind: "ambiguity",
// 							intent: intent.local_identifier,
// 							identifier: argument_draft.identifier,
// 							description: argument_draft.description,
// 							type: argument_draft.type,
// 							attributes: argument_draft.attributes,
// 							options: reranked.map((o) => ({
// 								argument: {
// 									kind: "fixed",
// 									intent: intent.local_identifier,
// 									identifier: argument_draft.identifier,
// 									description: argument_draft.description,
// 									type: argument_draft.type,
// 									attributes: argument_draft.attributes,
// 									graph_path: o.path,
// 								},
// 								score: o.score,
// 								label: o.label,
// 								description: o.description,
// 							})),
// 							current_value_type: "string",
// 							current_value: "",
// 						};

// 						// intent.argument_ambiguous.push(ambiguity);

// 						// intent.argument_drafts = intent.argument_drafts.filter((a) => a.identifier !== argument_draft.identifier);

// 						this.ambiguity_arguments.set(argument_draft.identifier, ambiguity);

// 						this.draft_arguments.delete(argument_draft.identifier);

// 						arguments_structured++;
// 					} else {
// 						console.log("No options found for argument: ", argument_draft.description);
// 					}

// 					// ui.update(<PatternUI {...that.serialize()} start={42} />);

// 					intent.version++;
// 				}),
// 		);

// 		return arguments_structured;
// 		// }
// 		// }
// 	}

// 	async rerank(
// 		subquery: string,
// 		options: {
// 			path: string;
// 			label: string;
// 			description: string;
// 			score: number;
// 		}[],
// 	) {
// 		const model = new ChatAnthropic({
// 			apiKey: process.env.ANTHROPIC_API_KEY,
// 			model: "claude-3-haiku-20240307",
// 			temperature: 0,
// 		});

// 		const parser = new CommaSeparatedListOutputParser();
// 		if (!options.length) return [];

// 		const prompt = ChatPromptTemplate.fromMessages([
// 			[
// 				"human",
// 				`Your task is to evaluate the relevance of a list of tools for directly satisfying a given query related to data analysis or visualization. For each tool, assign a relevance score based on the following scale:
    
//     0-1: The tool is not directly relevant to the query or is unlikely to provide a useful solution compared to other options.
//     2-3: The tool could potentially be used to address the query, but it may not be the most efficient or straightforward approach compared to other options.
//     4: The tool is very likely to directly satisfy the query and provide valuable insights, but there might be other equally suitable options.
//     5: The tool is the clear winner and the most obvious choice for directly satisfying the query.
                
// 	Ideally, there should be at most one item rated 5.
//     Consider the query type, the specific information requested, and the tool descriptions carefully when assigning scores. Focus on the relative relevance of each tool compared to the others for the given query.
    
//     Query: {query} ({query_type})
//                 `,
// 			],
// 			[
// 				"human",
// 				`Tools :
//     {options}
    
//     Examples:
//     1. If the query is "average customer rating for each product" with options "group_by", "bar_chart", and "filter", consider the following:
//        - "group_by" would likely be the clear winner (score: 5) as it allows grouping data by product and calculating the average rating.
//        - "bar_chart" could be somewhat relevant (score: 2) for visualizing the average ratings by product.
//        - "filter" is not directly relevant (score: 0) as the query does not involve filtering data based on specific conditions.
    
//     2. If the query is "number of orders placed by each customer" with options "group_by", "count", and "line_chart", consider the following:
//        - "group_by" and "count" could both be strong candidates (score: 4) for grouping data by customer and counting the number of orders.
//        - "line_chart" is not directly relevant (score: 1) as it is not the most appropriate visualization for this query.
    
	
// 	Only take into account the items provided to you in the list. Do not consider any other tools or options.
//     Provide your response as a comma-separated list of tool paths and their assigned relevance scores, like this: \`id1:score1, id2:score2, id3:score3\`. Do not include any additional explanations or text in your response.`,
// 			],
// 		]);
// 		const chain = prompt.pipe(model).pipe(parser);

// 		const response = await chain.invoke({
// 			query: subquery,
// 			query_type: "Selection",
// 			options: options
// 				.map((o, i) => `- ${o.path} (distance: ${o.score.toFixed(3)})\nLabel: ${o.label}\nDescription: ${o.description}`)
// 				.join("\n\n"),
// 			format_instructions: parser.getFormatInstructions(),
// 		});

// 		const pre_answer = response?.map((r) => ({
// 			path: r.split(":")[0],
// 			label: options.find((o) => o.path === r.split(":")[0])!.label,
// 			description: options.find((o) => o.path === r.split(":")[0])!.description,
// 			score: parseInt(r.split(":")[1]) as 0 | 1 | 2 | 3 | 4 | 5,
// 		}));

// 		if (pre_answer.find((a) => a.score === 5)) {
// 			return pre_answer.filter((a) => a.score === 5);
// 		}

// 		return pre_answer.filter((r) => r.score > 1);
// 	}

// 	async rerank_arguments(
// 		subquery: string,
// 		attributes: Record<string, string>,
// 		object: {
// 			path: string;
// 			label: string;
// 			description: string;
// 		},
// 		options: {
// 			path: string;
// 			on: "functor" | "target";
// 			label: string;
// 			description: string;
// 			score: number;
// 		}[],
// 	) {
// 		const model = new ChatAnthropic({
// 			apiKey: process.env.ANTHROPIC_API_KEY,
// 			model: "claude-3-haiku-20240307",
// 			// model: "claude-3-sonnet-20240229",
// 			temperature: 0,
// 			// verbose: true,
// 		});

// 		const parser = new CommaSeparatedListOutputParser();
// 		if (!options.length) return [];

// 		const prompt = ChatPromptTemplate.fromMessages([
// 			// 		[
// 			// 			"human",
// 			// 			`Your task is to evaluate the relevance of a list of properties of a given object to satisfy given query related to data analysis or visualization. For each property, assign a relevance score based on the following scale:

// 			// Ideally, there should be at most one item rated 5.
// 			// Consider the query type, the specific information requested, and the tool descriptions carefully when assigning scores. Focus on the relative relevance of each tool compared to the others for the given query.

// 			// Query: {query} ({query_type})
// 			//             `,
// 			// 		],
// 			// 		[
// 			// 			"human",
// 			// 			`Tools :
// 			// {options}

// 			// Provide your response as a comma-separated list of tool paths and their assigned relevance scores, like this: \`id1:score1, id2:score2, id3:score3\`. Do not include any additional explanations or text in your response.`,
// 			// 		],

// 			[
// 				"human",
// 				`You are an AI assistant that scores the similarity of object properties based on a user query.
// Inputs:
				
// - Description of an object
// - List of the object's properties, each with a short description
// - User query (a few words) representing the property the user is searching for
				
// Output:
// For each property, assign a similarity score from 0 to 5:
// 0-1: Property is totally different from the query
// 2-3: Property is somewhat close
// 4: Property is highly similar to the query
// 5: Property is a perfect match (assign at most one 5)
// If there is no clear winner, you may assign multiple properties a 3 or 4, indicating disambiguation is needed. The goal is to identify the most similar properties based on the query and similarity scores.`,
// 			],

// 			[
// 				"human",
// 				`
// 				Object description: {object}

// 				User query: {query}
				
// 				Properties :
// {options}

// {examples}

// Only take into account the items provided to you in the list. Do not consider any other properties or options.
// If no property seems like a good match, set "should_be_created" to true for that property to recommend the user to create it. Otherwise, "should_be_created" should be false.
// If a property seems like a very good match, above the other ones, do not hesitate to give it a 5.
// Provide your answer in JSON, following that TS type. Do not provide any additional explanations or text in your response.

// {type}

// `,

// 				// Provide your response as a comma-separated list of property paths and their assigned relevance scores, like this: \`id1:score1, id2:score2, id3:score3\`. Do not include any additional explanations or text in your response.`,
// 			],
// 		]);

// 		const chain = prompt.pipe(model).pipe(new JsonOutputParser());

// 		const has_attributes = Object.keys(attributes || [])?.length > 0;

// 		const _response = await chain.invoke({
// 			query:
// 				subquery +
// 				" " +
// 				(has_attributes ? "(" : "") +
// 				Object.entries(attributes || {})
// 					.map(([k, v]) => `${k}: ${v}`)
// 					.join(" ") +
// 				(has_attributes ? ")" : ""),
// 			query_type: "Selection",
// 			object: `${object.description} (${object.label})`,
// 			options: options.map((o, i) => `- ${o.path.split(":")[1]}\nLabel: ${o.label}\nDescription: ${o.description}`).join("\n\n"),
// 			format_instructions: parser.getFormatInstructions(),
// 			type: `interface Answer {
// 	should_be_created: boolean;
// 	props: {
// 		[property_path: string]: 0 | 1 | 2 | 3 | 4 | 5 // the similarity score
// 	}
// }`,
// 			examples: "",
// 			_examples: `Examples:
// 1. If the query is "average customer rating for each product" with properties "average_rating", "customer_id", and "product_id", consider the following:
//    - "average_rating" would likely be the clear winner (score: 5) as it directly corresponds to the query.
//    - "customer_id" could be somewhat relevant (score: 2) for identifying customers but may not directly address the query.
//    - "product_id" is not directly relevant (score: 0) as it does not provide information about customer ratings.

// 2. If the query is "average order value for each customer" with properties "order_value", "customer_id", and "product_id", consider the following:
//    - "order_value" and "customer_id" could both be strong candidates (score: 4) for calculating the average order value for each customer.
//    - "product_id" is not directly relevant (score: 0) as it does not provide information about order values.`,
// 		});

// 		// return [] as {
// 		// 	path: string;
// 		// 	label: string;
// 		// 	description: string;
// 		// 	score: number;
// 		// }[];

// 		const response = _response as {
// 			should_be_created: boolean;
// 			props: {
// 				[property_path: string]: 0 | 1 | 2 | 3 | 4 | 5;
// 			};
// 		};

// 		const pre_answer = Object.entries(response.props)
// 			// .filter(([h]) => h !== "should_be_created")
// 			.map(([path, score]) => ({
// 				path,
// 				label: options.find((o) => o.path.split(":")[1] === path)!.label,
// 				description: options.find((o) => o.path.split(":")[1] === path)!.description,
// 				score,
// 				on: options.find((o) => o.path.split(":")[1] === path)!.on,
// 			}))
// 			.filter((r) => r.path);

// 		if (pre_answer.find((a) => a.score === 5)) {
// 			return pre_answer.filter((a) => a.score === 5);
// 		}

// 		if (pre_answer.find((a) => a.score === 4)) {
// 			return pre_answer.filter((a) => a.score === 4);
// 		}

// 		return pre_answer.filter((r) => r.score > 1);

// 		// const pre_answer = response.map((r) => ({
// 		// 	path: r.split(":")[0],
// 		// 	label: options.find((o) => o.path === r.split(":")[0])!.label,
// 		// 	description: options.find((o) => o.path === r.split(":")[0])!.description,
// 		// 	score: parseInt(r.split(":")[1]) as 0 | 1 | 2 | 3 | 4 | 5,
// 		// }));

// 		// if (pre_answer.find((a) => a.score === 5)) {
// 		// 	return pre_answer.filter((a) => a.score === 5);
// 		// }

// 		// return pre_answer.filter((r) => r.score > 1);
// 	}

// 	get_target(intent: IntentDraft | IntentAmbiguity | IntentFixed) {
// 		if (this.classes.has(intent.target)) {
// 			return this.classes.get(intent.target) || null;
// 		} else if (this.intents.has(intent.target)) {
// 			return this.intents.get(intent.target) || null;
// 		} else if (this.ambiguity_classes.has(intent.target)) {
// 			return this.ambiguity_classes.get(intent.target) || null;
// 		} else if (this.ambiguity_intents.has(intent.target)) {
// 			return this.ambiguity_intents.get(intent.target) || null;
// 		} else if (this.draft_classes.has(intent.target)) {
// 			return this.draft_classes.get(intent.target) || null;
// 		} else if (this.draft_intents.has(intent.target)) {
// 			return this.draft_intents.get(intent.target) || null;
// 		} else {
// 			return this.history.search(intent.target) || null;
// 		}
// 	}

// 	solve(kind: "intent" | "class", identifier: string, choice: string) {
// 		if (kind === "class") {
// 			const _class = this.ambiguity_classes.get(identifier);

// 			if (_class) {
// 				const fixed = _class.options.find((o) => o.class.graph_path === choice);

// 				if (fixed) {
// 					this.classes.set(identifier, fixed.class);
// 					this.ambiguity_classes.delete(identifier);

// 					this.history.add_class(fixed.class);
// 				}
// 			}
// 		} else {
// 			const intent = this.ambiguity_intents.get(identifier);

// 			if (intent) {
// 				const fixed = intent.options.find((o) => o.intent.graph_path === choice);

// 				if (fixed) {
// 					this.intents.set(identifier, fixed.intent);
// 					this.ambiguity_intents.delete(identifier);

// 					this.history.add_intent(fixed.intent);
// 				}
// 			}
// 		}
// 	}

	serialize(): SerializedPattern {
		return {
			query: this.query,

			classes_sum: [...this.draft_classes.keys(), ...this.ambiguity_classes.keys(), ...this.classes.keys()].map((identifier) => ({
				identifier,
				kind: this.draft_classes.has(identifier) ? "draft" : this.ambiguity_classes.has(identifier) ? "ambiguities" : "fixed",
				options: this.ambiguity_classes.has(identifier)
					? this.ambiguity_classes.get(identifier)?.options.map((o) => ({
							path: o.class.graph_path,
							score: o.score,
							label: o.label,
							description: o.description,
						}))
					: undefined,
				loading: this.draft_classes.has(identifier) ? this.draft_classes.get(identifier)?.loading || false : false,
				reranking: this.draft_classes.has(identifier) ? this.draft_classes.get(identifier)?.loading || false : false,
			})),

			intents_sum: [...this.draft_intents.keys(), ...this.ambiguity_intents.keys(), ...this.intents.keys()].map((identifier) => ({
				identifier,
				kind: this.draft_intents.has(identifier) ? "draft" : this.ambiguity_intents.has(identifier) ? "ambiguities" : "fixed",
				options: this.ambiguity_intents.has(identifier)
					? this.ambiguity_intents.get(identifier)?.options.map((o) => ({
							path: o.intent.graph_path,
							score: o.score,
							label: o.label,
							description: o.description,
						}))
					: undefined,

				// arguments: [
				// 	...(this.intents.get(identifier)?.argument_drafts || []),
				// 	...(this.intents.get(identifier)?.argument_ambiguous || []),
				// 	...(this.intents.get(identifier)?.argument_fixed || []),
				// ].reduce(
				// 	(acc, arg) => {
				// 		acc[arg.kind] = arg;
				// 		return acc;
				// 	},
				// 	{} as Record<string, ArgumentDraft | ArgumentAmbiguity | ArgumentFixed>,
				// ),

				loading: this.draft_intents.has(identifier) ? this.draft_intents.get(identifier)?.loading || false : false,
				reranking: this.draft_intents.has(identifier) ? this.draft_intents.get(identifier)?.reranking || false : false,
			})),

			arguments_sum: [...this.draft_arguments.keys(), ...this.ambiguity_arguments.keys(), ...this.arguments.keys()].map((identifier) => ({
				identifier,
				kind: this.draft_arguments.has(identifier) ? "draft" : this.ambiguity_arguments.has(identifier) ? "ambiguities" : "fixed",
				options: this.ambiguity_arguments.has(identifier)
					? this.ambiguity_arguments.get(identifier)?.options.map((o) => ({
							path: o.argument.graph_path,
							score: o.score,
							label: o.label,
							description: o.description,
						}))
					: undefined,
				loading: this.draft_arguments.has(identifier) ? this.draft_arguments.get(identifier)?.loading || false : false,
				reranking: this.draft_arguments.has(identifier) ? this.draft_arguments.get(identifier)?.reranking || false : false,
			})),

			class_drafts: Object.fromEntries(this.draft_classes),
			intent_drafts: Object.fromEntries(this.draft_intents),
			argument_drafts: Object.fromEntries(this.draft_arguments),

			class_ambiguities: Object.fromEntries(this.ambiguity_classes),
			intent_ambiguities: Object.fromEntries(this.ambiguity_intents),
			argument_ambiguities: Object.fromEntries(this.ambiguity_arguments),

			class_fixed: Object.fromEntries(this.classes),
			intent_fixed: Object.fromEntries(this.intents),
			argument_fixed: Object.fromEntries(this.arguments),
		};
	}

	get_history() {
		return this.history.get();
	}
}
