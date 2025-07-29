import { createOpenAIClient, getModelName } from "../config/modelConfig";
import { encoding_for_model } from "tiktoken";
import type { OsDocument, Event } from "@joshu/os-types";
import type Os from "../os";
import { AbstractAgent, uuidv4 } from "./abstract_agent";
import { jsonrepair } from "jsonrepair";

// Define a type for field definitions
interface FieldDefinition {
	name: string;
	label?: string; // Human-readable name
	type: string; // string, number, boolean, date, etc.
	required: boolean;
	description?: string;
	is_relation?: boolean; // Indicates if this field is a relation
	is_list?: boolean; // Indicates if this is a one-to-many relation
}

// Define a type for entity definitions
interface EntityDefinition {
	name: string;
	label?: string; // Human-readable name
	description: string;
	emoji: string; // Emoji representing the entity
	fields: FieldDefinition[];
	isSystemEntity?: boolean;
}

// Define the ontology structure
interface Ontology {
	entities: EntityDefinition[];
}

// Define the state interface for our app builder agent
interface AppBuilderState {
	applicationSpecs: string;
	ontology: {
		entities: EntityDefinition[];
	};
	status: "idle" | "defining_specs" | "defining_ontology" | "generating_palette" | "completed";
	lastAction: string | null;
	userQuery?: string; // Store the initial user query
	colorPalette?: {
		primary: {
			base: string;
			hover: string;
			text: string;
		};
		secondary: {
			base: string;
			hover: string;
			text: string;
		};
		accent: {
			base: string;
			hover: string;
			text: string;
		};
		entity_colors: Array<{
			background: string;
			text: string;
			border: string;
			darkBackground: string;
			darkText: string;
			darkBorder: string;
		}>;
	} | null;
	entity_color_map?: Record<string, {
		background: string;
		text: string;
		border: string;
		darkBackground: string;
		darkText: string;
		darkBorder: string;
	}> | null;
}

export default class ApplicationBuilderAgent extends AbstractAgent<AppBuilderState> {
	private model: string = getModelName();

	constructor(os: Os, doc: OsDocument) {
		// Initialize with default state
		super(os, doc, {
			applicationSpecs: "",
			ontology: { entities: [] },
			status: "idle",
			lastAction: null,
		});

		this.effect.thought("Thinking about how to build your application...");
	}

	/**
	 * Implementation of the abstract start method
	 * @param query the query from the user
	 */
	async start(query: string): Promise<this> {
		console.log("STARTING ApplicationBuilderAgent");
		this.effect.update_pause_state(false);
		this.effect.thought("Starting application builder");
		
		this.updateState({
			userQuery: query,
			status: "defining_specs",
			applicationSpecs: "",
			ontology: { entities: [] },
			colorPalette: null,
			lastAction: "start",
		});

		this.effect.thought(
			"I'll help you build a tailor-made graph database application with rich relationships based on your specifications. First, I'll define the application specs, then generate a color palette, and finally I'll create the application ontology (data model)."
		);

		try {
			await this.defineApplicationSpecs(query);
			await this.generateColorPalette(query);
		await this.defineOntology(query);
		this.displayFinalResults();

		this.updateState({
			status: "completed",
			lastAction: "completed",
		});

		this.effect.work_done();
		} catch (e) {
			console.error("Error in ApplicationBuilderAgent", e);
			this.effect.thought(
				"I encountered an error while building your application. Please try again."
			);
		}

		return this;
	}

	/**
	 * Implementation of the abstract loop method
	 * For this agent, the loop does nothing as we only need to run the specs and ontology generation once
	 */
	async loop(): Promise<boolean> {
		// This agent doesn't need a loop as it finishes its work in the start method
		console.log("ApplicationBuilderAgent doesn't require looping - work is done in the start method");
		return false;
	}

	/**
	 * Implementation of the abstract pause method
	 */
	async pause(): Promise<void> {
		console.log("PAUSING ApplicationBuilderAgent");
		this.is_paused = true;
		this.effect.update_pause_state(true);
		this.effect.thought("Application builder paused");
	}

	/**
	 * Implementation of the abstract resume method
	 */
	async resume(): Promise<void> {
		console.log("RESUMING ApplicationBuilderAgent");
		this.is_paused = false;
		this.effect.update_pause_state(false);
		this.effect.thought("Application builder resumed");
		
		// Check if we need to continue any work
		const state = this.getState();
		
		if (state.status !== "completed") {
			this.effect.thought("Continuing application building process...");
			
			// If we've defined specs but haven't generated a color palette
			if (state.status === "defining_specs" && state.applicationSpecs && !state.colorPalette) {
				await this.generateColorPalette(state.userQuery || "");
				await this.defineOntology(state.userQuery || "");
				this.displayFinalResults();

				this.updateState({
					status: "completed",
					lastAction: "completed_after_resume",
				});

				this.effect.work_done();
			}
			// If we've generated a color palette but not defined ontology
			else if (state.status === "generating_palette" && state.colorPalette && state.ontology.entities.length === 0) {
				await this.defineOntology(state.userQuery || "");
				this.displayFinalResults();
				
				this.updateState({
					status: "completed",
					lastAction: "completed_after_resume",
				});
				
				this.effect.work_done();
			}
		}
	}

