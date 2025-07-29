import EffectsStream from "../effects_stream";
import Os from "../os";
import OpenAI from "openai";
import { encoding_for_model } from "tiktoken";
import type { TiktokenModel } from "tiktoken";
import { now } from "lodash";
import { createOpenAIClient, getModelName } from "../config/modelConfig";
import type { AliasesDictionary, SerializedViewWithAlias, RankedOption, TriggerableAction } from "@joshu/os-types";
import type Agent from ".";
import { AbstractAgent } from "./abstract_agent";

export default class ToolsSelector {
	// private os: Os;
	// private effectsStream: EffectsStream;
	private model: string = getModelName();
	public agent: AbstractAgent<any>;

	constructor(agent: AbstractAgent<any>) {
		this.agent = agent;
		// this.effectsStream = os.effectsStream;
	}

	async select_tools() {
		console.log("SELECT TOOLS");

		const prompt = `You are Joshu, a helpful AI agent navigating a virtual computer to fulfill user demands.

You are part of an agent loop where each component has a specific role. Your job is to select the next action to take.

You are working with a virtual computer system that has a desktop, apps, and objects. At any time, you have "opened views" (similar to windows in an OS). For each view, you can:
1. Navigate to other views (like clicking a link)
2. Trigger actions (like filling a form or performing a POST query)

For each view, you are provided with:
- A description of what you're seeing
- Links to other views you can navigate to
- Actions you can trigger

Each link or action has a unique token identifier called an "alias". For example:
- Action: Delete user in CRM (Alias: 3)

YOUR TASK:
Return ONLY the set of tokens/aliases that represent the best next action(s) to take (either navigating to a view or triggering an action) to fulfill the next unfinished subtask and advance toward resolving the user's goal.

You have access to:
1. Events Stream: Complete history of all previous actions by the user, your colleagues, and yourself
2. Opened Views: All currently open windows in the OS, which can be used as data sources or to access other views/actions
3. Task Plan: A breakdown of the user's goal into tasks and subtasks. Your primary objective is to complete ALL tasks in this plan. Focus on the first incomplete task, but keep the entire plan in mind.

IMPORTANT: All links and actions listed in the views are AVAILABLE OPTIONS that you CAN USE RIGHT NOW. They are not a history of past actions. If an action or link seems like the best way to advance toward the goal, you should select it.

IMPORTANT: Only close a window when you are sure that it is no longer needed. If a window contains information that you will need in the future, keep it open. If a window contains what the user asked for in their query, NEVER close it.

Analyze the current state and select the single most appropriate next action to progress toward completing all tasks in the plan.`;

		// const views_in_memory = await Promise.all(this.agent.doc.windows.map(async (window) => await window.view));

		const windows_open = this.agent.doc.windows;

		console.log("VIEWS IN MEMORY", windows_open);

		// Create aliases for all links and actions in the views
		const aliasesDict: AliasesDictionary = new Map();
		const serializedViewsWithAlias: SerializedViewWithAlias[] = [];

		// Get the tokenizer for GPT-4 - NOTE: We are not using it for alias generation anymore
		// const encoder = encoding_for_model('gpt-4'); // Keep if needed elsewhere, but not for aliases

		let aliasCounter = 0;

		// Process each view to assign aliases to links and actions
		for (const window of windows_open) {
			const viewWithAlias: SerializedViewWithAlias = {
				...window.view,
				clickable_links: [],
				actions: [],
				tabs: [],
				components: [],
				window_id: window.id,
				children_keys: ["tabs", "components"],
			};

			// Process links and actions for the main view
			// Pass undefined for encoder as we now use string counters
			aliasCounter = this.processLinksAndActions(window.view, viewWithAlias, aliasesDict, undefined, aliasCounter);

			// Process tabs if they exist
			// if ((view).tabs && view.tabs.length > 0) {
			// 	viewWithAlias.tabs = this.processRecursiveViews(view.tabs, aliasesDict, undefined, aliasCounter);
			// }

			// Process components if they exist
			// if (window.view.components && window.view.components.length > 0) {
			// 	// Pass undefined for encoder
			// 	const { newCounter, processedComponents } = this.processRecursiveViewsWithCounter(window.view.components, aliasesDict, undefined, aliasCounter);
			// 	viewWithAlias.components = processedComponents;
			// 	aliasCounter = newCounter; // Update the counter with the new value
			// }

			if (viewWithAlias.children_keys.includes("components") && viewWithAlias.components && viewWithAlias.components.length > 0) {
				const { newCounter, processedComponents } = this.processRecursiveViewsWithCounter(viewWithAlias.components, aliasesDict, undefined, aliasCounter);
				viewWithAlias.components = processedComponents;
				aliasCounter = newCounter; // Update the counter with the new value
			}
			
			

			console.log("GENERATED VIEW WITH ALIAS", JSON.stringify(viewWithAlias, null, 2));

			serializedViewsWithAlias.push(viewWithAlias);
		}

		// --- Add "Close Window" actions for each view ---
		for (const window of windows_open) {
			// Skip the desktop view - it shouldn't be closable
			if (window.view.type === "desktop") {
				continue;
			}

			const closeWindowAlias = String(aliasCounter++);
			const closeWindowAction: TriggerableAction & { alias: string } = {
				label: `Close "${window.view.name}" window`,
				description: `Close this window and remove it from the screen.`,
				alias: closeWindowAlias,
				fields: [],
				output_type: { type: "void" },

				action_path: "/",
				app: "os",
				router_path: "/",
			};

			// console.log('CLOSE WINDOW ACTION', closeWindowAction);

			// Find the serialized view for this view
			const viewWithAlias = serializedViewsWithAlias.find((v) => v.window_id === window.id);

			// console.log('VIEW WITH ALIAS', viewWithAlias);

			if (viewWithAlias) {
				// Add to the view's actions
				viewWithAlias.actions.push(closeWindowAction);

				// Add to aliases dictionary
				aliasesDict.set(closeWindowAlias, {
					type: "close_window",
					alias: closeWindowAlias,
					window_id: window.id,
					serialized_view: viewWithAlias,
				});
			}
		}
		// --- End Add "Close Window" actions for each view ---

		console.log("ALL VIEWS IN MEMORY 34", JSON.stringify(serializedViewsWithAlias, null, 2));

		// --- Add "Do nothing" action ---
		let doNothingAlias: string | null = null;
		if (serializedViewsWithAlias.length > 0) {
			// Only add if there are views
			doNothingAlias = String(aliasCounter++);
			const doNothingAction: TriggerableAction & { alias: string } = {
				label: "Do nothing / Stay idle",
				description: "Choose this if no other action seems appropriate or necessary right now.",
				alias: doNothingAlias,
				fields: [],

				action_path: "/",
				app: "os",
				output_type: { type: "void" },
				router_path: "/",
			} as TriggerableAction & { alias: string };
			// Add to the first view's actions
			const firstView = serializedViewsWithAlias[0]!;
			firstView.actions.push(doNothingAction);
			// Add to aliases dictionary
			aliasesDict.set(doNothingAlias, {
				type: "idle",
				alias: doNothingAlias,
				// serialized_view: firstView,
			});
		}
		// --- End Add "Do nothing" action ---

		// Format views as JSON for the prompt
		let formattedViews = this.formatViewsAsJSON(serializedViewsWithAlias);

		// Prepare the context for the LLM
		const events_stream = this.agent.logs.get_stream();
		// const execution_plan = this.agent.execution_plan;
		// // Format the execution plan for the prompt
		// const formatted_execution_plan =
		// 	`Task Plan\n\n` +
		// 	execution_plan.tasks
		// 		.map((task, i: number) => {
		// 			// const outcomes =
		// 			// 	task.outcomes && task.outcomes.length > 0
		// 			// 		? `\n    Outcomes: ${task.outcomes
		// 			// 				.map((outcome) => `${outcome.name}: ${outcome.type}${outcome.is_list ? ' (list)' : ''}`)
		// 			// 				.join(', ')}`
		// 			// 		: '';
		// 			const prerequisites = task.prerequisites && task.prerequisites.length > 0 ? `\n    Prerequisites: ${task.prerequisites.map((prerequisite) => `${prerequisite.name}: ${prerequisite.description}`).join(", ")}` : "";
		// 			const subtasks =
		// 				task.subtasks && task.subtasks.length > 0
		// 					? "\n" +
		// 						task.subtasks
		// 							.map((subtask, j) => {
		// 								// const subtaskOutcomes =
		// 								// 	subtask.outcomes && subtask.outcomes.length > 0
		// 								// 		? `\n        Outcomes: ${subtask.outcomes
		// 								// 				.map((outcome) => `${outcome.name}: ${outcome.type}${outcome.is_list ? ' (list)' : ''}`)
		// 								// 				.join(', ')}`
		// 								// 		: '';
		// 								const subtaskPrerequisites = subtask.prerequisites && subtask.prerequisites.length > 0 ? `\n        Prerequisites: ${subtask.prerequisites.map((prerequisite) => `${prerequisite.name}: ${prerequisite.description}`).join(", ")}` : "";
		// 								return `    Subtask ${i + 1}.${j + 1}: ${subtask.title} (Status: ${subtask.is_done ? "Completed" : "Pending"})${subtaskPrerequisites}`;
		// 							})
		// 							.join("\n")
		// 					: "";

		// 			return `Task ${i + 1}: ${task.title} (Status: ${task.is_done ? "Completed" : "Pending"})${prerequisites}${subtasks}`;
		// 		})
		// 		.join("\n\n");

		// Format the events stream for the prompt
		const formatted_events = events_stream
			.map((event) => {
				return `[${event.date.toString()}] ${event.type.toUpperCase()} - ${event.application || "System"}: ${typeof event.content === "string" ? event.content : JSON.stringify(event.content)}`;
			})
			.join("\n");

		// Construct the full prompt with all context
		const full_prompt = `${prompt}

<events_stream>
${formatted_events}
</events_stream>

<currently_opened_views>
${formattedViews}
</currently_opened_views>

The views are structured in JSON format. Each view has:
- A name and description
- Links to other views (each with an alias if not already open)
- Actions that can be triggered (each with an alias)
- Possibly nested components or tabs (which are also views with their own links and actions)

IMPORTANT: All links and actions shown are AVAILABLE OPTIONS you can select right now. They represent operations you CAN perform, not a history of what has been done.

IMPORTANT: Your goal is to complete ALL tasks in the task plan. Select the action that will make the most progress toward this goal.

Based on the above information, return the aliases of the next action(s) or link(s) that might be relevant to explore, in decreasing order of relevance:

IMPORTANT: You should not open a link to a view that is already opened.

IMPORTANT: Return only the aliases, no other text. Separate the aliases with the pipe character "|", like this: 1|2|3
`;

		console.log("+++++++++++++++++ FULL PROMPT +++++++++++++++++");
		console.log(full_prompt);
		console.log("+++++++++++++++++ END OF PROMPT +++++++++++++++++");

		this.agent.effect.thought("Analyzing available tools and selecting the most appropriate next action...");

		try {
			// Make the API call to OpenAI with logprobs
			const openai = createOpenAIClient();

			// Get the encoding for the current model
			const enc = encoding_for_model("chatgpt-4o-latest");

			// Count tokens for system message and prompt
			const systemMessage = "You are a helpful assistant, expert at selecting the most appropriate next action to run or link to click.";
			const inputTokens = enc.encode(systemMessage).length + enc.encode(full_prompt).length;

			const response = await openai.chat.completions.create({
				model: this.model,
				messages: [
					{ role: "system", content: systemMessage },
					{ role: "user", content: full_prompt },
				],
				temperature: 0,
				max_tokens: 16,
				logprobs: true,
				top_logprobs: 10,
			});

			// Count output tokens from the response content
			const outputContent = response.choices[0]?.message?.content || "";
			const outputTokens = enc.encode(outputContent).length;

			// Free the encoder to prevent memory leaks
			enc.free();

			// console.log("AMOUNT OF INPUT TOKENS (TS)", inputTokens);

			// Update token usage with accurate counts
			this.agent.record_token_usage(inputTokens, outputTokens, this.model);

			// Extract and analyze logprobs to get the most likely options
			const logprobs = (response.choices[0]?.logprobs?.content?.[0]?.top_logprobs ?? []) as Array<{ token: string; logprob: number }>;

			// console.log('SERIALIZED VIEWS', JSON.stringify(serializedViewsWithAlias, null, 2));

			// console.log(JSON.stringify(logprobs, null, 2));

			// Extract the tokens from the logprobs
			const tokens = logprobs.map((lp: any) => {
				// Extract the token from the logprob
				let token = lp.token.trim();

				// Remove quotes if present
				if (token.startsWith('"') && token.endsWith('"')) {
					token = token.slice(1, -1);
				}

				// Remove any non-alphanumeric characters
				token = token.replace(/[^a-zA-Z0-9_-]/g, "");

				return {
					token,
					score: Math.exp(lp.logprob),
				};
			});

			// Filter out empty tokens
			const validTokens = tokens.filter((t: any) => t.token.length > 0);

			// console.log(validTokens);

			// Find the corresponding actions or links for each token
			let rankedOptions: RankedOption[] = [];

			for (const tokenObj of validTokens) {
				const { token, score } = tokenObj;

				// Check if the token is a valid action or link in any of the views
				const findMatchesRecursively = (views: SerializedViewWithAlias[]) => {
					// console.log('FIND MATCHES RECURSIVELY IN', JSON.stringify(views, null, 2));

					for (const view of views) {
						// Check actions
						for (const action of view.actions) {
							if (action.alias === token) {
								const aliasEntry = aliasesDict.get(token);
								console.log("ACTION FOUND", action, aliasEntry);
								const viewToClose = aliasEntry?.type === "close_window" ? aliasEntry.window_id : null;

								if (aliasEntry?.type === "close_window") {
									rankedOptions.push({
										token,
										type: "close_window",
										description: action.description,
										name: action.label,
										score,
										serialized_view: view,
										window_id: viewToClose!,
									});
								}

								if (aliasEntry?.type === "action") {
									rankedOptions.push({
										token,
										type: "action",
										description: action.description,
										name: action.label,
										score,
										serialized_view: view,
										window_id: view.window_id,
									});
								}
							}
						}

						// Check links
						for (const link of view.clickable_links) {
							if (link.alias === token) {
								console.log("LINK FOUND", link);
								rankedOptions.push({
									token,
									type: "click_link",
									description: link.description,
									name: link.name,
									score,
									serialized_view: view,
									window_id: view.window_id,
									target_path: link.router_path,
								});
							}
						}

						const children_keys = view.children_keys;

						// if (children_keys.includes("components") && view.components && view.components.length > 0) {
						// 	findMatchesRecursively(view.components);
						// }

						// if (children_keys.includes("tabs") && view.tabs && view.tabs.length > 0) {
						// 	findMatchesRecursively(view.tabs);
						// }

						for (const child_key of children_keys) {
							const children = view[child_key as keyof SerializedViewWithAlias] as SerializedViewWithAlias[];
							if (children && children.length > 0) {
								findMatchesRecursively(children);
							}
						}

						// // Recursively check components
						// if (view.components && view.components.length > 0) {
						// 	findMatchesRecursively(view.components);
						// }

						// // Recursively check tabs
						// if (view.tabs && view.tabs.length > 0) {
						// 	findMatchesRecursively(view.tabs);
						// }
					}
				};

				// Start the recursive search
				findMatchesRecursively(serializedViewsWithAlias);
			}

			// Sort by score (highest first)
			rankedOptions = rankedOptions
				.sort((a, b) => b.score - a.score)
				.filter((option) => {
					if (option.type === "action" || option.type === "close_window") {
						return option.score > 0.6;
					} else {
						return option.score > 0.2;
					}
				});

			// Log the ranked options
			console.log("Ranked options:", JSON.stringify(rankedOptions, null, 2));

			// --- Filter based on "Do nothing" score ---
			let finalRankedOptions = rankedOptions;
			if (doNothingAlias) {
				const doNothingOption = rankedOptions.find((opt) => opt.token === doNothingAlias);
				if (doNothingOption) {
					const doNothingScore = doNothingOption.score;
					console.log(`"Do nothing" option found with score: ${doNothingScore}. Filtering lower-scored options.`);
					finalRankedOptions = rankedOptions.filter((opt) => opt.score >= doNothingScore && opt.token !== doNothingAlias); // Keep higher or equal scores, remove doNothing itself
				} else {
					// If "Do nothing" wasn't suggested by the LLM, keep all options that passed previous filters
					console.log('"Do nothing" option not found in LLM suggestions.');
					finalRankedOptions = rankedOptions;
				}
			}
			// --- End Filter based on "Do nothing" score ---

			if (finalRankedOptions.length === 0) {
				console.log("No ranked options found after filtering.");
				// console.log(JSON.stringify( response.choices[0].logprobs, null, 2));
			} else {
				console.log("FINAL RANKED OPTIONS", JSON.stringify(finalRankedOptions, null, 2));
				this.agent.effect.selected_options(finalRankedOptions);
			}

			// console.log('Final Ranked options:', finalRankedOptions);
			// // Use the response directly
			// const data = response;

			// // Extract the selected action from the response content
			// const selectedAction = data.choices[0].message.content?.trim() || '';

			// console.log('Selected action:', selectedAction);

			return finalRankedOptions as RankedOption[];
		} catch (error) {
			console.error("Error selecting tool:", error);
			this.agent.effect.thought(`Error selecting tool`);
			return [];
		}
	}

