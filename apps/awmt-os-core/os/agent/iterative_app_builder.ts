import { createOpenAIClient, getModelName } from "../config/modelConfig";
import { encoding_for_model } from "tiktoken";
import type { OsDocument, OsLog, IterativeAppBuilderState, EntityDefinition, EntityStateMachine, ActionDefinition, PageDefinition, NavigationDefinition, AgentViewDefinition, ColorPalette, ViewType } from "@joshu/os-types";
import type Os from "../os";
import { AbstractAgent, uuidv4 } from "./abstract_agent";
import { jsonrepair } from "jsonrepair";
import OpenAI from "openai";
import { Tiktoken } from "tiktoken";

/**
 * Iterative App Builder Agent
 * A more sophisticated version of the App Builder Agent that builds an application
 * through a series of iterative steps
 */
export default class IterativeAppBuilderAgent extends AbstractAgent<IterativeAppBuilderState> {
	private model: string = getModelName();

	constructor(os: Os, doc: OsDocument) {
		// Initialize with default state
		super(os, doc, {
			currentStep: "idle",
			lastAction: null,
		});

		this.effect.thought("Initializing Iterative Application Builder...");
	}

	/**
	 * Creates a safe copy of any object to prevent circular references
	 * that could cause problems with the Automerge document system
	 */
	private safeCopy<T>(data: T): T {
		try {
			// Handle primitive types and null/undefined
			if (data === null || data === undefined || typeof data === "string" || typeof data === "number" || typeof data === "boolean" || typeof data === "symbol" || data instanceof Date) {
				return data;
			}

			// Handle arrays
			if (Array.isArray(data)) {
				return data.map((item) => this.safeCopy(item)) as unknown as T;
			}

			// Handle objects
			if (typeof data === "object") {
				// Create a new object to store the safe copy
				const safeObject: Record<string, any> = {};

				// Get all enumerable keys
				const keys = Object.keys(data);

				// Copy each property recursively
				for (const key of keys) {
					try {
						const value = (data as Record<string, any>)[key];
						safeObject[key] = this.safeCopy(value);
					} catch (e) {
						console.warn(`Skipping property ${key} due to error:`, e);
						// Skip problematic properties instead of failing
						continue;
					}
				}

				return safeObject as T;
			}

			// For any other type, try JSON parse/stringify as a fallback
			return JSON.parse(JSON.stringify(data));
		} catch (e) {
			console.error("Error creating safe copy:", e);
			// Return a safe empty value based on the type
			if (Array.isArray(data)) {
				return [] as unknown as T;
			}
			if (typeof data === "object") {
				return {} as T;
			}
			return data; // Return original for primitives
		}
	}

	/**
	 * Override updateState to ensure all updates use safe copies
	 * to prevent circular reference errors in Automerge
	 */
	public updateState(update: Partial<IterativeAppBuilderState>): void {
		// Create a safe copy of the update object to prevent circular references
		const safeUpdate = this.safeCopy(update);
		try {
			super.updateState(safeUpdate);
		} catch (e) {
			console.error("Error updating state:", JSON.stringify(safeUpdate, null, 2));
		}
	}

	/**
	 * Implementation of the abstract start method
	 * @param query the query from the user
	 */
	async start(query: string): Promise<this> {
		console.log("STARTING IterativeAppBuilderAgent");
		this.effect.update_pause_state(false);
		this.effect.thought("Starting iterative application builder");

		this.updateState({
			userQuery: query,
			currentStep: "application_brief",
			lastAction: "start",
		});

		this.effect.thought("I'll help you build an application through a series of iterative steps, starting with an application brief and ending with a complete application schema.");

		try {
			// Step 1: Application Brief
			await this.generateApplicationBrief(query);

			// Step 2: UI Theme
			await this.generateColorPalette();

			// Step 3: Data modeling
			await this.defineDataModel();

			// Step 4: State machines
			await this.defineStateMachines();

			// Step 5: Actions
			await this.defineActions();

			// Step 6: Navigation
			await this.defineNavigation();

			// Step 7: Views
			await this.scaffoldViews();

			// Complete
			this.displayFinalResults();

			this.updateState({
				currentStep: "completed",
				lastAction: "completed",
			});

			console.log(JSON.stringify(this.getState()));

			this.effect.work_done();
		} catch (e) {
			console.error("Error in IterativeAppBuilderAgent", e);
			this.effect.thought("I encountered an error while building your application. Please try again.");
		}

		return this;
	}

	/**
	 * Implementation of the abstract loop method
	 * For this agent, the loop does nothing as we only need to run once
	 */
	async loop(): Promise<boolean> {
		// This agent doesn't need a loop as it finishes its work in the start method
		console.log("IterativeAppBuilderAgent doesn't require looping - work is done in the start method");
		return false;
	}

	/**
	 * Implementation of the abstract pause method
	 */
	async pause(): Promise<void> {
		console.log("PAUSING IterativeAppBuilderAgent");
		this.is_paused = true;
		this.effect.update_pause_state(true);
		this.effect.thought("Application builder paused");
	}

	/**
	 * Implementation of the abstract resume method
	 */
	async resume(): Promise<void> {
		console.log("RESUMING IterativeAppBuilderAgent");
		this.is_paused = false;
		this.effect.update_pause_state(false);
		this.effect.thought("Application builder resumed");

		// Check if we need to continue any work
		const state = this.getState();

		if (state.currentStep !== "completed") {
			this.effect.thought("Continuing application building process...");

			// Continue from where we left off
			try {
				switch (state.currentStep) {
					case "application_brief":
						await this.generateApplicationBrief(state.userQuery || "");
						await this.generateColorPalette();
						await this.defineDataModel();
						await this.defineStateMachines();
						await this.defineActions();
						await this.defineNavigation();
						await this.scaffoldViews();
						break;
					case "ui_theme":
						await this.generateColorPalette();
						await this.defineDataModel();
						await this.defineStateMachines();
						await this.defineActions();
						await this.defineNavigation();
						await this.scaffoldViews();
						break;
					case "data_model":
						await this.defineDataModel();
						await this.defineStateMachines();
						await this.defineActions();
						await this.defineNavigation();
						await this.scaffoldViews();
						break;
					case "state_machines":
						await this.defineStateMachines();
						await this.defineActions();
						await this.defineNavigation();
						await this.scaffoldViews();
						break;
					case "actions":
						await this.defineActions();
						await this.defineNavigation();
						await this.scaffoldViews();
						break;
					case "navigation":
						await this.defineNavigation();
						await this.scaffoldViews();
						break;
					case "views":
						await this.scaffoldViews();
						break;
				}

				this.displayFinalResults();

				this.updateState({
					currentStep: "completed",
					lastAction: "completed_after_resume",
				});

				this.effect.work_done();
			} catch (e) {
				console.error("Error resuming IterativeAppBuilderAgent", e);
				this.effect.thought("I encountered an error while resuming. Please try again.");
			}
		}
	}

	/**
	 * Record token usage with cost calculation
	 */
	public record_token_usage(input_tokens: number, output_tokens: number, model: string): void {
		// Calculate approximate cost (using standard pricing)
		let inputCost = 0;
		let outputCost = 0;

		// Pricing based on model
		switch (model) {
			case "gpt-4.1-mini":
				inputCost = input_tokens * (0.4 / 1000000); // $0.40 per 1M tokens
				outputCost = output_tokens * (1.6 / 1000000); // $1.60 per 1M tokens
				break;
			case "gpt-4.1":
				inputCost = input_tokens * (2 / 1000000); // $2 per 1M tokens
				outputCost = output_tokens * (8 / 1000000); // $8 per 1M tokens
				break;
			default:
				// Default pricing if model not recognized
				inputCost = input_tokens * (1 / 1000000);
				outputCost = output_tokens * (5 / 1000000);
		}

		const total_cost = inputCost + outputCost;
		this.token_usage.input += input_tokens;
		this.token_usage.output += output_tokens;
		this.token_usage.cost += total_cost;

		console.log(`Token usage - Input: ${input_tokens}, Output: ${output_tokens}, Cost: $${total_cost.toFixed(6)}`);

		// Update the OS with token usage
		this.effect.token_usage({
			input: input_tokens,
			output: output_tokens,
			cost: total_cost,
		});
	}

	/**
	 * Step 1: Generate the application brief
	 * This includes:
	 * - Project brief
	 * - Requirements (checklist)
	 * - Consistent app description
	 */
	private async generateApplicationBrief(query: string): Promise<void> {
		this.effect.thought("Step 1: Generating detailed application brief...");
		this.updateState({
			currentStep: "application_brief",
			lastAction: "generating_brief",
		});

		console.log("GENERATING APPLICATION BRIEF based on query:", query);

		try {
			const openai = createOpenAIClient();
			const enc = encoding_for_model("gpt-4.1-mini");

			const systemMessage = `You are an expert at creating detailed application briefs and specifications. 
Your task is to create a comprehensive application brief including a project overview, detailed requirements list, and a consistent application description.`;

			const prompt = `
Based on the user's request, create a detailed application brief with the following sections:

1. PROJECT BRIEF:
   - A thorough overview of the application's purpose, target users, core functionality, and business goals
   - Key challenges that the application will solve
   - What makes this application unique or valuable to users

2. REQUIREMENTS (as a markdown checklist with "- [ ]"):
   - Functional requirements (core features the app must have)
   - Technical requirements (specific technologies or approaches)
   - User experience requirements
   - Data management requirements
   - Integration requirements (if applicable)
   - Security and compliance requirements (if applicable)

3. APPLICATION DESCRIPTION:
   - A cohesive and consistent high-level description of the application
   - The core value proposition
   - The primary workflows from a user perspective
   - How this application fits into the user's broader ecosystem

Your response should be comprehensive, detailed, and well-structured in markdown format. 
Make sure the requirements are granular enough to guide the development process.

Here is the user's request:
"""
${query}
"""

Now, provide a complete application brief:`;

			const inputTokens = enc.encode(systemMessage).length + enc.encode(prompt).length;

			// Use streaming API for better user experience
			const stream = await openai.chat.completions.create({
				model: "gpt-4.1-mini",
				messages: [
					{ role: "system", content: systemMessage },
					{ role: "user", content: prompt },
				],
				temperature: 0.7,
				stream: true,
			});

			let brief = "";
			let projectBrief = "";
			let requirements: string[] = [];
			let appDescription = "";
			let currentSection = "";
			let lastUpdateTime = Date.now();
			const updateInterval = 150; // Update state every 150ms for more dynamic streaming

			// Process the streaming response
			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content || "";
				brief += content;

				// Try to split content into sections as it comes in
				// This is a simplistic approach - the content may not be complete
				const sections = brief.split(/\n#+\s/);
				if (sections.length > 1) {
					try {
						// Extract project brief from first section (might be partial)
						if (sections[1]?.toLowerCase().includes("project brief") || sections[1]?.toLowerCase().includes("overview")) {
							projectBrief = sections[1].split("\n\n")[1] || sections[1];
						}

						// Extract requirements (might be partial)
						const reqSection = sections.find((s) => s.toLowerCase().includes("requirements"));
						if (reqSection) {
							requirements = reqSection
								.split("\n")
								.filter((line) => line.trim().startsWith("- [ ]"))
								.map((line) => line.trim());
						}

						// Extract app description (might be partial)
						const descSection = sections.find((s) => s.toLowerCase().includes("description") || s.toLowerCase().includes("overview"));
						if (descSection) {
							appDescription = descSection.split("\n\n")[1] || descSection;
						}

						// Try to use jsonrepair when we have partial JSON content in any section
						// This helps ensure we're working with valid JSON even during streaming
						if (projectBrief.includes("{") && projectBrief.includes("}")) {
							try {
								const jsonContent = projectBrief.substring(projectBrief.indexOf("{"), projectBrief.lastIndexOf("}") + 1);
								const repairedJson = this.tryCompleteJson(jsonContent);
								// Only replace if repair was successful
								if (repairedJson && repairedJson !== jsonContent) {
									projectBrief = projectBrief.replace(jsonContent, repairedJson);
								}
							} catch (e) {
								// Silently ignore repair errors during streaming
							}
						}

						if (appDescription.includes("{") && appDescription.includes("}")) {
							try {
								const jsonContent = appDescription.substring(appDescription.indexOf("{"), appDescription.lastIndexOf("}") + 1);
								const repairedJson = this.tryCompleteJson(jsonContent);
								// Only replace if repair was successful
								if (repairedJson && repairedJson !== jsonContent) {
									appDescription = appDescription.replace(jsonContent, repairedJson);
								}
							} catch (e) {
								// Silently ignore repair errors during streaming
							}
						}
					} catch (e) {
						// Silently ignore parse errors during streaming
					}
				}

				// Update state at regular intervals to show progress
				const currentTime = Date.now();
				if (currentTime - lastUpdateTime > updateInterval) {
					// Create safe copies to prevent circular references
					this.updateState({
						projectBrief: projectBrief,
						requirements: requirements,
						appDescription: appDescription,
						lastAction: "streaming_brief",
					});
					this.effect.thought("Creating detailed application brief...");
					lastUpdateTime = currentTime;
				}
			}

			// Process the final content to properly extract sections
			const regex = /#+\s*(.*?)\s*\n([\s\S]*?)(?=#+\s*|\Z)/g;
			let match;
			const sections: Record<string, string> = {};

			// Reset to beginning of string
			regex.lastIndex = 0;

			// Extract named sections (Project Brief, Requirements, Application Description)
			while ((match = regex.exec(brief)) !== null) {
				const title = match[1].trim().toLowerCase();
				const content = match[2].trim();

				if (title.includes("project") || title.includes("overview") || title.includes("brief")) {
					sections["project_brief"] = content;
				} else if (title.includes("requirements")) {
					sections["requirements"] = content;
				} else if (title.includes("description")) {
					sections["app_description"] = content;
				}
			}

			// Extract requirements as an array of tasks
			const requirementsList = (sections["requirements"] || "")
				.split("\n")
				.filter((line) => line.trim().startsWith("- [ ]"))
				.map((line) => line.trim());

			// Calculate token usage
			const outputTokens = enc.encode(brief).length;
			enc.free();
			this.record_token_usage(inputTokens, outputTokens, "gpt-4.1-mini");

			// Update state with the final content using our overridden updateState with automatic safeCopy
			this.updateState({
				projectBrief: sections["project_brief"] || projectBrief,
				requirements: requirementsList.length > 0 ? requirementsList : requirements,
				appDescription: sections["app_description"] || appDescription,
				lastAction: "completed_brief",
			});

			console.log("APPLICATION BRIEF GENERATED:");
			console.log(`- Project Brief: ${(sections["project_brief"] || "").substring(0, 100)}...`);
			console.log(`- Requirements: ${requirementsList.length} items`);
			console.log(`- App Description: ${(sections["app_description"] || "").substring(0, 100)}...`);

			this.effect.thought("Application brief generated successfully!");
		} catch (error) {
			console.error("Error generating application brief:", error);
			this.updateState({
				lastAction: "error_generating_brief",
			});
			this.effect.thought("Error generating application brief!");
		}
	}