	/**
	 * Define the application specifications based on the user query
	 */
	private async defineApplicationSpecs(query: string): Promise<void> {
		this.effect.thought("Defining detailed application specifications tailored to your specific needs...");

		try {
			const openai = createOpenAIClient();
			const enc = encoding_for_model("gpt-4.1-mini");

			const systemMessage = `You are an expert at designing highly personalized applications that perfectly address specific user needs.
Your specialty is creating bespoke solutions, not generic templates. Focus on understanding what makes this user's request unique and writing a detailed and comprehensive app specification brief.`;
			
			const prompt = `
Create a detailed and comprehensive explanation of a tailor-made application perfectly adapted to the user's specific request.

Your explanation should:
1. Identify the SPECIFIC PURPOSE for this particular user, not a generic audience
2. Detail UNIQUE FEATURES the application needs that directly address the user's specific context and pain points
3. Explain the user's journey and core interaction flows that would be PERSONALIZED to their situation
4. Describe the key user interfaces designed specifically for THIS user's mental model
5. Outline custom data management requirements that match the user's SPECIFIC workflow
6. Include domain-specific business rules or functional requirements that address the EXACT problem described

IMPORTANT GUIDELINES:
- Use checklists (- [ ] tasks) for features and implementation items.
- Focus on what makes THIS request unique - avoid generic solutions that could apply to any similar app
- PERSONALIZE everything to the specific use case described by the user
- Analyze the user's query for any unique contexts, industries, workflows, or pain points
- Include domain-specific terminology that would resonate with the user's field
- DO NOT include generic requirements like "offline mode", "responsiveness", "multilingual support", etc.
- DO NOT include technical implementation details or architectural patterns.
- AVOID listing common features found in every app of this type

Format your response as a well-structured markdown document with clear sections, bullet points, and easy-to-read language. 
Remember that this document will be used to generate a data model, so focus on capturing the UNIQUE aspects of this user's needs.

CRUCIAL: At the end of your response, ALWAYS include a section titled "## Domain Ontology" that outlines all the key entities and their relationships in this application. For each entity, list its core attributes and how it relates to other entities. This section will serve as the foundation for generating the data model so think thoroughly about it and provide an high quality response.

Here is the user's request for an application:
"""
${query}
"""

Now, create a focused application specification that is PERFECTLY TAILORED to this specific request:`;

			const inputTokens = enc.encode(systemMessage).length + enc.encode(prompt).length;

			// Use streaming API
			const stream = await openai.chat.completions.create({
				model: "gpt-4.1-mini",
				messages: [
					{ role: "system", content: systemMessage },
					{ role: "user", content: prompt },
				],
				temperature: 0.7,
				stream: true,
			});

			let specs = "";
			let lastUpdateTime = Date.now();
			const updateInterval = 250; // Update state every 500ms for smoother streaming
			
			// Process the streaming response
			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content || "";
				specs += content;
				
				// Update state at regular intervals to show progress
				const currentTime = Date.now();
				if (currentTime - lastUpdateTime > updateInterval) {
					this.updateState({
						applicationSpecs: specs,
						status: "generating_palette",
						lastAction: "streaming_specs",
					});
					this.effect.thought("Crafting personalized application blueprint... ");
					lastUpdateTime = currentTime;
				}
			}
			
			// Final update with complete specs
			const outputTokens = enc.encode(specs).length;
			
			// Free the encoder to prevent memory leaks
			enc.free();

			// Update token usage with accurate counts
			this.record_token_usage(inputTokens, outputTokens, "gpt-4.1-mini");

			// Update the state with the complete generated specs
			this.updateState({
				applicationSpecs: specs,
				status: "generating_palette",
				lastAction: "defined_specs",
			});

			this.effect.thought("Tailor-made application specifications defined successfully!");
		} catch (error) {
			console.error("Error defining application specs:", error);
			this.updateState({
				lastAction: "error_defining_specs",
			});
			this.effect.thought("Error defining application specifications!");
		}
	}

	/**
	 * Define the application ontology (data model) based on the specs
	 */
	private async defineOntology(query: string): Promise<void> {
		this.effect.thought("Defining graph database ontology with rich relationships...");
		this.updateState({
			status: "defining_ontology",
			lastAction: "start_ontology",
		});

		try {
			// PHASE 1: Generate all the entities first with minimal details
			this.effect.thought("Phase 1: Identifying all entities in the domain model...");
			let baseEntities = await this.generateEntityDefinitions(query);

			if (baseEntities.length === 0) {
				this.effect.thought("No entities could be identified. Please try with a more detailed application description.");
				this.updateState({
					lastAction: "no_entities_found",
				});
				return;
			}

			// Update the state to show the base entities
			this.updateState({
				ontology: { entities: baseEntities },
				lastAction: "generated_base_entities",
			});

			// Create initial color palette for entities - this happens only once
			// and assigns colors to all base entities
			this.initializeColorPalette(baseEntities);

			// PHASE 2: Enrich entities with fields and relationships
			this.effect.thought(`Phase 2: Adding fields and relationships to ${baseEntities.length} entities...`);
			let enrichedEntities = await this.enrichEntitiesWithFieldsAndRelationships(query, baseEntities);

			// Only update the color palette once at the end of enrichment
			// This ensures we don't get stuttering during streaming updates
			this.updateColorPalette(enrichedEntities);

			// Update the state with the final enriched entities
			this.updateState({
				ontology: { entities: enrichedEntities },
				lastAction: "defined_ontology",
			});

			this.effect.thought("Graph database ontology with rich relationships defined successfully!");
		} catch (error) {
			console.error("Error defining application ontology:", error);
			this.updateState({
				lastAction: "error_defining_ontology",
			});
			this.effect.thought("Error defining graph database ontology!");
		}
	}

	/**
	 * Generate the base entity definitions without detailed fields
	 */
	private async generateEntityDefinitions(query: string): Promise<EntityDefinition[]> {
		this.effect.thought("Generating base entity definitions...");

			const openai = createOpenAIClient();
		const enc = encoding_for_model("gpt-4.1-mini");

		const specs = this.getState().applicationSpecs;

		const systemMessage = `You are an expert domain modeler who specializes in graph database modeling. You never make any mistake and you are very good at your job. Your task is to identify all the key entities in a domain without yet defining their detailed fields or relationships.`;
			
			const prompt = `
Based on the detailed application specification below, identify ALL the core entities that should be part of the graph database model.

At this stage, focus ONLY on identifying the entities themselves with brief descriptions - we will add fields and relationships in a later step.

Application Specification:
"""
${specs}
"""

Original user request:
"""
${query}
"""

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
6. Do NOT include detailed fields or relationships yet - those will be added later
7. Do NOT include purely technical entities like "Settings" or "Authentication"

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
			// Use non-streaming call for this step since it's faster and simpler
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

			enc.free();
			this.record_token_usage(inputTokens, outputTokens, "gpt-4.1-mini");

			try {
				const entityData = JSON.parse(content) as { entities: EntityDefinition[] };

				if (!entityData.entities || entityData.entities.length === 0) {
					this.effect.thought("No entities were generated. Attempting to recover...");
					return [];
				}

				// Add default emoji if missing
				const entitiesWithEmojis = entityData.entities.map((entity) => ({
					...entity,
					emoji: entity.emoji || this.getDefaultEmoji(entity.name),
					fields: entity.fields || [], // Ensure fields array exists
				}));

				// Add common system entities that can be referenced but won't be displayed directly
				const commonEntities = [
					{
						name: "note",
						label: "Note",
						description: "A note that can be used to store long text or markdown content",
						emoji: "📝",
						fields: [],
						isSystemEntity: true
					},
					{
						name: "calendarEvent",
						label: "Calendar Event",
						description: "An event with a specific date, time and duration",
						emoji: "📅",
						fields: [],
						isSystemEntity: true
					},
					{
						name: "calendarDay",
						label: "Calendar Day",
						description: "A full day in a calendar, representing a date",
						emoji: "📆",
						fields: [],
						isSystemEntity: true
					},
					{
						name: "contact",
						label: "Contact",
						description: "A person's contact information",
						emoji: "👤",
						fields: [],
						isSystemEntity: true
					},
					{
						name: "browserSearchResult",
						label: "Browser Search Result",
						description: "A result from a browser search query",
						emoji: "🔍",
						fields: [],
						isSystemEntity: true
					}
				];
				
				// Combine domain entities with common system entities
				const combinedEntities = [...entitiesWithEmojis, ...commonEntities];

				this.effect.thought(`Generated ${entitiesWithEmojis.length} domain entities and added 5 system entities for references.`);
				return combinedEntities;
			} catch (e) {
				console.error("Error parsing entity definitions:", e);
				this.effect.thought("Error parsing entity definitions. Attempting to recover...");
				return [];
			}
		} catch (error) {
			console.error("Error generating entity definitions:", error);
			this.effect.thought("Error generating entity definitions.");
			return [];
		}
	}

	/**
	 * Initialize color palette for entities
	 */
	private initializeColorPalette(entities: EntityDefinition[]): void {
		this.effect.thought("Assigning colors to entities from the palette...");
		
		try {
			// Get current state with the color palette
			const state = this.getState();
			
			// If we don't have a color palette yet, nothing to do
			if (!state.colorPalette || !state.colorPalette.entity_colors) {
				this.effect.thought("No color palette found, cannot assign colors.");
				return;
			}
			
			// Assign colors to entities
			const entityColorMap = this.assignColorsToEntities(entities);
			
			// Update state with the color assignments
			this.updateState({
				entity_color_map: entityColorMap
			});
			
			this.effect.thought("Colors assigned to all entities from our palette.");
		} catch (error) {
			console.error("Error initializing color palette:", error);
		}
	}

	/**
	 * Enrich the base entities with fields and relationships
	 */
	private async enrichEntitiesWithFieldsAndRelationships(query: string, baseEntities: EntityDefinition[]): Promise<EntityDefinition[]> {
		this.effect.thought("Enriching entities with fields and relationships...");

		const openai = createOpenAIClient();
		const enc = encoding_for_model("gpt-4.1-mini");

		const specs = this.getState().applicationSpecs;
		
		// Filter out system entities from the display but mention them for relationships
		const domainEntities = baseEntities.filter(entity => !entity.isSystemEntity);
		const systemEntities = baseEntities.filter(entity => entity.isSystemEntity);
		
		const entityNames = domainEntities.map((e) => e.name).join(", ");
		const systemEntityNames = systemEntities.map((e) => e.name).join(", ");

		const systemMessage = `You are an expert domain modeler specializing in graph database schema design. You never make any mistake and always provide the best quality response. Your task is to enrich a set of base entities with detailed fields and relationships to create a comprehensive graph data model.`;

		const prompt = `
Now that we have identified the key entities for our graph database model, your task is to enrich these entities with detailed fields and relationships.

The application specification is:
"""
${specs}
"""

Original user request:
"""
${query}
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
- Each entity should have 7-12 DOMAIN-SPECIFIC fields that capture the data needed for this business context
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
			const updateInterval = 250; // Update every 250ms
			
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
						const completedJson = this.tryCompleteJson(messageContent);
						const partialData = JSON.parse(completedJson) as { entities: EntityDefinition[] };

						if (partialData.entities && partialData.entities.length > 0) {
							// Merge with existing base entities to preserve structure
							const enrichedEntities = this.mergeEnrichedEntities(baseEntities, partialData.entities);

							// Apply validation but DON'T convert relationships to strings during streaming
							// to avoid the issue with box emojis being displayed and then relations disappearing
							const validatedEntities = enrichedEntities.map(entity => {
								// Create a map for case-insensitive entity name matching
								const entityNameMap = new Map<string, string>();
								enrichedEntities.forEach(e => {
									entityNameMap.set(e.name.toLowerCase(), e.name);
								});
								
								// Process fields to handle case-insensitive relationship matching
								const processedFields = entity.fields.map(field => {
									// Update relationship fields with case-insensitive matching
									if (field.is_relation) {
										const lowercaseType = field.type.toLowerCase();
										const matchedEntityName = entityNameMap.get(lowercaseType);
										
										if (matchedEntityName) {
											return {
												...field,
												type: matchedEntityName // Use the correct case
											};
										}
									}
									return field;
								});
								
								// Ensure every field has a label
								const fieldsWithLabels = processedFields.map(field => {
									if (!field.label) {
										return {
											...field,
											label: this.generateLabelFromName(field.name)
										};
									}
									return field;
								});
								
								// Ensure entity has a label and emoji
								return {
									...entity,
									label: entity.label || this.generateLabelFromName(entity.name),
									fields: fieldsWithLabels,
									emoji: entity.emoji || this.getDefaultEmoji(entity.name || "")
								};
							});

							// Update the UI with current progress - but don't update color palette during streaming
							this.updateState({
								ontology: { entities: validatedEntities },
								lastAction: "enriching_entities_in_progress",
							});
						}
					} catch (e) {
						// Silently ignore parse errors during streaming
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
					return baseEntities;
				}

				// Merge the enriched entities with the base entities
				const mergedEntities = this.mergeEnrichedEntities(baseEntities, entityData.entities);

				// Validate all entities and relationships
				const validatedEntities = this.validateRelations(mergedEntities);

				this.effect.thought(`Successfully enriched ${validatedEntities.length} entities with fields and relationships.`);
				return validatedEntities;
			} catch (e) {
				console.error("Error parsing enriched entities:", e);
				this.effect.thought("Error parsing enriched entities. Using base entities instead.");
				return baseEntities;
			}
		} catch (error) {
			console.error("Error enriching entities:", error);
			this.effect.thought("Error enriching entities with fields and relationships.");
			return baseEntities;
		}
	}

	/**
	 * Merge base entities with enriched entities, preserving structure and ensuring all base entities are included
	 */
	private mergeEnrichedEntities(baseEntities: EntityDefinition[], enrichedEntities: EntityDefinition[]): EntityDefinition[] {
		// Create maps for both case-sensitive and case-insensitive lookups
		const enrichedEntityMap = new Map<string, EntityDefinition>();
		const lowerCaseMap = new Map<string, EntityDefinition>();
		
		// Build both maps for efficient lookups
		enrichedEntities.forEach((entity) => {
			enrichedEntityMap.set(entity.name, entity);
			lowerCaseMap.set(entity.name.toLowerCase(), entity);
		});
		
		// Start with base entities and update them with enriched data
		return baseEntities.map(baseEntity => {
			// First try exact match
			let enrichedEntity = enrichedEntityMap.get(baseEntity.name);
			
			// If no exact match, try case-insensitive match
			if (!enrichedEntity) {
				enrichedEntity = lowerCaseMap.get(baseEntity.name.toLowerCase());
			}
			
			if (enrichedEntity) {
				// Process relationship fields to ensure correct entity name casing
				const processedFields = enrichedEntity.fields.map(field => {
					if (field.is_relation) {
						// Try to find the matching entity with correct casing
						const lowerTypeName = field.type.toLowerCase();
						const baseEntityMatch = baseEntities.find(e => e.name.toLowerCase() === lowerTypeName);
						
						if (baseEntityMatch) {
							return {
								...field,
								type: baseEntityMatch.name // Use the case from the base entity
							};
						}
					}
					return field;
				});
				
				// Keep the base entity details but use the enriched fields
				return {
					...baseEntity,
					// Update description if the enriched one is more detailed
					description: enrichedEntity.description.length > baseEntity.description.length 
						? enrichedEntity.description 
						: baseEntity.description,
					// Preserve the original emoji if it exists, otherwise use the enriched one
					emoji: baseEntity.emoji || enrichedEntity.emoji || this.getDefaultEmoji(baseEntity.name),
					// Preserve isSystemEntity flag from base entity
					isSystemEntity: baseEntity.isSystemEntity,
					// Use enriched fields with processed relationships
					fields: processedFields || [],
				};
			}
			
			// If no enriched version exists, return the base entity
			return baseEntity;
		});
	}

	/**
	 * Filter out generic/system entities that are not specific to business domain
	 */
	private filterGenericEntities(entities: EntityDefinition[]): EntityDefinition[] {
		// Only filter out purely technical system entities
		const genericEntityTerms = ["settings", "preference", "session", "log", "token", "auth", "authentication", "apikey", "config"];

		// Function to check if an entity name contains generic terms
		const isGenericEntity = (entity: EntityDefinition): boolean => {
			const nameLower = entity.name.toLowerCase();

			// Only filter out purely technical/system entities
			return genericEntityTerms.some((term) => nameLower === term || (nameLower.startsWith(term) && !entity.fields.some((f) => f.is_relation)) || (nameLower.endsWith(term) && !entity.fields.some((f) => f.is_relation)));
		};

		// Filter out generic entities but keep those with relationships
		return entities.filter((entity) => !isGenericEntity(entity));
	}

	/**
	 * Try to complete a potentially incomplete JSON string
	 */
	private tryCompleteJson(incompleteJson: string): string {
		return jsonrepair(incompleteJson);
	}

	/**
	 * Validate that all relations point to valid entities
	 */
	private validateRelations(entities: EntityDefinition[]): EntityDefinition[] {
		// Create maps for case-insensitive entity name lookups
		const validEntityNames = new Set(entities.map(entity => entity.name));
		const entityNameMap = new Map<string, string>();
		
		// Create a map of lowercase entity names to their actual names for case-insensitive matching
		entities.forEach(entity => {
			entityNameMap.set(entity.name.toLowerCase(), entity.name);
		});

		// Process all entities and their fields
		const processedEntities = entities.map((entity) => {
			// Process each field to validate relations
			const processedFields = entity.fields.map((field) => {
				// If it's already a relation, validate it
				if (field.is_relation) {
					// First try exact match
					if (validEntityNames.has(field.type)) {
						return field;
					}
					
					// Then try case-insensitive match
					const lowercaseType = field.type.toLowerCase();
					const matchedEntityName = entityNameMap.get(lowercaseType);
					
					if (matchedEntityName) {
						// Found a case-insensitive match, update the type to the correct case
						return {
							...field,
							type: matchedEntityName // Use the correct case of the entity name
						};
					}
					
					// IMPORTANT: During streaming, the target entity might not exist yet
					// but will be added later. We'll keep the relationship as is in most cases.
					
					// Only convert to string if we're very sure this isn't going to be a valid entity
					// For example, if it's clearly not a proper entity name format
					if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(field.type)) {
						return {
							...field,
							is_relation: false,
							is_list: false,
							type: "string",
							description: `${field.description || ""} (Note: Target entity '${field.type}' was not found in the model and was converted to a string field)`,
						};
					}
					
					// Preserve the relationship even if the target entity isn't in our set yet
					// since it might appear later in the streaming process
					return field;
				}

				// No conversion, keep the field as is
				return field;
			});

			// Ensure every field has a label
			const labelsAdded = processedFields.map(field => {
				if (!field.label) {
					return {
						...field,
						label: this.generateLabelFromName(field.name)
					};
				}
				return field;
			});

			// Ensure entity has a label and emoji
			const entityWithLabel = {
				...entity,
				label: entity.label || this.generateLabelFromName(entity.name),
				fields: labelsAdded,
				emoji: entity.emoji || this.getDefaultEmoji(entity.name || "")
			};

			return entityWithLabel;
		});
		
		// Apply cleanEntityIDs to remove any ID fields as per user requirements
		return this.cleanEntityIDs(processedEntities);
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
	 * Clean entity definitions to remove any ID fields
	 */
	private cleanEntityIDs(entities: EntityDefinition[]): EntityDefinition[] {
		return entities.map((entity) => {
			// Filter out any fields that look like IDs
			const cleanedFields = entity.fields.filter((field) => {
				// Skip fields that are named exactly ID, end with Id, or end with ID
				return !(field.name === "id" || field.name === "ID" || field.name.endsWith("Id") || field.name.endsWith("ID"));
			});

			return {
				...entity,
				fields: cleanedFields,
			};
		});
	}

	/**
	 * Display the final results (specs and ontology)
	 */
	private displayFinalResults(): void {
		const state = this.getState();
		
		console.log("\n\n============== TAILOR-MADE APPLICATION SPECIFICATIONS ==============\n");
		console.log(state.applicationSpecs);
		
		console.log("\n\n============== GRAPH DATABASE ONTOLOGY WITH RICH RELATIONSHIPS ==============\n");
		console.log(JSON.stringify(state.ontology, null, 2));
		
		console.log("\n\n============== SOPHISTICATED COLOR PALETTE ==============\n");
		
		// Format the color palette nicely for display
		const colorDisplay = {
			primary: state.colorPalette?.primary || "Not generated",
			secondary: state.colorPalette?.secondary || "Not generated",
			accent: state.colorPalette?.accent || "Not generated",
			entityColors: state.colorPalette?.entity_colors?.map((color: any, index: number) => {
				return {
					index,
					light: {
						background: color.background,
						text: color.text,
						border: color.border
					},
					dark: {
						background: color.darkBackground,
						text: color.darkText,
						border: color.darkBorder
					}
				};
			}) || "Not generated"
		};
		
		// console.log(JSON.stringify(colorDisplay, null, 2));

		this.effect.thought("Your personalized graph database application design is complete! Each entity and relationship has been carefully crafted to match your specific requirements, with a harmonious color palette designed to reflect the application's purpose and emotional tone.");
	}

	/**
	 * Record token usage
	 */
	public record_token_usage(input_tokens: number, output_tokens: number, model: string): void {
		// Calculate approximate cost (assuming gpt-4.1-mini pricing)
		const input_cost = (input_tokens / 1000) * 0.01; // $0.01 per 1K tokens
		const output_cost = (output_tokens / 1000) * 0.03; // $0.03 per 1K tokens
		const total_cost = input_cost + output_cost;

		this.token_usage.input += input_tokens;
		this.token_usage.output += output_tokens;
		this.token_usage.cost += total_cost;

		console.log(`Token usage - Input: ${input_tokens}, Output: ${output_tokens}, Cost: $${total_cost.toFixed(4)}`);
	}

	/**
	 * Generate a color palette that matches the application's purpose
	 * This is called once at the beginning and creates a fixed palette
	 */
	private async generateColorPalette(query: string): Promise<void> {
		this.effect.thought("Creating a sophisticated color palette that matches your application's purpose and aesthetic goals...");
		this.updateState({
			status: "generating_palette",
			lastAction: "start_palette",
		});

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

			const specs = this.getState().applicationSpecs;

			const systemMessage = `You are an expert UI designer with deep knowledge of color theory, emotional design, and color psychology.
Your specialty is creating tailored color palettes that perfectly match an application's purpose, evoke the right emotional response, and meet accessibility standards.
You create sophisticated hexadecimal color palettes that professional designers would use, not generic template colors.`;

			const prompt = `
Based on the application specifications below, create a sophisticated and harmonious color palette that perfectly matches its purpose, domain, and target users.

APPLICATION SPECIFICATIONS:
"""
${specs}
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
- Evoke the right emotional response for this specific application domain (e.g., calm for meditation, energetic for fitness)
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

			// Create a fixed palette that will be used throughout the application
			const fixedPalette = {
				primary: {
					base: "#4F46E5",
					hover: "#4338CA",
					text: "#FFFFFF"
				},
				secondary: {
					base: "#F3F4F6",
					hover: "#E5E7EB",
					text: "#1F2937"
				},
				accent: {
					base: "#8B5CF6",
					hover: "#7C3AED",
					text: "#FFFFFF"
				},
				entity_colors: [
					{
						background: "#EFF6FF",
						text: "#1E40AF",
						border: "#BFDBFE",
						darkBackground: "#1E3A8A",
						darkText: "#93C5FD",
						darkBorder: "#1E40AF"
					},
					{
						background: "#ECFDF5",
						text: "#065F46",
						border: "#A7F3D0",
						darkBackground: "#064E3B",
						darkText: "#6EE7B7",
						darkBorder: "#065F46"
					},
					{
						background: "#F5F3FF",
						text: "#5B21B6",
						border: "#DDD6FE",
						darkBackground: "#4C1D95",
						darkText: "#C4B5FD",
						darkBorder: "#5B21B6"
					},
					{
						background: "#FFF7ED",
						text: "#9A3412",
						border: "#FFEDD5",
						darkBackground: "#7C2D12",
						darkText: "#FDBA74",
						darkBorder: "#9A3412"
					},
					{
						background: "#FEF2F2",
						text: "#991B1B",
						border: "#FEE2E2",
						darkBackground: "#7F1D1D",
						darkText: "#FCA5A5",
						darkBorder: "#991B1B"
					},
					{
						background: "#ECFEFF",
						text: "#155E75",
						border: "#CFFAFE",
						darkBackground: "#164E63",
						darkText: "#67E8F9",
						darkBorder: "#155E75"
					}
				]
			};

			// Update with fixed palette immediately
			this.updateState({
				colorPalette: fixedPalette,
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
					if (
						palette.primary && palette.primary.base && 
						palette.secondary && palette.secondary.base && 
						palette.accent && palette.accent.base && 
						Array.isArray(palette.entity_colors) && 
						palette.entity_colors.length >= 5
					) {
						// Update the state with the AI-generated palette
						this.updateState({
							colorPalette: palette,
							entity_color_map: {}, // Reset color map with new palette
							lastAction: "defined_palette",
						});
						this.effect.thought("Created a sophisticated color palette tailored to your application's domain!");
					} else {
						// Keep using the fixed palette if the structure isn't valid
						this.effect.thought("Generated palette was incomplete, using default palette instead.");
					}
				} catch (e) {
					console.error("Error parsing color palette:", e);
					// We already have a fixed palette, so no need to update
					this.updateState({
						lastAction: "recovered_palette",
					});
				}
			} catch (error) {
				console.error("Error generating color palette from AI:", error);
				// We already have a fixed palette, so just update the status
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
					text: "#FFFFFF"
				},
				secondary: {
					base: "#F3F4F6",
					hover: "#E5E7EB",
					text: "#1F2937"
				},
				accent: {
					base: "#8B5CF6",
					hover: "#7C3AED",
					text: "#FFFFFF"
				},
				entity_colors: [
					{
						background: "#EFF6FF",
						text: "#1E40AF",
						border: "#BFDBFE",
						darkBackground: "#1E3A8A",
						darkText: "#93C5FD",
						darkBorder: "#1E40AF"
					},
					{
						background: "#ECFDF5",
						text: "#065F46",
						border: "#A7F3D0",
						darkBackground: "#064E3B",
						darkText: "#6EE7B7",
						darkBorder: "#065F46"
					},
					{
						background: "#F5F3FF",
						text: "#5B21B6",
						border: "#DDD6FE",
						darkBackground: "#4C1D95",
						darkText: "#C4B5FD",
						darkBorder: "#5B21B6"
					},
					{
						background: "#FFF7ED",
						text: "#9A3412",
						border: "#FFEDD5",
						darkBackground: "#7C2D12",
						darkText: "#FDBA74",
						darkBorder: "#9A3412"
					},
					{
						background: "#FEF2F2",
						text: "#991B1B",
						border: "#FEE2E2",
						darkBackground: "#7F1D1D",
						darkText: "#FCA5A5",
						darkBorder: "#991B1B"
					},
					{
						background: "#ECFEFF",
						text: "#155E75",
						border: "#CFFAFE",
						darkBackground: "#164E63",
						darkText: "#67E8F9",
						darkBorder: "#155E75"
					}
				]
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
	 * Assign colors to entities from the color palette
	 * This is called when new entities are added
	 * Uses a deterministic hashing function to ensure consistent colors
	 */
	private assignColorsToEntities(entities: EntityDefinition[]): Record<string, any> {
		const state = this.getState();
		const entityColors: Record<string, any> = {};
		
		// If we don't have a color palette, we can't assign colors
		if (!state.colorPalette || !state.colorPalette.entity_colors) {
			return entityColors;
		}
		
		const colors = state.colorPalette.entity_colors;
		const fallbackColor = {
			background: "#F9FAFB",
			text: "#111827",
			border: "#E5E7EB",
			darkBackground: "#1F2937",
			darkText: "#E5E7EB",
			darkBorder: "#374151"
		};
		
		// Deterministic hash function to ensure consistent colors for the same entity name
		const getColorIndexFromName = (name: string): number => {
			// Simple but consistent hash
			const hash = name.split('').reduce((acc, char, i) => {
				// Use position in string as a multiplier for more distribution
				return acc + char.charCodeAt(0) * (i + 1);
			}, 0);
			
			return hash % colors.length;
		};
		
		// Assign colors to entities based on the deterministic hash of their name
		for (const entity of entities) {
			const colorIndex = getColorIndexFromName(entity.name);
			entityColors[entity.name] = colors[colorIndex] || fallbackColor;
		}
		
		return entityColors;
	}

	/**
	 * Update the existing color map to include new entities
	 * This maintains the colors for existing entities and only adds colors for new ones
	 * Uses a deterministic approach to ensure consistent colors across updates
	 */
	private updateColorPalette(newEntities: EntityDefinition[]): void {
		try {
			// Get the current state
			const state = this.getState();
			
			// If we don't have a color palette or available colors, we can't update anything
			if (!state.colorPalette || !state.colorPalette.entity_colors || !state.colorPalette.entity_colors.length) {
				return;
			}
			
			// Get the existing color map or create a new one
			const existingColorMap = state.entity_color_map || {};
			
			// Find entities that don't already have colors assigned
			const entitiesNeedingColors = newEntities.filter(entity => !existingColorMap[entity.name]);
			
			// If no new entities need colors, we're done
			if (entitiesNeedingColors.length === 0) {
				return;
			}
			
			// Assign colors to the new entities using our deterministic function
			const newColorAssignments = this.assignColorsToEntities(entitiesNeedingColors);
			
			// Merge with existing color map
			const updatedColorMap = {
				...existingColorMap,
				...newColorAssignments
			};
			
			// Update the state with the merged color map
			this.updateState({
				entity_color_map: updatedColorMap
			});
			
			this.effect.thought(`Updated color palette with ${entitiesNeedingColors.length} new entities using consistent color assignments.`);
		} catch (error) {
			console.error("Error updating color palette:", error);
		}
	}

	/**
	 * Merge a new batch of entities with existing entities,
	 * preserving existing entities while adding new ones without creating bidirectional relationships
	 */
	private mergeEntityBatch(existingEntities: EntityDefinition[], newEntities: EntityDefinition[]): EntityDefinition[] {
		// Create maps for both case-sensitive and case-insensitive lookups
		const existingEntityMap = new Map<string, EntityDefinition>();
		const lowerCaseMap = new Map<string, string>(); // maps lowercase name to actual name
		
		existingEntities.forEach((entity) => {
			existingEntityMap.set(entity.name, entity);
			lowerCaseMap.set(entity.name.toLowerCase(), entity.name);
		});

		// Create a new array to hold all final entities
		const mergedEntities: EntityDefinition[] = [...existingEntities];

		// Process each new entity
		for (const newEntity of newEntities) {
			// Check if the entity already exists (case-sensitive first)
			const exactMatch = existingEntityMap.has(newEntity.name);
			
			// Then check case-insensitive
			const lowercaseName = newEntity.name.toLowerCase();
			const caseInsensitiveMatch = !exactMatch && lowerCaseMap.has(lowercaseName);
			const matchedName = caseInsensitiveMatch ? lowerCaseMap.get(lowercaseName) : undefined;
			
			// Process fields to ensure relationship types match existing entity names
			const processedFields = newEntity.fields.map(field => {
				if (field.is_relation) {
					const lowercaseType = field.type.toLowerCase();
					const matchedEntityName = lowerCaseMap.get(lowercaseType);
					
					if (matchedEntityName) {
						return {
							...field,
							type: matchedEntityName // Use the correct case
						};
					}
				}
				return field;
			});
			
			// Update the entity with processed fields
			const entityWithProcessedFields = {
				...newEntity,
				fields: processedFields
			};
			
			if (!exactMatch && !caseInsensitiveMatch) {
				// Add brand new entity
				mergedEntities.push(entityWithProcessedFields);
				existingEntityMap.set(newEntity.name, entityWithProcessedFields);
				lowerCaseMap.set(lowercaseName, newEntity.name);
				this.effect.thought(`Added new entity '${newEntity.name}' with ${newEntity.fields.length} fields`);
			} else {
				// Entity with same name exists (case-sensitive or case-insensitive), merge its fields
				const actualName = matchedName || newEntity.name;
				const existingEntity = existingEntityMap.get(actualName)!;
				const existingFieldNames = new Set(existingEntity.fields.map((f) => f.name.toLowerCase())); // Case-insensitive field name matching

				// Add fields from the new entity that don't exist in the existing entity (case-insensitive check)
				const newFields = entityWithProcessedFields.fields.filter((field) => 
					!existingFieldNames.has(field.name.toLowerCase())
				);

				if (newFields.length > 0) {
					// Replace the existing entity with the merged one
					const mergedEntity = {
						...existingEntity,
						fields: [...existingEntity.fields, ...newFields],
					};

					// Find and update the entity in our array
					const index = mergedEntities.findIndex((e) => e.name === actualName);
					if (index !== -1) {
						mergedEntities[index] = mergedEntity;
						// Update our map as well
						existingEntityMap.set(actualName, mergedEntity);
						this.effect.thought(`Updated entity '${actualName}' with ${newFields.length} new fields`);
					}
				}
			}
		}

		return mergedEntities;
	}
}