	// Helper method to process links and actions for a view
	private processLinksAndActions(
		view: any,
		viewWithAlias: SerializedViewWithAlias,
		aliasesDict: AliasesDictionary,
		encoder: any, // Keep parameter for compatibility, but mark as unused or remove if not needed elsewhere
		aliasCounter: number,
	): number {
		// Process links
		for (const link of view.clickable_links || []) {
			// Use simple string counter for alias
			const alias = String(aliasCounter++);
			// console.log('Alias for link', link.name, alias); // Keep for debugging if needed
			viewWithAlias.clickable_links.push({
				...link,
				alias,
				is_already_opened: this.agent.doc.windows.some((window) => window.id === link.router_path) || false,
			});

			// Add to aliases dictionary
			aliasesDict.set(alias, {
				type: "click_link",
				alias,
				window_id: view.window_id,
				serialized_view: viewWithAlias,
				target_path: link.router_path,
			});
		}

		// Process actions
		for (const action of view.actions || []) {
			const alias = String(aliasCounter++);
			viewWithAlias.actions.push({
				...action,
				alias,
				// Add is_already_opened for consistency if needed by the type, though irrelevant here
				is_already_opened: false,
			});

			// Add to aliases dictionary
			aliasesDict.set(alias, {
				type: "action",
				alias,
				window_id: view.window_id,
				serialized_view: viewWithAlias,
			});
		}

		return aliasCounter;
	}