	/**
	 * Try to complete a potentially incomplete JSON string with better error handling
	 */
	private tryCompleteJson(incompleteJson: string): string {
		try {
			// If the string is empty or not a string, return an empty object
			if (!incompleteJson || typeof incompleteJson !== "string") {
				return "{}";
			}

			// Check if the json is already valid
			try {
				JSON.parse(incompleteJson);
				return incompleteJson; // It's already valid, don't modify it
			} catch (e) {
				// Not valid JSON, continue with repair
			}

			// Apply jsonrepair and handle any errors
			return jsonrepair(incompleteJson);
		} catch (e) {
			console.error("Error completing JSON:", e);

			// If repair fails, try to make a best-effort fix for common issues
			try {
				// Try to fix common issues like missing closing brackets
				let fixed = incompleteJson;

				// Count open and close braces/brackets and add missing ones
				const openBraces = (incompleteJson.match(/\{/g) || []).length;
				const closeBraces = (incompleteJson.match(/\}/g) || []).length;
				const openBrackets = (incompleteJson.match(/\[/g) || []).length;
				const closeBrackets = (incompleteJson.match(/\]/g) || []).length;

				// Add missing close braces/brackets
				for (let i = 0; i < openBraces - closeBraces; i++) {
					fixed += "}";
				}
				for (let i = 0; i < openBrackets - closeBrackets; i++) {
					fixed += "]";
				}

				return fixed;
			} catch (fallbackError) {
				console.error("Error in fallback JSON fix:", fallbackError);
				return "{}"; // Return empty object as last resort
			}
		}
	}

	/**
	 * Step 2: Generate UI Color Palette / Theme
	 * Creates a sophisticated color palette for the application
	 */
	private async generateColorPalette(): Promise<void> {
		this.effect.thought("Step 2: Creating a sophisticated color palette that matches your application's purpose and aesthetic goals...");
		this.updateState({
			currentStep: "ui_theme",
			lastAction: "generating_palette",
		});

		console.log("GENERATING COLOR PALETTE");

		try {
			// Check if we already have a color palette
			const existingPalette = this.getState().colorPalette;
			if (existingPalette) {
				this.effect.thought("Color palette already exists, using existing palette.");
				return;
			}

			// We'll use the LLM to generate a color palette that matches the application's purpose
			const openai = createOpenAIClient();
			const enc = encoding_for_model("gpt-4.1-mini");

			const state = this.getState();
			const appDescription = state.appDescription || "";
			const projectBrief = state.projectBrief || "";
			const query = state.userQuery || "";

			const systemMessage = `You are an expert UI designer with deep knowledge of color theory, emotional design, and color psychology.
Your specialty is creating tailored color palettes that perfectly match an application's purpose, evoke the right emotional response, and meet accessibility standards.
You create sophisticated hexadecimal color palettes that professional designers would use, not generic template colors.`;

			const prompt = `
Based on the application brief below, create a sophisticated and harmonious color palette that perfectly matches its purpose, domain, and target users.

PROJECT BRIEF:
"""
${projectBrief}
"""

APPLICATION DESCRIPTION:
"""
${appDescription}
"""

ORIGINAL USER REQUEST:
"""
${query}
"""

Please generate a cohesive color palette including:
1. Primary color scheme (for main actions and important UI elements)
2. Secondary color scheme (for supporting elements)
3. Accent color scheme (for highlights and calls to action)
4. 6 distinct entity color schemes for different types of data (these will be used for entity tags and cards)

Your palette should:
- Evoke the right emotional response for this specific application domain
- Follow accessibility guidelines with sufficient contrast (WCAG AA minimum)
- Create a professional, cohesive visual system with proper color relationships
- Reflect the core values and purpose of the application
- Use sophisticated color choices that a professional designer would select

For each color, provide:
- Hexadecimal values for both light and dark modes
- Text colors that provide sufficient contrast against backgrounds
- Border colors that complement the background colors

Return ONLY the following JSON structure with hexadecimal colors:
{
  "primary": {
    "base": "#hexcolor",
    "hover": "#hexcolor", 
    "text": "#hexcolor"
  },
  "secondary": {
    "base": "#hexcolor",
    "hover": "#hexcolor",
    "text": "#hexcolor"
  },
  "accent": {
    "base": "#hexcolor",
    "hover": "#hexcolor",
    "text": "#hexcolor"
  },
  "entity_colors": [
    {
      "background": "#hexcolor",
      "text": "#hexcolor",
      "border": "#hexcolor",
      "darkBackground": "#hexcolor",
      "darkText": "#hexcolor",
      "darkBorder": "#hexcolor"
    },
    // 5 more similar objects for the remaining entity colors
  ]
}`;

			const inputTokens = enc.encode(systemMessage).length + enc.encode(prompt).length;

			// Create a fallback palette that will be used if the API fails
			const fallbackPalette = {
				primary: {
					base: "#4F46E5",
					hover: "#4338CA",
					text: "#FFFFFF",
				},
				secondary: {
					base: "#F3F4F6",
					hover: "#E5E7EB",
					text: "#1F2937",
				},
				accent: {
					base: "#8B5CF6",
					hover: "#7C3AED",
					text: "#FFFFFF",
				},
				entity_colors: [
					{
						background: "#EFF6FF",
						text: "#1E40AF",
						border: "#BFDBFE",
						darkBackground: "#1E3A8A",
						darkText: "#93C5FD",
						darkBorder: "#1E40AF",
					},
					{
						background: "#ECFDF5",
						text: "#065F46",
						border: "#A7F3D0",
						darkBackground: "#064E3B",
						darkText: "#6EE7B7",
						darkBorder: "#065F46",
					},
					{
						background: "#F5F3FF",
						text: "#5B21B6",
						border: "#DDD6FE",
						darkBackground: "#4C1D95",
						darkText: "#C4B5FD",
						darkBorder: "#5B21B6",
					},
					{
						background: "#FFF7ED",
						text: "#9A3412",
						border: "#FFEDD5",
						darkBackground: "#7C2D12",
						darkText: "#FDBA74",
						darkBorder: "#9A3412",
					},
					{
						background: "#FEF2F2",
						text: "#991B1B",
						border: "#FEE2E2",
						darkBackground: "#7F1D1D",
						darkText: "#FCA5A5",
						darkBorder: "#991B1B",
					},
					{
						background: "#ECFEFF",
						text: "#155E75",
						border: "#CFFAFE",
						darkBackground: "#164E63",
						darkText: "#67E8F9",
						darkBorder: "#155E75",
					},
				],
			};

			// Update with fallback palette immediately so we have something to show
			this.updateState({
				colorPalette: fallbackPalette,
				entity_color_map: {}, // Initialize empty color map
				lastAction: "generating_initial_palette",
			});

			// Now get the AI-generated palette
			try {
				// Use non-streaming for better JSON response
				const response = await openai.chat.completions.create({
					model: "gpt-4.1-mini",
					messages: [
						{ role: "system", content: systemMessage },
						{ role: "user", content: prompt },
					],
					temperature: 0.7,
					response_format: { type: "json_object" },
				});

				const content = response.choices[0]?.message?.content || "";
				const outputTokens = enc.encode(content).length;

				enc.free();
				this.record_token_usage(inputTokens, outputTokens, "gpt-4.1-mini");

				// Parse the response
				try {
					const palette = JSON.parse(content);

					// Validate structure
					if (palette.primary && palette.primary.base && palette.secondary && palette.secondary.base && palette.accent && palette.accent.base && Array.isArray(palette.entity_colors) && palette.entity_colors.length >= 5) {
						// Update the state with the AI-generated palette
						this.updateState({
							colorPalette: palette,
							entity_color_map: {}, // Reset color map with new palette
							lastAction: "completed_palette",
						});

						console.log("COLOR PALETTE GENERATED:");
						console.log(`- Primary: ${palette.primary.base}`);
						console.log(`- Secondary: ${palette.secondary.base}`);
						console.log(`- Accent: ${palette.accent.base}`);
						console.log(`- Entity Colors: ${palette.entity_colors.length} colors`);

						this.effect.thought("Created a sophisticated color palette tailored to your application's domain!");
					} else {
						// Keep using the fallback palette if the structure isn't valid
						console.log("USING FALLBACK PALETTE (generated palette was incomplete)");
						this.effect.thought("Generated palette was incomplete, using default palette instead.");
					}
				} catch (e) {
					console.error("Error parsing color palette:", e);
					// We already have a fallback palette, so no need to update
					this.updateState({
						lastAction: "recovered_palette",
					});
				}
			} catch (error) {
				console.error("Error generating color palette from AI:", error);
				// We already have a fallback palette, so just update the status
				this.updateState({
					lastAction: "recovered_palette",
				});
			}

			this.effect.thought("Color palette created! Colors will be assigned to entities as they are generated.");
		} catch (error) {
			console.error("Error in overall color palette generation:", error);

			// Create a fallback palette with hex values
			const fallbackPalette = {
				primary: {
					base: "#4F46E5",
					hover: "#4338CA",
					text: "#FFFFFF",
				},
				secondary: {
					base: "#F3F4F6",
					hover: "#E5E7EB",
					text: "#1F2937",
				},
				accent: {
					base: "#8B5CF6",
					hover: "#7C3AED",
					text: "#FFFFFF",
				},
				entity_colors: [
					{
						background: "#EFF6FF",
						text: "#1E40AF",
						border: "#BFDBFE",
						darkBackground: "#1E3A8A",
						darkText: "#93C5FD",
						darkBorder: "#1E40AF",
					},
					{
						background: "#ECFDF5",
						text: "#065F46",
						border: "#A7F3D0",
						darkBackground: "#064E3B",
						darkText: "#6EE7B7",
						darkBorder: "#065F46",
					},
					{
						background: "#F5F3FF",
						text: "#5B21B6",
						border: "#DDD6FE",
						darkBackground: "#4C1D95",
						darkText: "#C4B5FD",
						darkBorder: "#5B21B6",
					},
					{
						background: "#FFF7ED",
						text: "#9A3412",
						border: "#FFEDD5",
						darkBackground: "#7C2D12",
						darkText: "#FDBA74",
						darkBorder: "#9A3412",
					},
					{
						background: "#FEF2F2",
						text: "#991B1B",
						border: "#FEE2E2",
						darkBackground: "#7F1D1D",
						darkText: "#FCA5A5",
						darkBorder: "#991B1B",
					},
					{
						background: "#ECFEFF",
						text: "#155E75",
						border: "#CFFAFE",
						darkBackground: "#164E63",
						darkText: "#67E8F9",
						darkBorder: "#155E75",
					},
				],
			};

			this.updateState({
				colorPalette: fallbackPalette,
				entity_color_map: {}, // Initialize empty color map
				lastAction: "error_generating_palette",
			});

			this.effect.thought("Error generating color palette! Using default colors instead.");
		}
	}