	// // Helper method to process recursive views (tabs or components)
	// private processRecursiveViews(subviews: any[], aliasesDict: AliasesDictionary, encoder: any, aliasCounter: number): SerializedViewWithAlias[] {
	// 	const processedSubviews: SerializedViewWithAlias[] = [];

	// 	for (const subview of subviews) {
	// 		const subviewWithAlias: SerializedViewWithAlias = {
	// 			...subview,
	// 			clickable_links: [],
	// 			actions: [],
	// 			tabs: [],
	// 			components: [],
	// 		};

	// 		// Process links and actions for this subview
	// 		// Pass undefined for encoder as we now use string counters
	// 		aliasCounter = this.processLinksAndActions(subview, subviewWithAlias, aliasesDict, undefined, aliasCounter);

	// 		// Recursively process nested tabs/components if they exist
	// 		if (subview.tabs && subview.tabs.length > 0) {
	// 			// Pass undefined for encoder
	// 			subviewWithAlias.tabs = this.processRecursiveViews(subview.tabs, aliasesDict, undefined, aliasCounter);
	// 		}

	// 		if (subview.components && subview.components.length > 0) {
	// 			// Pass undefined for encoder
	// 			subviewWithAlias.components = this.processRecursiveViews(subview.components, aliasesDict, undefined, aliasCounter);
	// 		}

	// 		processedSubviews.push(subviewWithAlias);
	// 	}

	// 	return processedSubviews;
	// }

	// Add a new method that returns the updated counter
	private processRecursiveViewsWithCounter(subviews: any[], aliasesDict: AliasesDictionary, encoder: any, aliasCounter: number): { newCounter: number; processedComponents: SerializedViewWithAlias[] } {
		const processedSubviews: SerializedViewWithAlias[] = [];

		for (const subview of subviews) {
			const subviewWithAlias: SerializedViewWithAlias = {
				...subview,
				clickable_links: [],
				actions: [],
				tabs: [],
				components: [],
			};

			// Process links and actions for this subview
			aliasCounter = this.processLinksAndActions(subview, subviewWithAlias, aliasesDict, undefined, aliasCounter);

			// Recursively process nested tabs/components if they exist
			// if (subview.tabs && subview.tabs.length > 0) {
			// 	const { newCounter, processedComponents } = this.processRecursiveViewsWithCounter(subview.tabs, aliasesDict, undefined, aliasCounter);
			// 	subviewWithAlias.tabs = processedComponents;
			// 	aliasCounter = newCounter;
			// }

			// if (subview.components && subview.components.length > 0) {
			// 	const { newCounter, processedComponents } = this.processRecursiveViewsWithCounter(subview.components, aliasesDict, undefined, aliasCounter);
			// 	subviewWithAlias.components = processedComponents;
			// 	aliasCounter = newCounter;
			// }

			const children_keys = subview.children_keys;

			for (const child_key of children_keys) {
				if (subview[child_key] && subview[child_key].length > 0) {
					const { newCounter, processedComponents } = this.processRecursiveViewsWithCounter(subview[child_key], aliasesDict, undefined, aliasCounter);
					// Type assertion to tell TypeScript this is a valid assignment
					(subviewWithAlias[child_key as keyof SerializedViewWithAlias] as any) = processedComponents;
					aliasCounter = newCounter;
				}
			}

			processedSubviews.push(subviewWithAlias);
		}

		return { newCounter: aliasCounter, processedComponents: processedSubviews };
	}