	/**
	 * Step 3: Define the Data Model
	 * This includes:
	 * - Import existing entities
	 * - Create new entities with fields and relationships
	 */
	private async defineDataModel(): Promise<void> {
		this.effect.thought("Step 3: Defining the data model with entities, fields, and relationships...");
		this.updateState({
			currentStep: "data_model",
			lastAction: "start_data_model",
		});

		console.log("DEFINING DATA MODEL");

		try {
			// 1. First we'll import existing entities to consider
			const existingEntities = this.getBaseEntities();
			this.updateState({
				importedEntities: existingEntities,
				lastAction: "imported_base_entities",
			});

			console.log("IMPORTED BASE ENTITIES:", existingEntities.length);

			// 2. Then we'll create new custom entities with fields and relationships
			await this.generateEntityDefinitions();

			// 3. Finally, enrich the entities with fields and relationships
			await this.enrichEntitiesWithFieldsAndRelationships();

			// Assign colors to all entities
			this.assignColorsToEntities();

			this.effect.thought("Data model defined successfully with entities, fields, and relationships!");
		} catch (error) {
			console.error("Error defining data model:", error);
			this.updateState({
				lastAction: "error_defining_data_model",
			});
			this.effect.thought("Error defining data model!");
		}
	}

	/**
	 * Get base reusable system entities that can be used in any application
	 */
	private getBaseEntities(): EntityDefinition[] {
		// Define common reusable system entities
		const commonEntities: EntityDefinition[] = [
			{
				name: "user",
				label: "User",
				description: "A user of the application with authentication and profile information",
				emoji: "👤",
				fields: [
					{
						name: "email",
						label: "Email",
						type: "string",
						required: true,
						description: "User's email address for authentication and communication",
					},
					{
						name: "name",
						label: "Name",
						type: "string",
						required: true,
						description: "User's full name",
					},
					{
						name: "profilePicture",
						label: "Profile Picture",
						type: "string",
						required: false,
						description: "URL to user's profile picture",
					},
				],
				isSystemEntity: true,
			},
			{
				name: "note",
				label: "Note",
				description: "A note that can be used to store long text or markdown content",
				emoji: "📝",
				fields: [
					{
						name: "title",
						label: "Title",
						type: "string",
						required: true,
						description: "Note title",
					},
					{
						name: "content",
						label: "Content",
						type: "string",
						required: true,
						description: "Note content in text or markdown format",
					},
					{
						name: "createdAt",
						label: "Created At",
						type: "date",
						required: true,
						description: "Date when note was created",
					},
				],
				isSystemEntity: true,
			},
			{
				name: "calendarEvent",
				label: "Calendar Event",
				description: "An event with a specific date, time and duration",
				emoji: "📅",
				fields: [
					{
						name: "title",
						label: "Title",
						type: "string",
						required: true,
						description: "Event title",
					},
					{
						name: "startTime",
						label: "Start Time",
						type: "date",
						required: true,
						description: "Event start date and time",
					},
					{
						name: "endTime",
						label: "End Time",
						type: "date",
						required: true,
						description: "Event end date and time",
					},
					{
						name: "description",
						label: "Description",
						type: "string",
						required: false,
						description: "Event description",
					},
					{
						name: "location",
						label: "Location",
						type: "string",
						required: false,
						description: "Physical or virtual location for the event",
					},
				],
				isSystemEntity: true,
			},
			{
				name: "contact",
				label: "Contact",
				description: "A person's contact information",
				emoji: "👤",
				fields: [
					{
						name: "name",
						label: "Name",
						type: "string",
						required: true,
						description: "Contact's name",
					},
					{
						name: "email",
						label: "Email",
						type: "string",
						required: false,
						description: "Contact's email address",
					},
					{
						name: "phone",
						label: "Phone",
						type: "string",
						required: false,
						description: "Contact's phone number",
					},
					{
						name: "company",
						label: "Company",
						type: "string",
						required: false,
						description: "Contact's company or organization",
					},
				],
				isSystemEntity: true,
			},
			{
				name: "file",
				label: "File",
				description: "A file or document in the system",
				emoji: "📁",
				fields: [
					{
						name: "name",
						label: "Name",
						type: "string",
						required: true,
						description: "File name",
					},
					{
						name: "url",
						label: "URL",
						type: "string",
						required: true,
						description: "URL to access the file",
					},
					{
						name: "mimeType",
						label: "MIME Type",
						type: "string",
						required: true,
						description: "MIME type of the file",
					},
					{
						name: "size",
						label: "Size",
						type: "number",
						required: true,
						description: "File size in bytes",
					},
				],
				isSystemEntity: true,
			},
		];

		return commonEntities;
	}

	/**
	 * Generate entity definitions based on the application specs
	 */
	private async generateEntityDefinitions(): Promise<void> {
		this.effect.thought("Generating domain-specific entity definitions...");

		const openai = createOpenAIClient();
		const enc = encoding_for_model("gpt-4.1-mini");

		const state = this.getState();
		const projectBrief = state.projectBrief || "";
		const requirements = state.requirements || [];
		const appDescription = state.appDescription || "";
		const importedEntities = state.importedEntities || [];

		// Create a string of imported entities to reference
		const importedEntityNames = importedEntities.map((e) => `${e.name} (${e.label}: ${e.description})`).join("\n- ");

		const systemMessage = `You are an expert domain modeler who specializes in graph database modeling. You never make any mistake and you are very good at your job. Your task is to identify all the key entities in a domain.`;

		const prompt = `
Based on the detailed application specification below, identify ALL the core entities that should be part of the graph database model.

APPLICATION BRIEF:
"""
${projectBrief}

${appDescription}
"""

REQUIREMENTS:
"""
${requirements.join("\n")}
"""

IMPORTED ENTITIES (already available, can be reused):
- ${importedEntityNames}

INSTRUCTIONS:
1. Carefully analyze the application specification and identify ALL domain entities that should be modeled
2. For each entity, provide:
   - A camelCase technical name
   - A human-readable label (Title Case)
   - A brief but clear description of what this entity represents in the domain
   - An appropriate emoji that represents the entity

3. Be COMPREHENSIVE - don't miss any important entities mentioned or implied in the specs
4. Focus on DOMAIN-SPECIFIC entities that are meaningful to this particular application
5. Include ALL entities that would be needed for a complete graph database model
6. Return entities with empty fields arrays - those will be added in the next step
7. Do NOT include purely technical entities like "Settings" or "Authentication"
8. Only include the imported entities if they directly fit the domain needs

Return the entities in this JSON format:
{
  "entities": [
    {
      "name": "entityName", 
      "label": "Entity Name", 
      "description": "Brief description of what this entity represents in the domain",
      "emoji": "🔍",
      "fields": [] // Empty fields array - will be filled in next step
    },
    // Additional entities...
  ]
}

Return ONLY the JSON object with no additional text.`;

		const inputTokens = enc.encode(systemMessage).length + enc.encode(prompt).length;

		try {
			// Use non-streaming call for this step
			const response = await openai.chat.completions.create({
				model: "gpt-4.1-mini",
				messages: [
					{ role: "system", content: systemMessage },
					{ role: "user", content: prompt },
				],
				temperature: 0.5,
				response_format: { type: "json_object" },
			});

			const content = response.choices[0]?.message?.content || "";
			const outputTokens = enc.encode(content).length;

			// Free the encoder
			enc.free();
			this.record_token_usage(inputTokens, outputTokens, "gpt-4.1-mini");

			try {
				const entityData = JSON.parse(content) as { entities: EntityDefinition[] };

				if (!entityData.entities || entityData.entities.length === 0) {
					this.effect.thought("No entities were generated. Using default entities...");
					// Create a minimal default entity if none were generated
					entityData.entities = [
						{
							name: "item",
							label: "Item",
							description: "A generic item in the system",
							emoji: "📦",
							fields: [],
						},
					];
				}

				// Add default emoji if missing
				const entitiesWithEmojis = entityData.entities.map((entity) => ({
					...entity,
					emoji: entity.emoji || this.getDefaultEmoji(entity.name),
					fields: entity.fields || [], // Ensure fields array exists
					label: entity.label || this.generateLabelFromName(entity.name), // Ensure label exists
				}));

				console.log("GENERATED ENTITIES:", entitiesWithEmojis.length);

				// Update state with the base entities
				this.updateState({
					entities: entitiesWithEmojis,
					lastAction: "generated_base_entities",
				});

				this.effect.thought(`Generated ${entitiesWithEmojis.length} domain-specific entities.`);
			} catch (e) {
				console.error("Error parsing entity definitions:", e);
				this.effect.thought("Error parsing entity definitions. Using default entities...");

				// Create a minimal default entity
				const defaultEntities = [
					{
						name: "item",
						label: "Item",
						description: "A generic item in the system",
						emoji: "📦",
						fields: [],
					},
				];

				this.updateState({
					entities: defaultEntities,
					lastAction: "using_default_entities_after_error",
				});
			}
		} catch (error) {
			console.error("Error generating entity definitions:", error);
			this.effect.thought("Error generating entity definitions. Using default entities...");

			// Create a minimal default entity
			const defaultEntities = [
				{
					name: "item",
					label: "Item",
					description: "A generic item in the system",
					emoji: "📦",
					fields: [],
				},
			];

			this.updateState({
				entities: defaultEntities,
				lastAction: "using_default_entities_after_error",
			});
		}
	}