	// Helper method to format views as JSON for the prompt
	private formatViewsAsJSON(views: SerializedViewWithAlias[]): string {
		const formattedViews = views.map((view) => {
			// Create a simplified view object
			const formattedView: any = {
				name: view.name,
				description: view.description,
				clickable_links: [],
				actions: [],
			};

			// Format links
			if (view.clickable_links.length === 0) {
				// formattedView.links = "No links available";
			} else {
				formattedView.links = view.clickable_links.map((link) => {
					if (link.is_already_opened) {
						return {
							name: link.name,
							description: link.description,
							// status: "ALREADY OPEN - NO ALIAS NEEDED"
						};
					} else {
						return {
							name: link.name,
							description: link.description,
							alias: link.alias,
						};
					}
				});
			}

			// Format actions
			if (view.actions.length === 0) {
				formattedView.actions = "No actions available";
			} else {
				// Map actions including the potentially added "Do nothing" action
				formattedView.actions = view.actions.map((action) => ({
					name: action.label, // Use label which is consistent for regular and "Do nothing" actions
					description: action.description,
					alias: action.alias,
				}));
			}

			// // Format components if they exist
			// if (view.components && view.components.length > 0) {
			// 	formattedView.components = JSON.parse(this.formatViewsAsJSON(view.components));
			// }

			// // Format tabs if they exist
			// if (view.tabs && view.tabs.length > 0) {
			// 	formattedView.tabs = JSON.parse(this.formatViewsAsJSON(view.tabs));
			// }

			const children_keys = view.children_keys;

			for (const child_key of children_keys) {
				const children = view[child_key as keyof SerializedViewWithAlias] as SerializedViewWithAlias[];
				if (children && children.length > 0) {
					formattedView[child_key] = JSON.parse(this.formatViewsAsJSON(children));
				}
			}

			return formattedView;
		});

		return JSON.stringify(formattedViews, null, 2);
	}

	private findMatchingViewAndType(
		views: SerializedViewWithAlias[],
		token: string,
	): {
		view: SerializedViewWithAlias | undefined;
		isAction: boolean;
		isLink: boolean;
	} {
		for (const view of views) {
			// Check top-level actions and links
			const matchingAction = view.actions.find((action) => action.alias === token);
			if (matchingAction) {
				// console.log('Found matching action:', matchingAction);
				return { view, isAction: true, isLink: false };
			}

			const matchingLink = view.clickable_links.find((link) => link.alias === token);
			if (matchingLink) {
				// console.log('Found matching link:', matchingLink);
				return { view, isAction: false, isLink: true };
			}

			// // Check components recursively
			// if (view.components && view.components.length > 0) {
			// 	const result = this.findMatchingViewAndType(view.components, token);
			// 	if (result.view) {
			// 		// console.log('Found match in components');
			// 		return result;
			// 	}
			// }

			// // Check tabs recursively
			// if (view.tabs && view.tabs.length > 0) {
			// 	const result = this.findMatchingViewAndType(view.tabs, token);
			// 	if (result.view) {
			// 		// console.log('Found match in tabs');
			// 		return result;
			// 	}
			// }

			const children_keys = view.children_keys;

			for (const child_key of children_keys) {
				const children = view[child_key as keyof SerializedViewWithAlias] as SerializedViewWithAlias[];
				if (children && children.length > 0) {
					const result = this.findMatchingViewAndType(children, token);
					if (result.view) {
						return result;
					}
				}
			}
		}

		// console.log('No match found for token:', token);
		return { view: undefined, isAction: false, isLink: false };
	}
}