	/**
	 * Enrich entities with fields and relationships
	 */
	private async enrichEntitiesWithFieldsAndRelationships(): Promise<void> {
		this.effect.thought("Enriching entities with fields and relationships...");

		const openai = createOpenAIClient();
		const enc = encoding_for_model("gpt-4.1-mini");

		const state = this.getState();
		const projectBrief = state.projectBrief || "";
		const appDescription = state.appDescription || "";
		const entities = state.entities || [];
		const importedEntities = state.importedEntities || [];

		// Combine all entities
		const allEntities = [...entities, ...importedEntities];

		// Filter out system entities from the display but mention them for relationships
		const domainEntities = entities.filter((entity) => !entity.isSystemEntity);
		const systemEntities = [...entities.filter((entity) => entity.isSystemEntity), ...importedEntities];

		const entityNames = domainEntities.map((e) => e.name).join(", ");
		const systemEntityNames = systemEntities.map((e) => e.name).join(", ");

		const systemMessage = `You are an expert domain modeler specializing in graph database schema design. You never make any mistake and always provide the best quality response. Your task is to enrich a set of base entities with detailed fields and relationships to create a comprehensive graph data model.`;

		const prompt = `
Now that we have identified the key entities for our graph database model, your task is to enrich these entities with detailed fields and relationships.

The application specification is:
"""
${projectBrief}

${appDescription}
"""

BASE ENTITIES TO ENRICH:
"""
${JSON.stringify(domainEntities, null, 2)}
"""

COMMON SYSTEM ENTITIES THAT CAN BE REFERENCED (but should not be enriched themselves):
"""
${JSON.stringify(systemEntities, null, 2)}
"""

GRAPH DATABASE MODELING GUIDELINES:
- We are designing for a GRAPH DATABASE, not a relational database
- Prioritize RELATIONSHIPS between entities rather than storing references as properties
- Model the domain as a network of connected nodes
- Focus on how entities relate to each other

USER EXPERIENCE-DRIVEN RELATIONSHIP GUIDELINES:
- Define relationships in the direction that makes the most sense from a USER EXPERIENCE perspective
- If a relationship makes sense in BOTH directions, define it in BOTH directions (don't rely on implicit reverse relationships)
- Example: A "User" should have "posts" (the things they created) and a "Post" should have an "author" (who created it)
- The direction should reflect how users naturally think about and navigate between entities
- Use is_list: true for one-to-many relationships (e.g., a Course has many Lessons)

FIELD GUIDELINES:
- DO NOT include ID fields - the graph database will handle this automatically
- Each entity should have 5-10 DOMAIN-SPECIFIC fields that capture the data needed for this business context
- For each entity, include:
  - Core attributes unique to this domain (e.g., title, description, name)
  - Metadata relevant to the workflow (e.g., timestamps, versioning)
  - Domain-specific categorization fields (e.g., type, category)
  - Graph connections to other entities (use is_relation: true)
- Use enum-type string fields with DOMAIN-SPECIFIC values for status or type fields
- Include boolean flags for domain-specific states or conditions
- Use appropriate field types: string, number, boolean, date
- Every field must have a name, label, type, required flag, and description

IMPORTANT:
- ONLY enrich the base entities from the provided list (${entityNames})
- You SHOULD create relationships to both basic entities AND common system entities (${systemEntityNames})
- STRONGLY ENCOURAGE creating relationships to the system entities where it makes sense (notes, events, contacts, etc.)
- When creating relationships, only reference existing entities from either list
- Do NOT create new entities beyond what's in the lists
- NEVER add redundant relationships with numbered suffixes (like "users1", "users2", etc.)
- Keep relationship names clear and consistent
- Ensure ALL fields have descriptive names that reflect their purpose
- Add 'is_relation: true' for ALL relationship fields

For EACH entity in the base list, provide a COMPLETE definition with fields and relationships in this format:
{
  "entities": [
    {
      "name": "entityName", 
      "label": "Entity Name", 
      "description": "Detailed description of what this entity represents",
      "emoji": "🔍",
      "fields": [
        {
          "name": "fieldName",
          "label": "Field Name",
          "type": "string|number|boolean|date",
          "required": true|false,
          "description": "Detailed description of what this field represents"
        },
        {
          "name": "relationshipFieldName",
          "label": "Relationship Field Name",
          "type": "RelatedEntityName", 
          "is_relation": true,
          "is_list": true|false,
          "required": true|false,
          "description": "Description of this relationship"
        }
      ]
    }
  ]
}

Return ONLY the JSON object with no additional text.`;

		const inputTokens = enc.encode(systemMessage).length + enc.encode(prompt).length;

		try {
			// Use streaming for a better user experience during this potentially longer operation
			this.effect.thought("Generating detailed fields and relationships for all entities...");

			const stream = await openai.chat.completions.create({
				model: "gpt-4.1-mini",
				messages: [
					{ role: "system", content: systemMessage },
					{ role: "user", content: prompt },
				],
				temperature: 0.5,
				response_format: { type: "json_object" },
				stream: true,
			});

			let messageContent = "";
			let lastUpdateTime = Date.now();
			const updateInterval = 150; // Update every 150ms for more dynamic updates

			// Process the streaming response
			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content || "";
				messageContent += content;

				// Update the UI periodically to show progress
				const currentTime = Date.now();
				if (currentTime - lastUpdateTime > updateInterval) {
					lastUpdateTime = currentTime;

					// Try to parse partial results for display
					try {
						// Make sure we have a valid JSON structure to work with
						if (messageContent.includes("{") && messageContent.includes('"entities"')) {
							// Apply jsonrepair to handle incomplete JSON
							const completedJson = this.tryCompleteJson(messageContent);

							try {
								const partialData = JSON.parse(completedJson) as { entities: EntityDefinition[] };

								if (partialData.entities && partialData.entities.length > 0) {
									// Merge enriched entities with system entities (keeping system entities untouched)
									const enrichedEntities = this.mergeEnrichedEntities(allEntities, partialData.entities);

									// Update the state with current progress - using safely copied data through updateState
									this.updateState({
										entities: enrichedEntities,
										lastAction: "enriching_entities_in_progress",
									});

									this.effect.thought(`Enriching entities: ${partialData.entities.length} processed so far...`);
								}
							} catch (parseError) {
								// If parsing fails even after repair, continue silently
								console.log("Parse error after repair:", parseError);
							}
						}
					} catch (e) {
						// Silently ignore repair errors during streaming
						console.log("JSON repair error:", e);
					}
				}
			}

			// Calculate token usage
			const outputTokens = enc.encode(messageContent).length;
			enc.free();
			this.record_token_usage(inputTokens, outputTokens, "gpt-4.1-mini");

			// Process the complete response
			try {
				const completedJson = this.tryCompleteJson(messageContent);
				const entityData = JSON.parse(completedJson) as { entities: EntityDefinition[] };

				if (!entityData.entities || entityData.entities.length === 0) {
					this.effect.thought("No enriched entities were returned. Using base entities instead.");
					return;
				}

				// Merge the enriched entities with the system entities
				const mergedEntities = this.mergeEnrichedEntities(allEntities, entityData.entities);

				// Update state with the final enriched entities
				this.updateState({
					entities: mergedEntities,
					lastAction: "completed_entity_enrichment",
				});

				console.log("ENRICHED ENTITIES GENERATED:");
				console.log(`- Total entities: ${mergedEntities.length}`);
				console.log(`- Domain entities: ${mergedEntities.filter((e) => !e.isSystemEntity).length}`);
				console.log(`- System entities: ${mergedEntities.filter((e) => e.isSystemEntity).length}`);

				this.effect.thought(`Successfully enriched entities with fields and relationships.`);
			} catch (e) {
				console.error("Error parsing enriched entities:", e);
				this.effect.thought("Error parsing enriched entities. Using base entities instead.");
			}
		} catch (error) {
			console.error("Error enriching entities:", error);
			this.effect.thought("Error enriching entities with fields and relationships.");
		}
	}

	/**
	 * Merge base entities with enriched entities, preserving structure
	 */
	private mergeEnrichedEntities(baseEntities: EntityDefinition[], enrichedEntities: EntityDefinition[]): EntityDefinition[] {
		// Create maps for both case-sensitive and case-insensitive lookups
		const enrichedEntityMap = new Map<string, EntityDefinition>();
		const lowerCaseMap = new Map<string, EntityDefinition>();

		// Build both maps for efficient lookups
		enrichedEntities.forEach((entity) => {
			if (entity && entity.name) {
				enrichedEntityMap.set(entity.name, entity);
				lowerCaseMap.set(entity.name.toLowerCase(), entity);
			}
		});

		// Start with base entities and update them with enriched data
		return baseEntities.map((baseEntity) => {
			// Don't modify system entities from imported entities
			if (baseEntity.isSystemEntity) {
				return baseEntity;
			}

			// First try exact match
			let enrichedEntity = enrichedEntityMap.get(baseEntity.name);

			// If no exact match, try case-insensitive match
			if (!enrichedEntity) {
				enrichedEntity = lowerCaseMap.get(baseEntity.name.toLowerCase());
			}

			if (enrichedEntity && enrichedEntity.fields) {
				// Process relationship fields to ensure correct entity name casing
				const processedFields = enrichedEntity.fields.map((field) => {
					if (field && field.is_relation && field.type) {
						// Try to find the matching entity with correct casing
						const lowerTypeName = field.type.toLowerCase();
						const baseEntityMatch = baseEntities.find((e) => e.name && e.name.toLowerCase() === lowerTypeName);

						if (baseEntityMatch) {
							return {
								...field,
								type: baseEntityMatch.name, // Use the case from the base entity
							};
						}
					}
					return field;
				});

				// Keep the base entity details but use the enriched fields
				return {
					...baseEntity,
					// Update description if the enriched one is more detailed
					description: enrichedEntity.description && enrichedEntity.description.length > baseEntity.description.length ? enrichedEntity.description : baseEntity.description,
					// Preserve the original emoji if it exists, otherwise use the enriched one
					emoji: baseEntity.emoji || enrichedEntity.emoji || this.getDefaultEmoji(baseEntity.name),
					// Use enriched fields with processed relationships
					fields: processedFields || [],
				};
			}

			// If no enriched version exists, return the base entity
			return baseEntity;
		});
	}

	/**
	 * Assign colors to entities from the color palette
	 */
	private assignColorsToEntities(): void {
		const state = this.getState();
		const entities = state.entities || [];

		// If we don't have a color palette or entities, we can't assign colors
		if (!state.colorPalette || !state.colorPalette.entity_colors || entities.length === 0) {
			return;
		}

		const colors = state.colorPalette.entity_colors;
		const entityColorMap: Record<string, any> = {};

		const getColorIndexFromName = (name: string): number => {
			// Simple but consistent hash
			const hash = name.split("").reduce((acc, char, i) => {
				// Use position in string as a multiplier for more distribution
				return acc + char.charCodeAt(0) * (i + 1);
			}, 0);

			return hash % colors.length;
		};

		// Assign colors to entities based on the deterministic hash of their name
		for (const entity of entities) {
			const colorIndex = getColorIndexFromName(entity.name);
			entityColorMap[entity.name] = colors[colorIndex];
		}

		// Update the state with entity colors
		this.updateState({
			entity_color_map: entityColorMap,
		});

		console.log("ASSIGNED COLORS TO ENTITIES");
	}

	/**
	 * Generate a human-readable label from a camelCase name
	 */
	private generateLabelFromName(name: string): string {
		// Convert camelCase to Title Case with spaces
		return (name
            // Insert a space before all capital letters
            .replace(/([A-Z])/g, " $1")
            // Capitalize the first letter
            .replace(/^./, (str) => str.toUpperCase())
            // Handle cases where the first word is all lowercase
            .trim());
	}

	/**
	 * Get a default emoji based on entity name if none was provided
	 */
	private getDefaultEmoji(entityName: string): string {
		if (!entityName) {
			return "📦"; // Default emoji if no entity name is provided
		}

		const entityNameLower = entityName.toLowerCase();

		// Common entities and their emojis
		const emojiMap: Record<string, string> = {
			user: "👤",
			profile: "👤",
			customer: "🧑",
			admin: "👮",
			product: "📦",
			item: "📦",
			order: "🛒",
			cart: "🛒",
			payment: "💳",
			transaction: "💰",
			task: "✅",
			todo: "📝",
			note: "📝",
			post: "📄",
			article: "📰",
			blog: "📰",
			comment: "💬",
			message: "💬",
			notification: "🔔",
			event: "📅",
			appointment: "🗓️",
			category: "🏷️",
			tag: "🔖",
			location: "📍",
			address: "🏠",
			file: "📁",
			document: "📄",
			image: "🖼️",
			photo: "📷",
			video: "🎥",
			review: "⭐",
			rating: "⭐",
			project: "📊",
			invoice: "🧾",
			settings: "⚙️",
			subscription: "🔄",
			group: "👥",
			team: "👥",
			device: "📱",
			service: "🔧",
		};

		// Try to find a matching entity
		for (const [key, emoji] of Object.entries(emojiMap)) {
			if (entityNameLower.includes(key)) {
				return emoji;
			}
		}

		// Default emojis based on first letter
		const defaultEmojis = ["🔹", "📌", "🔍", "📋", "🏷️", "📦", "🧩"];
		return defaultEmojis[entityName.charCodeAt(0) % defaultEmojis.length] || "📦";
	}

	/**
	 * Step 4: Define the State Machines for Entities
	 * This includes:
	 * - States definition
	 * - Transitions definition
	 * - Transition guards
	 */
	private async defineStateMachines(): Promise<void> {
		this.effect.thought("Step 4: Defining state machines for entities...");
		this.updateState({
			currentStep: "state_machines",
			lastAction: "start_state_machines",
		});

		console.log("DEFINING STATE MACHINES");

		try {
			// Generate state machines for entities that would benefit from them
			await this.generateEntityStateMachines();

			this.effect.thought("State machines defined successfully!");
		} catch (error) {
			console.error("Error defining state machines:", error);
			this.updateState({
				lastAction: "error_defining_state_machines",
			});
			this.effect.thought("Error defining state machines!");
		}
	}

	/**
	 * Generate state machines for entities that would benefit from them
	 */
	private async generateEntityStateMachines(): Promise<void> {
		this.effect.thought("Identifying entities that would benefit from state machines and creating appropriate states and transitions...");

		const openai = createOpenAIClient();
		const enc = encoding_for_model("gpt-4.1-mini");

		const state = this.getState();
		const projectBrief = state.projectBrief || "";
		const appDescription = state.appDescription || "";
		const entities = state.entities || [];

		// Only use domain entities (not system entities) for state machines
		const domainEntities = entities.filter((entity) => !entity.isSystemEntity);

		if (domainEntities.length === 0) {
			this.effect.thought("No domain entities found to create state machines for.");
			this.updateState({
				stateMachines: [],
				lastAction: "no_entities_for_state_machines",
			});
			return;
		}

		const systemMessage = `You are an expert in state machine design and domain modeling. Your task is to identify which entities in a domain model would benefit from having a state machine, and define the states and transitions for those entities.`;

		const prompt = `
Based on the application description and entities provided, identify which entities would benefit from having a state machine, and define the appropriate states and transitions.

APPLICATION BRIEF:
"""
${projectBrief}

${appDescription}
"""

DOMAIN ENTITIES:
"""
${JSON.stringify(domainEntities, null, 2)}
"""

INSTRUCTIONS:
1. Analyze the domain entities and identify which would benefit from having a state machine
   - Entities with a clear lifecycle (Order, Task, Project, etc.)
   - Entities that transition between well-defined states
   - Entities where state transitions trigger important business logic

2. For each identified entity, define:
   - A comprehensive set of states representing all possible situations in the entity lifecycle
   - Transitions between states, with clear names describing the action
   - Which transitions are valid from which states
   - Guards describing conditions required for transitions (optional)

3. Only create state machines for entities that truly need them
   - Not all entities require state machines
   - Focus on entities where state transitions are a core part of the domain logic
   - The typical entities that benefit from state machines include: orders, workflows, tasks, projects, subscriptions, etc.

4. For each state machine:
   - Start states should represent an entity's initial state after creation
   - End states should represent terminal states where no further transitions are possible (completed, canceled, etc.)
   - The state diagram should be comprehensive, covering all edge cases

IMPORTANT:
- Only reference entities and fields that exist in the provided domain entities
- Make sure transition names are clear and follow common naming conventions (e.g., "approve", "reject", "complete")
- For transition guards, describe business rules that govern when a transition is allowed
- Number of states should typically be between 3-7 for most entities (not too simple, not too complex)

Return the state machines in this JSON format:
{
  "stateMachines": [
    {
      "entityName": "order", 
      "states": [
        {
          "name": "pending",
          "description": "Order has been created but not yet confirmed"
        },
        {
          "name": "confirmed",
          "description": "Order has been confirmed but not yet shipped"
        },
        // Additional states...
      ],
      "transitions": [
        {
          "name": "confirm",
          "from": "pending",
          "to": "confirmed",
          "description": "Confirm the order",
          "guard": "Order must have valid payment information" // optional
        },
        // Additional transitions...
      ]
    },
    // Additional state machines for other entities...
  ]
}

Return ONLY the JSON object with no additional text.`;

		const inputTokens = enc.encode(systemMessage).length + enc.encode(prompt).length;

		try {
			// Use streaming for a better user experience
			this.effect.thought("Identifying entities that need state machines and designing their state transitions...");

			const stream = await openai.chat.completions.create({
				model: "gpt-4.1-mini",
				messages: [
					{ role: "system", content: systemMessage },
					{ role: "user", content: prompt },
				],
				temperature: 0.5,
				response_format: { type: "json_object" },
				stream: true,
			});

			let messageContent = "";
			let lastUpdateTime = Date.now();
			const updateInterval = 150; // Update every 150ms for more dynamic updates

			// Process the streaming response
			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content || "";
				messageContent += content;

				// Update the UI periodically to show progress
				const currentTime = Date.now();
				if (currentTime - lastUpdateTime > updateInterval) {
					lastUpdateTime = currentTime;

					// Try to parse partial results for display
					try {
						// Make sure we have a valid JSON structure to work with
						if (messageContent.includes("{") && messageContent.includes('"stateMachines"')) {
							// Apply jsonrepair to handle incomplete JSON
							const completedJson = this.tryCompleteJson(messageContent);

							try {
								const partialData = JSON.parse(completedJson) as { stateMachines: EntityStateMachine[] };

								if (partialData.stateMachines && partialData.stateMachines.length > 0) {
									// Validate the state machines even during streaming
									const validatedStateMachines = this.validateStateMachines(partialData.stateMachines, domainEntities);

									// Update the state with current progress
									this.updateState({
										stateMachines: validatedStateMachines,
										lastAction: "generating_state_machines_in_progress",
									});

									this.effect.thought(`Designing state machines: ${validatedStateMachines.length} identified so far...`);
								}
							} catch (parseError) {
								// If parsing fails even after repair, continue silently
								console.log("Parse error after repair:", parseError);
							}
						}
					} catch (e) {
						// Silently ignore repair errors during streaming
						console.log("JSON repair error:", e);
					}
				}
			}

			const outputTokens = enc.encode(messageContent).length;

			// Free the encoder
			enc.free();
			this.record_token_usage(inputTokens, outputTokens, "gpt-4.1-mini");

			try {
				const completedJson = this.tryCompleteJson(messageContent);
				const stateMachineData = JSON.parse(completedJson) as { stateMachines: EntityStateMachine[] };

				if (!stateMachineData.stateMachines || stateMachineData.stateMachines.length === 0) {
					this.effect.thought("No state machines were generated. This may be appropriate if entities don't have clear lifecycle states.");
					this.updateState({
						stateMachines: [],
						lastAction: "no_state_machines_needed",
					});
					return;
				}

				// Validate and clean up the state machines
				const validatedStateMachines = this.validateStateMachines(stateMachineData.stateMachines, domainEntities);

				console.log("GENERATED STATE MACHINES:", validatedStateMachines.length);
				validatedStateMachines.forEach((sm) => {
					console.log(`- Entity: ${sm.entityName}, States: ${sm.states.length}, Transitions: ${sm.transitions.length}`);
				});

				// Update state with the state machines
				this.updateState({
					stateMachines: validatedStateMachines,
					lastAction: "completed_state_machines",
				});

				this.effect.thought(`Generated ${validatedStateMachines.length} state machines for appropriate entities.`);
			} catch (e) {
				console.error("Error parsing state machine definitions:", e);
				this.effect.thought("Error parsing state machine definitions. No state machines will be created.");
				this.updateState({
					stateMachines: [],
					lastAction: "error_parsing_state_machines",
				});
			}
		} catch (error) {
			console.error("Error generating state machines:", error);
			this.effect.thought("Error generating state machines.");
			this.updateState({
				stateMachines: [],
				lastAction: "error_generating_state_machines",
			});
		}
	}

	/**
	 * Validate and clean up state machines to ensure they reference valid entities and have proper structure
	 */
	private validateStateMachines(stateMachines: EntityStateMachine[], entities: EntityDefinition[]): EntityStateMachine[] {
		// Create a map of valid entity names for quick lookup
		const validEntityNames = new Set(entities.map((e) => e.name));

		// Filter out state machines for entities that don't exist
		const validStateMachines = stateMachines.filter((sm) => validEntityNames.has(sm.entityName));

		// For each state machine, ensure it has at least one initial state
		return validStateMachines.map((sm) => {
			// If no initial state is marked, mark the first state as initial
			if (!sm.states.some((s) => s.isInitial)) {
				if (sm.states.length > 0) {
					sm.states[0] = { ...sm.states[0], isInitial: true };
				}
			}

			// Ensure transitions reference valid states
			const stateNames = new Set(sm.states.map((s) => s.name));
			const validTransitions = sm.transitions.filter((t) => stateNames.has(t.from) && stateNames.has(t.to));

			// Return the validated state machine
			return {
				...sm,
				transitions: validTransitions,
			};
		});
	}

	/**
	 * Step 5: Define Actions for the application
	 * This includes:
	 * - CRUD operations
	 * - State machine operations
	 * - Event-driven actions
	 */
	private async defineActions(): Promise<void> {
		this.effect.thought("Step 5: Defining application actions...");
		this.updateState({
			currentStep: "actions",
			lastAction: "start_actions",
		});

		console.log("DEFINING ACTIONS");

		try {
			// Generate actions for entities and state machines
			await this.generateEntityActions();

			this.effect.thought("Actions defined successfully!");
		} catch (error) {
			console.error("Error defining actions:", error);
			this.updateState({
				lastAction: "error_defining_actions",
			});
			this.effect.thought("Error defining actions!");
		}
	}

	/**
	 * Generate actions for entities and state machines
	 */
	private async generateEntityActions(): Promise<void> {
		this.effect.thought("Generating actions for entities and state machines...");

		const openai = createOpenAIClient();
		const enc = encoding_for_model("gpt-4.1-mini");

		const state = this.getState();
		const projectBrief = state.projectBrief || "";
		const appDescription = state.appDescription || "";
		const entities = state.entities || [];
		const stateMachines = state.stateMachines || [];

		// Only use domain entities (not system entities) for automatic action generation
		const domainEntities = entities.filter((entity) => !entity.isSystemEntity);

		if (domainEntities.length === 0) {
			this.effect.thought("No domain entities found to create actions for.");
			this.updateState({
				actions: [],
				lastAction: "no_entities_for_actions",
			});
			return;
		}

		// Generate basic CRUD actions for all domain entities as a starting point
		const crudActions = this.generateBasicCrudActions(domainEntities);

		// If we have state machines, generate state machine-related actions
		let stateMachineActions: ActionDefinition[] = [];
		if (stateMachines.length > 0) {
			stateMachineActions = this.generateStateMachineActions(stateMachines);
		}

		// Combine the basic actions with any customized actions we'll generate with the LLM
		const basicActions = [...crudActions, ...stateMachineActions];

		// Update state with basic actions first so the user sees something quickly
		this.updateState({
			actions: basicActions,
			lastAction: "generated_basic_actions",
		});

		console.log("GENERATED BASIC ACTIONS:", basicActions.length);
		console.log(`- CRUD actions: ${crudActions.length}`);
		console.log(`- State machine actions: ${stateMachineActions.length}`);

		// Now generate custom domain-specific actions using the LLM
		const systemMessage = `You are an expert in application design and domain modeling. Your task is to identify domain-specific actions that would be valuable in the application beyond basic CRUD operations.`;

		const prompt = `
Based on the application description, entities, and state machines provided, identify domain-specific actions that would be valuable for the application.

APPLICATION BRIEF:
"""
${projectBrief}

${appDescription}
"""

DOMAIN ENTITIES:
"""
${JSON.stringify(domainEntities, null, 2)}
"""

STATE MACHINES:
"""
${JSON.stringify(stateMachines, null, 2)}
"""

EXISTING BASIC ACTIONS:
"""
${JSON.stringify(basicActions, null, 2)}
"""

INSTRUCTIONS:
1. Analyze the domain and identify actions that are specific to the business domain
2. Focus on actions that go beyond basic CRUD (which are already generated)
3. Consider:
   - Batch operations (e.g., "assignMultiple", "exportAll")
   - Calculations or analytics (e.g., "calculateTotal", "generateReport")
   - Domain-specific processes (e.g., "placeOrder", "approveApplication")
   - Complex workflows that include multiple steps
   - Business rules enforcement
4. For each action, define:
   - A clear name that describes the action
   - The type of action (use "update" for most custom business actions)
   - A detailed description
   - The entity it applies to
   - Any input parameters needed

Return your response in the following JSON format:
{
  "actions": [
    {
      "name": "actionName",
      "type": "create|read|update|delete|reach_state|on_state_change",
      "description": "Description of what the action does",
      "entityName": "entityName",
      "targetState": "targetStateName",  // Only for "reach_state" actions
      "sourceState": "sourceStateName",  // Only for "on_state_change" actions
      "parameters": [
        {
          "name": "parameterName",
          "type": "string|number|boolean|date",
          "description": "Description of the parameter",
          "required": true|false
        }
      ]
    }
  ]
}

Return ONLY the JSON object with no additional text.`;

		const inputTokens = enc.encode(systemMessage).length + enc.encode(prompt).length;

		try {
			// Use non-streaming for better JSON handling
			const response = await openai.chat.completions.create({
				model: "gpt-4.1-mini",
				messages: [
					{ role: "system", content: systemMessage },
					{ role: "user", content: prompt },
				],
				temperature: 0.7,
				response_format: { type: "json_object" },
			});

			const content = response.choices[0]?.message?.content || "";
			const outputTokens = enc.encode(content).length;

			// Free the encoder
			enc.free();
			this.record_token_usage(inputTokens, outputTokens, "gpt-4.1-mini");

			try {
				const customActionData = JSON.parse(content) as { actions: ActionDefinition[] };

				if (!customActionData.actions || customActionData.actions.length === 0) {
					this.effect.thought("No custom actions were generated. Using basic CRUD and state machine actions.");
					return; // We already updated the state with basic actions
				}

				// Validate and clean up the custom actions
				const validatedCustomActions = this.validateCustomActions(customActionData.actions, domainEntities, stateMachines);

				// Combine basic actions with custom actions
				const allActions = [...basicActions, ...validatedCustomActions];

				console.log("ADDED CUSTOM ACTIONS:", validatedCustomActions.length);
				console.log("TOTAL ACTIONS:", allActions.length);

				// Update state with all actions
				this.updateState({
					actions: allActions,
					lastAction: "completed_actions",
				});

				this.effect.thought(`Generated ${allActions.length} actions (${basicActions.length} basic + ${validatedCustomActions.length} custom).`);
			} catch (e) {
				console.error("Error parsing custom action definitions:", e);
				this.effect.thought("Error parsing custom action definitions. Using basic actions only.");
				// We already updated the state with basic actions, so no need to update again
			}
		} catch (error) {
			console.error("Error generating custom actions:", error);
			this.effect.thought("Error generating custom actions. Using basic actions only.");
			// We already updated the state with basic actions, so no need to update again
		}
	}

	/**
	 * Generate basic CRUD actions for all domain entities
	 */
	private generateBasicCrudActions(entities: EntityDefinition[]): ActionDefinition[] {
		const actions: ActionDefinition[] = [];

		// For each entity, create standard CRUD operations
		entities.forEach((entity) => {
			// Create
			actions.push({
				name: `create${this.capitalizeFirstLetter(entity.name)}`,
				type: "create",
				description: `Create a new ${entity.label}`,
				entityName: entity.name,
				parameters: entity.fields
					.filter((field) => !field.is_relation && field.required) // Only include required non-relation fields as parameters
					.map((field) => ({
						name: field.name,
						type: field.type,
						description: field.description || `The ${field.label || field.name} of the ${entity.label}`,
						required: field.required,
					})),
			});

			// Read (Get by ID)
			actions.push({
				name: `get${this.capitalizeFirstLetter(entity.name)}`,
				type: "read",
				description: `Get a specific ${entity.label} by ID`,
				entityName: entity.name,
				parameters: [
					{
						name: "id",
						type: "string",
						description: `The ID of the ${entity.label} to retrieve`,
						required: true,
					},
				],
			});

			// Read (List all)
			// Fix: Use the entity.label safely by providing a fallback string
			const entityLabel = entity.label || this.capitalizeFirstLetter(entity.name);
			actions.push({
				name: `list${this.pluralize(this.capitalizeFirstLetter(entity.name))}`,
				type: "read",
				description: `List all ${this.pluralize(entityLabel)}`,
				entityName: entity.name,
				parameters: [
					{
						name: "limit",
						type: "number",
						description: "Maximum number of items to return",
						required: false,
					},
					{
						name: "offset",
						type: "number",
						description: "Number of items to skip",
						required: false,
					},
				],
			});

			// Update
			actions.push({
				name: `update${this.capitalizeFirstLetter(entity.name)}`,
				type: "update",
				description: `Update an existing ${entity.label}`,
				entityName: entity.name,
				parameters: [
					{
						name: "id",
						type: "string",
						description: `The ID of the ${entity.label} to update`,
						required: true,
					},
					...entity.fields
						.filter((field) => !field.is_relation) // Only include non-relation fields as parameters
						.map((field) => ({
							name: field.name,
							type: field.type,
							description: field.description || `The ${field.label || field.name} of the ${entity.label}`,
							required: false,
						})),
				],
			});

			// Delete
			actions.push({
				name: `delete${this.capitalizeFirstLetter(entity.name)}`,
				type: "delete",
				description: `Delete a ${entity.label}`,
				entityName: entity.name,
				parameters: [
					{
						name: "id",
						type: "string",
						description: `The ID of the ${entity.label} to delete`,
						required: true,
					},
				],
			});
		});

		return actions;
	}

	/**
	 * Generate actions for state machine transitions
	 */
	private generateStateMachineActions(stateMachines: EntityStateMachine[]): ActionDefinition[] {
		const actions: ActionDefinition[] = [];

		// For each state machine, create actions for transitions
		stateMachines.forEach((stateMachine) => {
			// Get entity name in proper case for display
			const entityName = stateMachine.entityName;

			// For each transition, create a "reach state" action
			stateMachine.transitions.forEach((transition) => {
				const actionName = this.transitionNameToActionName(transition.name, entityName);

				actions.push({
					name: actionName,
					type: "reach_state",
					description: transition.description || `Change ${entityName} state from ${transition.from} to ${transition.to}`,
					entityName: entityName,
					targetState: transition.to,
					parameters: [
						{
							name: "id",
							type: "string",
							description: `The ID of the ${entityName} to transition`,
							required: true,
						},
					],
				});
			});

			// For each non-initial state, create an on_state_change action that could trigger other processes
			stateMachine.states
				.filter((state) => !state.isInitial)
				.forEach((state) => {
					actions.push({
						name: `on${this.capitalizeFirstLetter(entityName)}${this.capitalizeFirstLetter(state.name)}`,
						type: "on_state_change",
						description: `Triggered when a ${entityName} enters the ${state.name} state`,
						entityName: entityName,
						sourceState: state.name,
						parameters: [],
					});
				});
		});

		return actions;
	}

	/**
	 * Validate custom actions to ensure they reference valid entities and states
	 */
	private validateCustomActions(actions: ActionDefinition[], entities: EntityDefinition[], stateMachines: EntityStateMachine[]): ActionDefinition[] {
		// Create maps for quick lookups
		const validEntityNames = new Set(entities.map((e) => e.name));
		const entityStateMap = new Map<string, Set<string>>();

		// Build a map of entity names to their valid states
		stateMachines.forEach((sm) => {
			entityStateMap.set(sm.entityName, new Set(sm.states.map((s) => s.name)));
		});

		// Filter and validate actions
		return actions.filter((action) => {
			// Make sure the entity exists
			if (!validEntityNames.has(action.entityName)) {
				return false;
			}

			// For state-related actions, validate state references
			if (action.type === "reach_state" || action.type === "on_state_change") {
				const entityStates = entityStateMap.get(action.entityName);

				// If this entity has no state machine, reject state-related actions
				if (!entityStates) {
					return false;
				}

				// Validate target state for reach_state actions
				if (action.type === "reach_state" && action.targetState) {
					if (!entityStates.has(action.targetState)) {
						return false;
					}
				}

				// Validate source state for on_state_change actions
				if (action.type === "on_state_change" && action.sourceState) {
					if (!entityStates.has(action.sourceState)) {
						return false;
					}
				}
			}

			// Action passes validation
			return true;
		});
	}

	/**
	 * Convert a transition name to an action name
	 */
	private transitionNameToActionName(transitionName: string, entityName: string): string {
		// First make camel case
		const camelCaseTransition = transitionName.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""));

		// Then ensure first letter is lowercase (for camelCase)
		const lowerCamelCase = camelCaseTransition.charAt(0).toLowerCase() + camelCaseTransition.slice(1);

		// Combine with entity name (capitalized)
		return `${lowerCamelCase}${this.capitalizeFirstLetter(entityName)}`;
	}

	/**
	 * Capitalize the first letter of a string
	 */
	private capitalizeFirstLetter(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	/**
	 * Simple pluralization for English words
	 */
	private pluralize(word: string): string {
		if (word.endsWith("y")) {
			return word.slice(0, -1) + "ies";
		} else if (word.endsWith("s") || word.endsWith("x") || word.endsWith("z") || word.endsWith("ch") || word.endsWith("sh")) {
			return word + "es";
		} else {
			return word + "s";
		}
	}

	/**
	 * Step 6: Define Application Navigation
	 * This includes:
	 * - Pages/routes definition
	 * - Navigation structure (sidebar, topbar, etc.)
	 */
	private async defineNavigation(): Promise<void> {
		this.effect.thought("Step 6: Defining application navigation...");
		this.updateState({
			currentStep: "navigation",
			lastAction: "start_navigation",
		});

		console.log("DEFINING NAVIGATION");

		try {
			// Generate pages and navigation structure
			await this.generatePages();
			await this.generateNavigationStructure();

			this.effect.thought("Navigation defined successfully!");
		} catch (error) {
			console.error("Error defining navigation:", error);
			this.updateState({
				lastAction: "error_defining_navigation",
			});
			this.effect.thought("Error defining navigation!");
		}
	}

	/**
	 * Generate pages/routes for the application
	 */
	private async generatePages(): Promise<void> {
		this.effect.thought("Generating application pages and routes...");

		const openai = createOpenAIClient();
		const enc = encoding_for_model("gpt-4.1-mini");

		const state = this.getState();
		const projectBrief = state.projectBrief || "";
		const appDescription = state.appDescription || "";
		const entities = state.entities || [];
		const actions = state.actions || [];

		// Only use domain entities (not system entities) for pages
		const domainEntities = entities.filter((entity) => !entity.isSystemEntity);

		if (domainEntities.length === 0) {
			this.effect.thought("No domain entities found to create pages for.");
			this.updateState({
				pages: [],
				lastAction: "no_entities_for_pages",
			});
			return;
		}

		// Create basic pages for all entities (list, detail, create, edit)
		const basicPages = this.generateBasicEntityPages(domainEntities);

		// Create standard application pages
		const standardPages = this.generateStandardPages();

		// Combine all basic pages
		const allBasicPages = [...standardPages, ...basicPages];

		// Update state with basic pages first
		this.updateState({
			pages: allBasicPages,
			lastAction: "generated_basic_pages",
		});

		console.log("GENERATED BASIC PAGES:", allBasicPages.length);
		console.log(`- Standard pages: ${standardPages.length}`);
		console.log(`- Entity pages: ${basicPages.length}`);

		// Now generate custom domain-specific pages using the LLM
		const systemMessage = `You are an expert in application user experience and information architecture. Your task is to identify domain-specific pages and views that would improve the application beyond the basic CRUD screens.`;

		const prompt = `
Based on the application description, entities, and actions provided, identify domain-specific pages that would enhance the user experience.

APPLICATION BRIEF:
"""
${projectBrief}

${appDescription}
"""

DOMAIN ENTITIES:
"""
${JSON.stringify(domainEntities, null, 2)}
"""

ACTIONS:
"""
${JSON.stringify(actions, null, 2)}
"""

EXISTING BASIC PAGES:
"""
${JSON.stringify(allBasicPages, null, 2)}
"""

INSTRUCTIONS:
1. Analyze the domain and identify pages that would enhance the user experience beyond basic CRUD screens
2. Focus on:
   - Dashboard/analytics pages
   - Reporting views
   - Multi-entity workflows
   - Domain-specific landing pages
   - Search/filter interfaces
   - Specialized visualization pages
3. For each page, define:
   - A unique route name
   - A user-friendly title
   - A clear description of what the page shows and what the user can do there
   - The path in the application where the page would be accessible
   - A parent page if it's a child of another page

Return your response in the following JSON format:
{
  "pages": [
    {
      "name": "pageName",
      "path": "/path/to/page",
      "title": "User-friendly Page Title",
      "description": "Detailed description of what this page shows and what the user can do here",
      "parentPage": "parentPageName" // Optional, only if this is a sub-page
    }
  ]
}

Return ONLY the JSON object with no additional text.`;

		const inputTokens = enc.encode(systemMessage).length + enc.encode(prompt).length;

		try {
			// Use non-streaming for better JSON handling
			const response = await openai.chat.completions.create({
				model: "gpt-4.1-mini",
				messages: [
					{ role: "system", content: systemMessage },
					{ role: "user", content: prompt },
				],
				temperature: 0.7,
				response_format: { type: "json_object" },
			});

			const content = response.choices[0]?.message?.content || "";
			const outputTokens = enc.encode(content).length;

			// Free the encoder
			enc.free();
			this.record_token_usage(inputTokens, outputTokens, "gpt-4.1-mini");

			try {
				const customPagesData = JSON.parse(content) as { pages: PageDefinition[] };

				if (!customPagesData.pages || customPagesData.pages.length === 0) {
					this.effect.thought("No custom pages were generated. Using basic pages only.");
					return; // We already updated the state with basic pages
				}

				// Validate and clean up the custom pages
				const validatedCustomPages = this.validateCustomPages(customPagesData.pages, allBasicPages);

				// Combine basic pages with custom pages
				const allPages = [...allBasicPages, ...validatedCustomPages];

				console.log("ADDED CUSTOM PAGES:", validatedCustomPages.length);
				console.log("TOTAL PAGES:", allPages.length);

				// Update state with all pages
				this.updateState({
					pages: allPages,
					lastAction: "completed_pages",
				});

				this.effect.thought(`Generated ${allPages.length} pages (${allBasicPages.length} basic + ${validatedCustomPages.length} custom).`);
			} catch (e) {
				console.error("Error parsing custom page definitions:", e);
				this.effect.thought("Error parsing custom page definitions. Using basic pages only.");
				// We already updated the state with basic pages, so no need to update again
			}
		} catch (error) {
			console.error("Error generating custom pages:", error);
			this.effect.thought("Error generating custom pages. Using basic pages only.");
			// We already updated the state with basic pages, so no need to update again
		}
	}

	/**
	 * Generate standard application pages (home, settings, etc.)
	 */
	private generateStandardPages(): PageDefinition[] {
		return [
			{
				name: "home",
				path: "/",
				title: "Home",
				description: "Application home page with overview and quick actions",
			},
			{
				name: "dashboard",
				path: "/dashboard",
				title: "Dashboard",
				description: "Application dashboard with key metrics and insights",
			},
			{
				name: "settings",
				path: "/settings",
				title: "Settings",
				description: "Application settings and preferences",
			},
			{
				name: "profile",
				path: "/profile",
				title: "User Profile",
				description: "User profile management page",
			},
		];
	}

	/**
	 * Generate basic pages for all domain entities (list, detail, create, edit)
	 */
	private generateBasicEntityPages(entities: EntityDefinition[]): PageDefinition[] {
		const pages: PageDefinition[] = [];

		// For each entity, create standard pages
		entities.forEach((entity) => {
			const entityNamePlural = this.pluralize(entity.name);
			const entityLabelPlural = this.pluralize(entity.label || this.capitalizeFirstLetter(entity.name));

			// List page
			pages.push({
				name: `${entityNamePlural}List`,
				path: `/${entityNamePlural}`,
				title: `${entityLabelPlural}`,
				description: `List view of all ${entityLabelPlural} with filtering and sorting options`,
			});

			// Detail page
			pages.push({
				name: `${entity.name}Detail`,
				path: `/${entityNamePlural}/:id`,
				title: `${entity.label || this.capitalizeFirstLetter(entity.name)} Details`,
				description: `Detailed view of a specific ${entity.label || this.capitalizeFirstLetter(entity.name)} with all properties and related items`,
				parentPage: `${entityNamePlural}List`,
			});

			// Create page
			pages.push({
				name: `${entity.name}Create`,
				path: `/${entityNamePlural}/create`,
				title: `Create ${entity.label || this.capitalizeFirstLetter(entity.name)}`,
				description: `Form to create a new ${entity.label || this.capitalizeFirstLetter(entity.name)}`,
				parentPage: `${entityNamePlural}List`,
			});

			// Edit page
			pages.push({
				name: `${entity.name}Edit`,
				path: `/${entityNamePlural}/:id/edit`,
				title: `Edit ${entity.label || this.capitalizeFirstLetter(entity.name)}`,
				description: `Form to edit an existing ${entity.label || this.capitalizeFirstLetter(entity.name)}`,
				parentPage: `${entity.name}Detail`,
			});
		});

		return pages;
	}

	/**
	 * Validate custom pages to ensure they have unique paths and names
	 */
	private validateCustomPages(customPages: PageDefinition[], existingPages: PageDefinition[]): PageDefinition[] {
		// Create sets of existing page names and paths for quick lookup
		const existingNames = new Set(existingPages.map((p) => p.name));
		const existingPaths = new Set(existingPages.map((p) => p.path.split(":")[0])); // Strip dynamic path segments for comparison

		// Filter out pages with duplicate names or paths
		return customPages.filter((page) => {
			// Check for name uniqueness
			if (existingNames.has(page.name)) {
				console.log(`Skipping page with duplicate name: ${page.name}`);
				return false;
			}

			// Check for path uniqueness (ignoring dynamic segments)
			const basePath = page.path.split(":")[0];
			if (existingPaths.has(basePath)) {
				console.log(`Skipping page with duplicate path: ${page.path}`);
				return false;
			}

			// If parent page is specified, ensure it exists
			if (page.parentPage && !existingNames.has(page.parentPage)) {
				console.log(`Skipping page with non-existent parent: ${page.parentPage}`);
				return false;
			}

			// Page passes validation
			return true;
		});
	}

	/**
	 * Generate navigation structure (sidebar, topbar, etc.)
	 */
	private async generateNavigationStructure(): Promise<void> {
		this.effect.thought("Generating application navigation structure...");

		const state = this.getState();
		const pages = state.pages || [];

		if (pages.length === 0) {
			this.effect.thought("No pages found to create navigation for.");
			this.updateState({
				navigation: {
					type: "sidebar",
					items: [],
				},
				lastAction: "no_pages_for_navigation",
			});
			return;
		}

		// Create a sidebar navigation with top-level pages
		// Only include pages that don't have a parent (they are top-level)
		const topLevelPages = pages.filter((page) => !page.parentPage);

		// Generate navigation items from top-level pages
		const navigationItems = topLevelPages.map((page) => {
			return {
				pageName: page.name,
				icon: this.getIconForPage(page.name, page.title),
			};
		});

		// Create the navigation structure
		const navigationStructure: NavigationDefinition = {
			type: "sidebar",
			items: navigationItems,
		};

		// Update state with the navigation structure
		this.updateState({
			navigation: navigationStructure,
			lastAction: "completed_navigation",
		});

		console.log("GENERATED NAVIGATION STRUCTURE");
		console.log(`- Type: ${navigationStructure.type}`);
		console.log(`- Items: ${navigationStructure.items.length}`);

		this.effect.thought("Generated application navigation structure with sidebar and top-level menu items.");
	}

	/**
	 * Get an appropriate icon for a page based on its name or title
	 */
	private getIconForPage(pageName: string, pageTitle: string): string {
		// Common page names and their icons
		const iconMap: Record<string, string> = {
			// Standard pages
			home: "🏠",
			dashboard: "📊",
			settings: "⚙️",
			profile: "👤",

			// Entity related
			list: "📋",
			create: "➕",
			edit: "✏️",
			detail: "🔍",

			// Other common page types
			search: "🔎",
			analytics: "📈",
			reports: "📑",
			calendar: "📅",
			notifications: "🔔",
			messages: "💬",
			users: "👥",
		};

		// Check if the page name contains any key from the iconMap
		for (const [key, icon] of Object.entries(iconMap)) {
			if (pageName.toLowerCase().includes(key.toLowerCase()) || pageTitle.toLowerCase().includes(key.toLowerCase())) {
				return icon;
			}
		}

		// Default icon
		return "📄";
	}

	/**
	 * Step 7: Scaffold Views for Pages
	 * Generate view components for each page
	 */
	private async scaffoldViews(): Promise<void> {
		this.effect.thought("Step 7: Scaffolding UI components for all views...");
		this.updateState({
			currentStep: "views",
			lastAction: "start_views",
		});

		console.log("SCAFFOLDING VIEWS");

		const openai = createOpenAIClient();
		const enc = encoding_for_model("gpt-4.1-mini");

		const state = this.getState();
		const projectBrief = state.projectBrief || "";
		const appDescription = state.appDescription || "";
		const entities = state.entities || [];
		const actions = state.actions || [];
		const pages = state.pages || [];
		const colorPalette = state.colorPalette || this.getDefaultColorPalette();

		if (pages.length === 0) {
			this.effect.thought("No pages found to scaffold views for.");
			this.updateState({
				views: [],
				lastAction: "no_pages_for_views",
			});
			return;
		}

		try {
			// Step 1: Create AST nodes for each page
			const views: AgentViewDefinition[] = [];
			const processedPages = new Set<string>();
			let processingCount = 0;

			// Process high-priority pages first (home, dashboard)
			const highPriorityPages = pages.filter((p) => ["home", "dashboard"].includes(p.name));
			for (const page of highPriorityPages) {
				const view = await this.generateViewForPage(page, entities, actions, colorPalette, openai, enc);
				if (view) {
					views.push(view);
					processedPages.add(page.name);
					processingCount++;

					// Update state after each high-priority page
					this.updateState({
						views,
						lastAction: `generated_view_${processingCount}`,
					});

					this.effect.thought(`Generated view for ${page.name} page.`);
				}
			}

			// Then process list pages for each entity
			const listPages = pages.filter((p) => p.name.endsWith("List") && !processedPages.has(p.name));
			for (const page of listPages) {
				const view = await this.generateViewForPage(page, entities, actions, colorPalette, openai, enc);
				if (view) {
					views.push(view);
					processedPages.add(page.name);
					processingCount++;

					// Update state periodically
					if (processingCount % 3 === 0) {
						this.updateState({
							views,
							lastAction: `generated_view_${processingCount}`,
						});
					}
				}
			}

			// Then process detail and edit pages
			const detailEditPages = pages.filter((p) => (p.name.endsWith("Detail") || p.name.endsWith("Edit") || p.name.endsWith("Create")) && !processedPages.has(p.name));
			for (const page of detailEditPages) {
				const view = await this.generateViewForPage(page, entities, actions, colorPalette, openai, enc);
				if (view) {
					views.push(view);
					processedPages.add(page.name);
					processingCount++;

					// Update state periodically
					if (processingCount % 3 === 0) {
						this.updateState({
							views,
							lastAction: `generated_view_${processingCount}`,
						});
					}
				}
			}

			// Process remaining pages
			const remainingPages = pages.filter((p) => !processedPages.has(p.name));
			for (const page of remainingPages) {
				const view = await this.generateViewForPage(page, entities, actions, colorPalette, openai, enc);
				if (view) {
					views.push(view);
					processedPages.add(page.name);
					processingCount++;

					// Update state periodically
					if (processingCount % 3 === 0) {
						this.updateState({
							views,
							lastAction: `generated_view_${processingCount}`,
						});
					}
				}
			}

			// Free the encoder when done
			enc.free();

			// Final update with all views
			this.updateState({
				views,
				lastAction: "completed_views",
			});

			console.log("VIEW SCAFFOLDING COMPLETE");
			console.log(`Total views generated: ${views.length}`);

			this.effect.thought(`Successfully scaffolded ${views.length} views for the application!`);
		} catch (error) {
			console.error("Error scaffolding views:", error);
			this.updateState({
				lastAction: "error_scaffolding_views",
			});
			this.effect.thought("Error scaffolding views! Using empty views.");
		}
	}

	/**
	 * Generate a view definition for a specific page
	 */
	private async generateViewForPage(page: PageDefinition, entities: EntityDefinition[], actions: ActionDefinition[], colorPalette: ColorPalette, openai: OpenAI, enc: Tiktoken): Promise<AgentViewDefinition | null> {
		try {
			// Find the related entity if this is an entity-specific page
			let relatedEntity: EntityDefinition | undefined;

			if (page.name.includes("List") || page.name.includes("Detail") || page.name.includes("Edit") || page.name.includes("Create")) {
				for (const entity of entities) {
					if (page.name.includes(entity.name) || page.name.includes(this.capitalizeFirstLetter(entity.name)) || page.name.includes(this.pluralize(entity.name))) {
						relatedEntity = entity;
						break;
					}
				}
			}

			// Determine the type of view to generate
			const viewType = this.determineViewType(page.name);

			// Construct a prompt based on the page and view type
			const systemMessage = `You are an expert UI designer with deep knowledge of frontend development and web applications. Your task is to design a detailed view component for a specific page in an application.`;

			let prompt = `
Design a detailed UI component structure for the "${page.title}" page (${page.name}).

PAGE DETAILS:
"""
${JSON.stringify(page, null, 2)}
"""

COLOR PALETTE:
"""
${JSON.stringify(colorPalette, null, 2)}
"""

`;

			// Add related entity details if applicable
			if (relatedEntity) {
				prompt += `
RELATED ENTITY:
"""
${JSON.stringify(relatedEntity, null, 2)}
"""

`;

				// Find actions related to this entity
				const relatedActions = actions.filter((a) => a.entityName === relatedEntity?.name);
				if (relatedActions.length > 0) {
					prompt += `
RELATED ACTIONS:
"""
${JSON.stringify(relatedActions, null, 2)}
"""

`;
				}
			}

			// Add specific instructions based on the view type
			prompt += this.getViewTypeInstructions(viewType, page, relatedEntity);

			// Add the response format instructions
			prompt += `
Please respond with a JSON structure that represents the view. Follow this format:
{
  "pageName": "${page.name}",
  "layout": "A description of the overall layout structure",
  "components": [
    {
      "name": "componentName",
      "type": "header|section|form|table|card|button|etc",
      "purpose": "What this component does",
      "props": {
        "property1": "value1",
        "property2": "value2"
      },
      "styling": {
        "backgroundColor": "${colorPalette.primary.base}",
        "textColor": "${colorPalette.primary.text}",
        "padding": "16px",
        "margin": "8px"
      },
      "children": ["Optional list of child component names if applicable"]
    }
  ],
  "dataRequirements": [
    "Data needed for this view, such as entities or specific queries"
  ],
  "userInteractions": [
    "Descriptions of key interactions and their results"
  ]
}

Include at least 3-5 components for a comprehensive view structure.
`;

			const inputTokens = enc.encode(systemMessage).length + enc.encode(prompt).length;

			const response = await openai.chat.completions.create({
				model: "gpt-4.1-mini",
				messages: [
					{ role: "system", content: systemMessage },
					{ role: "user", content: prompt },
				],
				temperature: 0.7,
				response_format: { type: "json_object" },
			});

			const content = response.choices[0]?.message?.content || "{}";
			const outputTokens = enc.encode(content).length;

			this.record_token_usage(inputTokens, outputTokens, "gpt-4.1-mini");

			try {
				// Parse the response
				const viewData = JSON.parse(content) as AgentViewDefinition;

				// Add the page path if it's not already there
				if (!viewData.path) {
					viewData.path = page.path;
				}

				return viewData;
			} catch (error) {
				console.error(`Error parsing view data for ${page.name}:`, error);
				return null;
			}
		} catch (error) {
			console.error(`Error generating view for ${page.name}:`, error);
			return null;
		}
	}

	/**
	 * Determine the type of view to generate based on the page name
	 */
	private determineViewType(pageName: string): ViewType {
		if (pageName.endsWith("List")) {
			return "list";
		} else if (pageName.endsWith("Detail")) {
			return "detail";
		} else if (pageName.endsWith("Edit") || pageName.endsWith("Create")) {
			return "form";
		} else if (pageName === "dashboard") {
			return "dashboard";
		} else if (pageName === "home") {
			return "home";
		} else {
			return "generic";
		}
	}

	/**
	 * Get specific instructions for different view types
	 */
	private getViewTypeInstructions(viewType: ViewType, page: PageDefinition, entity?: EntityDefinition): string {
		switch (viewType) {
			case "list":
				return `
INSTRUCTIONS FOR LIST VIEW:
Design a paginated list/table view that shows all ${entity?.label || "items"} with:
1. A header with a title and action buttons (create new, filter, search)
2. A data table with columns for each important field
3. Pagination controls
4. Row actions (view, edit, delete)
5. Sorting and filtering options
6. Empty state handling
7. Loading state indicators
`;

			case "detail":
				return `
INSTRUCTIONS FOR DETAIL VIEW:
Design a detailed view that shows all information about a single ${entity?.label || "item"} with:
1. A header with the title and key actions (edit, delete)
2. Sections for different groups of fields
3. Related items (if applicable)
4. Breadcrumb navigation
5. Status indicators or badges
6. Actions specific to this entity
`;

			case "form":
				return `
INSTRUCTIONS FOR FORM VIEW:
Design a form to ${page.name.includes("Create") ? "create" : "edit"} a ${entity?.label || "item"} with:
1. Form fields for all important attributes
2. Validation and error handling
3. Submit and cancel buttons
4. Form sections or steps
5. Helper text and tooltips
6. Required field indicators
7. Responsive layout
`;

			case "dashboard":
				return `
INSTRUCTIONS FOR DASHBOARD VIEW:
Design a dashboard with:
1. Key metrics and KPIs as cards or charts
2. Quick action buttons for common tasks
3. Recent activity or items
4. Multiple sections for different data categories
5. Interactive elements like filters or date selectors
6. Visual data representations (charts, graphs)
`;

			case "home":
				return `
INSTRUCTIONS FOR HOME VIEW:
Design a home page with:
1. A welcome section or hero banner
2. Quick navigation to key areas
3. Overview of the application's purpose
4. Getting started guidance
5. Featured or recent content
6. Action buttons for primary user flows
`;

			default:
				return `
INSTRUCTIONS FOR GENERIC VIEW:
Design a view appropriate for this page's purpose with:
1. A clear layout structure
2. Appropriate components for the page function
3. Navigation elements
4. Action buttons
5. Responsive design considerations
`;
		}
	}

	/**
	 * Helper method to get a default color palette if none is provided
	 */
	private getDefaultColorPalette(): ColorPalette {
		return {
			primary: {
				base: "#3f51b5",
				hover: "#303f9f",
				text: "#ffffff",
			},
			secondary: {
				base: "#f50057",
				hover: "#c51162",
				text: "#ffffff",
			},
			accent: {
				base: "#ff4081",
				hover: "#f50057",
				text: "#ffffff",
			},
			entity_colors: [
				{
					background: "#e3f2fd",
					text: "#1565c0",
					border: "#bbdefb",
					darkBackground: "#1565c0",
					darkText: "#e3f2fd",
					darkBorder: "#0d47a1",
				},
				{
					background: "#e8f5e9",
					text: "#2e7d32",
					border: "#c8e6c9",
					darkBackground: "#2e7d32",
					darkText: "#e8f5e9",
					darkBorder: "#1b5e20",
				},
				{
					background: "#fff3e0",
					text: "#e65100",
					border: "#ffe0b2",
					darkBackground: "#e65100",
					darkText: "#fff3e0",
					darkBorder: "#bf360c",
				},
				{
					background: "#f3e5f5",
					text: "#6a1b9a",
					border: "#e1bee7",
					darkBackground: "#6a1b9a",
					darkText: "#f3e5f5",
					darkBorder: "#4a148c",
				},
			],
		};
	}

	/**
	 * Display the final results of the application building process
	 */
	private displayFinalResults(): void {
		const state = this.getState();

		console.log("\n\n============== APPLICATION BRIEF ==============\n");
		console.log("PROJECT BRIEF:");
		console.log(state.projectBrief || "Not generated");

		console.log("\nREQUIREMENTS:");
		console.log((state.requirements || []).join("\n"));

		console.log("\nAPPLICATION DESCRIPTION:");
		console.log(state.appDescription || "Not generated");

		console.log("\n\n============== UI THEME ==============\n");
		console.log(JSON.stringify(state.colorPalette || "Not generated", null, 2));

		console.log("\n\n============== DATA MODEL ==============\n");
		console.log(`Total Entities: ${(state.entities || []).length}`);
		console.log(`System Entities: ${(state.entities || []).filter((e) => e.isSystemEntity).length}`);
		console.log(`Domain Entities: ${(state.entities || []).filter((e) => !e.isSystemEntity).length}`);

		console.log("\n\n============== STATE MACHINES ==============\n");
		console.log(`Total State Machines: ${(state.stateMachines || []).length}`);

		console.log("\n\n============== ACTIONS ==============\n");
		console.log(`Total Actions: ${(state.actions || []).length}`);

		console.log("\n\n============== NAVIGATION ==============\n");
		console.log(`Total Pages: ${(state.pages || []).length}`);
		console.log(`Navigation Type: ${state.navigation?.type || "Not defined"}`);

		console.log("\n\n============== VIEWS ==============\n");
		console.log(`Total Views: ${(state.views || []).length}`);

		this.effect.thought("Your application has been fully designed! You can now implement it based on the comprehensive specifications.");
	}

	/**
	 * Merge an object from LLM output with the current state, handling potential
	 * circular references and null values safely
	 */
	private mergeLLMObjectWithState(statePart: string, llmObject: any): any {
		if (!llmObject) {
			const state = this.getState();
			return (state as Record<string, any>)[statePart] || null;
		}

		try {
			// Create safe copies to avoid mutation issues
			const safeLLMObject = this.safeCopy(llmObject);
			const currentState = this.getState() as Record<string, any>;
			const safeCurrentState = currentState[statePart] ? this.safeCopy(currentState[statePart]) : null;

			// If we don't have existing state, just return the LLM object
			if (!safeCurrentState) {
				return safeLLMObject;
			}

			// For arrays, we want to use the LLM's version as it's typically more complete
			if (Array.isArray(safeLLMObject) && Array.isArray(safeCurrentState)) {
				return safeLLMObject;
			}

			// For objects, we do a deep merge
			if (typeof safeLLMObject === "object" && typeof safeCurrentState === "object") {
				// Create a new object to avoid mutation
				const merged = { ...safeCurrentState };

				// Merge properties from LLM object
				for (const key in safeLLMObject) {
					if (Object.prototype.hasOwnProperty.call(safeLLMObject, key)) {
						merged[key] = safeLLMObject[key];
					}
				}

				return merged;
			}

			// For primitive values or if types don't match, use the LLM object
			return safeLLMObject;
		} catch (e) {
			console.error("Error merging LLM object with state:", e);
			// Return the original LLM object if merge fails
			return llmObject;
		}
	}
}
