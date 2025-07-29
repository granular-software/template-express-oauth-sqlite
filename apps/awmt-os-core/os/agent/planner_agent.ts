import type { ExecutionPlanData, TaskData } from '@joshu/os-types';
import crypto from 'crypto';
import { encoding_for_model } from 'tiktoken';
import Os from '../os';
import { createOpenAIClient, getModelName } from '../config/modelConfig';
import EffectsStream from '../effects_stream';
import type { SerializedView } from '@joshu/os-types';
import type Agent from '.';
import { uuidv4 } from './abstract_agent';

export interface IPlannerAgent {
	execute_additive_plan(): Promise<AgentExecutionPlan>;
	execute_subtractive_plan(): Promise<AgentExecutionPlan>;
	current_plan_code: string;
}

class PlannerAgent implements IPlannerAgent {
	private model: string = getModelName();

	public agent: Agent;
	public os: Os;

	public current_plan_code: string = '';

	constructor(agent: Agent) {
		
		this.agent = agent;
		this.os = agent.os
		// this.effectsStream = os.effectsStream;
		this.current_plan_code = agent.current_execution_code_plan || '';
	}

	public async execute_additive_plan(): Promise<AgentExecutionPlan> {
		const plan_code = await this._generate_additive_plan_code();
		this._log_in_file(plan_code);
		const plan = await this._execute_plan_code(plan_code);
		this._send_plan_to_data_stream(plan);
		return plan;
	}

	public async execute_subtractive_plan(): Promise<AgentExecutionPlan> {
		const plan_code = await this._generate_subtractive_plan_code();
		this._log_in_file(plan_code);
		const plan = await this._execute_plan_code(plan_code);
		this._send_plan_to_data_stream(plan);
		return plan;
	}

	private async _generate_additive_plan_code(): Promise<string> {
		console.log(
			this.agent.logs
				.get_stream()
				.map((log) => `${log.date} - ${log.type}: ${JSON.stringify(log.content)}`)
				.join('\n'),
		);

		// Get the current plan code or create placeholder for new plan
		const current_plan =
			this.current_plan_code ||
			`function create_plan() {
		const plan = new AgentExecutionPlan();
		/* generate new code here */
		return plan;
	} 

	return create_plan();`;

		// Get the views in memory
		const views_in_memory = await Promise.all(this.agent.doc.windows.map(async (window) => await window.view));
		const formatted_views = this._format_views_as_json(views_in_memory);

		const prompt = `
You are an expert AI assistant that generates executable TypeScript code to create or update a goal breakdown plan.
Your task is to ONLY ADD NEW TASKS or MODIFY EXISTING TASKS (without marking them as complete).

Last events : 

\`\`\`
${this.agent.logs
	.get_stream()
	.map((event) => `${event.date} - ${event.type}: ${JSON.stringify(event.content)}`)
	.join('\n')}
\`\`\`

<currently_opened_views>
${formatted_views}
</currently_opened_views>

Your task is to generate TypeScript code that creates or updates a goal breakdown plan using the AgentExecutionPlan class.
The code should follow snake_case naming convention for all variables and function names.

Here is the current plan code:

\`\`\`typescript
${current_plan}
\`\`\`

Your task is to ${this.current_plan_code ? 'IMPROVE the existing plan' : 'create a new plan'} by adding or modifying code at the /* generate new code here */ placeholder.

IMPORTANT: You can ONLY:
1. Add new tasks using add_task()
2. Add new subtasks using create_subtask()
3. Add prerequisites using add_prerequisite()
4. Update task descriptions using update_description()
5. Update task titles using update_title()
6. Add task dependencies using depends_on_task()

DO NOT:
1. Mark tasks as completed
2. Remove tasks
3. Blank tasks

IMPORTANT INSTRUCTIONS YOU MUST FOLLOW EXACTLY:
1. NEVER include 'function create_plan()' or 'return create_plan()' or 'return plan;' in your code.
2. ALWAYS preserve the '/* generate new code here */' comment at the EXACT end of your code.
3. DO NOT duplicate any existing code - only add new code or modify existing elements.
4. ONLY output the code that should replace the placeholder.

IMPORTANT GUIDELINES FOR CREATING EFFECTIVE GOAL BREAKDOWNS:
1. Focus on the ultimate goal and break it down into SEPARATE TOP-LEVEL TASKS
2. Keep the plan directly relevant to the user's request
3. DO NOT create a single high-level task that just repeats the user's request with many subtasks
4. Instead, create multiple (depending on the complexity of the goal) top-level tasks that directly address different aspects of the goal
5. Only use subtasks when necessary to break down a complex or abstract task
6. Avoid redundant or overlapping tasks
7. Ensure each task has clear prerequisites
8. MAINTAIN CONSISTENCY: Each task should be logically connected to the overall goal
9. NO REDUNDANCY: Never create tasks that duplicate functionality or could be merged
10. CLEAR PROGRESSION: Tasks should follow a logical sequence towards the goal
11. MINIMAL OVERHEAD: Don't create management or coordination tasks unless absolutely necessary
12. FOCUSED SCOPE: Every task must directly contribute to the user's stated goal
13. CLEAR DEPENDENCIES: If tasks depend on each other, make those relationships explicit
14. NO EXTRAPOLATION: Don't add tasks that go beyond what the user explicitly requested

The code should:
1. Add appropriate tasks based on the user's ultimate goal
2. Define prerequisites for each task
3. Establish dependencies between tasks where needed
4. Return the execution plan

Available methods for TASK MANAGEMENT:
- AgentExecutionPlan: Main container for tasks
  - add_task({title, description}): Creates a new top-level task and adds it to the plan
  - add_task_after(task, {title, description}): Creates a new task and inserts it immediately after the specified task
  - add_task_at_index(index, {title, description}): Creates a new task and inserts it at the specified position in the task list
  - create_subtask(parent_task, {title, description}): Creates a new task as a child of the specified parent task
  - get_task_by_id(id): Retrieves a task by its ID
  - get_all_tasks(): Gets all tasks in the plan

- Task: Represents a single goal or step in the plan
  - add_prerequisite(name, description): Defines information needed before this task can be completed
  - depends_on_task(task): Makes this task depend on another task
  - update_description(description): Updates the task description
  - update_title(title): Updates the task title

IMPORTANT: Generate ONLY executable TypeScript code that creates or updates an AgentExecutionPlan.
Do not include any explanations or markdown formatting. The code should be complete and ready to execute.
Use snake_case for all function and variable names.

IMPORTANT: Make sure the goal breakdown is directly relevant to the user's request and context.
The number of tasks should be determined by what's actually needed, not by following the example structure.

IMPORTANT: Create multiple top-level tasks rather than a single main task with many subtasks.
Only add subtasks when they're relevant to breaking down a complex task. Don't add subtasks just for the sake of having them.

IMPORTANT: Add prerequisites to tasks using the add_prerequisite method to indicate what information is needed before a task can be completed.

IMPORTANT: Add friendly, clear comments with emojis that explain what each part of the code does in simple, non-technical language.

IMPORTANT: The code should be valid TypeScript code.

IMPORTANT: Do not forget to add the /* generate new code here */ after the last instruction.

IMPORTANT: Do not extrapolate beyond what you are asked. The goal of the plan is to break down the user's current goal, not to anticipate future goals.

CRITICAL: Focus on the "depth" of a query (handling its details and subtasks) but DO NOT add tasks that aren't directly related to what the user asked for.

CRITICAL: The user's query is the MOST IMPORTANT thing to follow. For example, if the user asks to "open the notes app", the plan should ONLY include tasks directly related to opening the notes app - NOT additional tasks like "review existing notes", "create a new note", or "return to browser". These would be considered extrapolation beyond the user's request.

CRITICAL: "Follow up" actions are handled by another agent, not by the planner agent. Your job is to create a plan that STRICTLY addresses what the user explicitly asked for, nothing more.

CRITICAL: In the events stream, the messages with type USER_QUERY are requests made by the user, so you should consider what they say as "things to be done", and NEVER "things done".

CRITICAL: The plan should be CONSISTENT and MINIMAL:
1. Every task must have a clear purpose that directly contributes to the goal
2. No task should duplicate the functionality of another task
3. Tasks that could be logically merged should be combined
4. Prerequisites should be non-redundant and clearly necessary
5. Dependencies between tasks should be logical and necessary
6. The plan should stop when the user's goal is achieved - no extra tasks
7. Each task should represent a distinct, necessary step towards the goal
8. If a task seems redundant or unnecessary, it should be removed or merged
9. The plan should be as simple as possible while still achieving the goal
10. Regularly review and clean up the plan to maintain consistency

If you perfectly decompose the user goal in tasks, as well as a human assistant would, and then perfectly keep track of their progress, with no mistake, you will be rewarded with a generous tip.
`;

		try {
			const openai = createOpenAIClient();
			let retries = 0;
			const MAX_RETRIES = 3;
			let result = '';

			const amount_of_input_tokens = 0;

			while (retries < MAX_RETRIES) {
				try {
					const stream = await openai.chat.completions.create({
						model: this.model,
						messages: [
							{
								role: 'system',
								content:
									"You are a helpful assistant, expert coder, and expert in breaking down complex goals into actionable steps. You create plans that are concise, relevant, and focused on the user's ultimate goal. When updating an existing plan, you ONLY provide the new code that should replace the placeholder, not the entire plan structure.",
							},
							{ role: 'user', content: prompt },
						],
						temperature: 0,
						stream: true,
					});

					result = '';

					// Get the encoding for the current model
					const enc = encoding_for_model("chatgpt-4o-latest");

					// Count tokens for system message and prompt
					const systemMessage = "You are a helpful assistant, expert coder, and expert in breaking down complex goals into actionable steps. You create plans that are concise, relevant, and focused on the user's ultimate goal. When updating an existing plan, you ONLY provide the new code that should replace the placeholder, not the entire plan structure.";
					const inputTokens = enc.encode(systemMessage).length + enc.encode(prompt).length;

					// console.log("AMOUNT OF INPUT TOKENS", inputTokens);

					let outputTokens = 0;
					let totalContent = '';

					for await (const chunk of stream) {
						const content = chunk.choices[0]?.delta?.content;

						if (content) {
							result += content;
							totalContent += content;
							// Count tokens accurately for the output
							outputTokens = enc.encode(totalContent).length;

							if (content.includes('\n')) {
								const lines = result.split('\n');
								const last_line = lines.length > 1 ? lines[lines.length - 2] : null;

								if (!last_line) {
									continue;
								}

								const comments = last_line.split('// ');

								if (comments.length > 1) {
									let comment = comments[comments.length - 1];
									if (comment) this.agent.effect.thought(comment);
								}
							}
						}
					}

					// Free the encoder to prevent memory leaks
					enc.free();

					// Update token usage after stream completes
					this.agent.record_token_usage(inputTokens, outputTokens, this.model);

					console.log('======= GENERATED CODE', this.current_plan_code ? '(UPDATING)' : '(CREATING)');
					console.log(result);
					console.log('================');

					// Process the generated result
					if (result.startsWith('```typescript')) {
						result = result.slice(13, -3).trim();
					} else if (result.startsWith('```')) {
						result = result.slice(4, -3).trim();
					}

					// Validation and correction
					if (this.current_plan_code) {
						// For updates: check for problematic patterns
						if (result.includes('function create_plan()') || result.includes('return create_plan()') || result.includes('return plan;')) {
							console.log('Generated code contains prohibited elements. Retrying...');
							retries++;
							continue;
						}

						// Ensure the placeholder is preserved
						if (!result.includes('/* generate new code here */')) {
							result += '\n\n/* generate new code here */';
						}
					} else {
						// For new plans: make additional validations
						if (result.includes('function create_plan()') || result.includes('return create_plan();')) {
							console.log('Generated code contains function definition. Retrying...');
							retries++;
							continue;
						}

						// Ensure the placeholder is preserved
						if (!result.includes('/* generate new code here */')) {
							result += '\n\n/* generate new code here */';
						}
					}

					// If we have existing code, update it with the new code
					if (this.current_plan_code) {
						// Replace the placeholder comment with the new code
						const updated_code = this.current_plan_code.replace('/* generate new code here */', result);

						// Store the updated code for future updates
						this.current_plan_code = updated_code;
						this.agent.current_execution_code_plan = updated_code;

						return updated_code;
					} else {
						// For a completely new plan, make sure it has the right structure
						if (!result.includes('function create_plan()')) {
							result = `function create_plan() {
  const plan = new AgentExecutionPlan();
  
  ${result}
  
  return plan;
}

return create_plan();`;
						}

						// Store the new code for future updates
						this.current_plan_code = result;
						this.agent.current_execution_code_plan = result;

						return result;
					}
				} catch (error) {
					console.error(`Error in generation attempt ${retries + 1}:`, error);
					retries++;
					if (retries >= MAX_RETRIES) {
						throw error; // Re-throw if we've exhausted retries
					}
				}
			}

			// If we reach here, the code is valid
			return result;
		} catch (error) {
			console.error('Error generating plan code after all retries:', error);

			// Fallback code in case the API call fails
			if (this.current_plan_code) {
				// If we have existing code, just return it without changes
				console.log('Using existing plan code as fallback');
				return this.current_plan_code;
			} else {
				// Only use the minimal fallback if we have no existing code
				const fallback_code = `
function create_plan() {
    const plan = new AgentExecutionPlan();
    const main_task = plan.add_task({
        title: "Process user request",
        description: "Analyze and respond to the user's goal"
    });
    main_task.add_outcome("response", "The response to the user's request", "string");
    return plan;
}
return create_plan();`;

				this.current_plan_code = fallback_code;
				return fallback_code;
			}
		}
	}

	private async _generate_subtractive_plan_code(): Promise<string> {
		console.log(
			this.agent.logs
				.get_stream()
				.map((log) => `${log.date} - ${log.type}: ${JSON.stringify(log.content)}`)
				.join('\n'),
		);

		// Get the current plan code or create placeholder for new plan
		const current_plan =
			this.current_plan_code ||
			`function create_plan() {
		const plan = new AgentExecutionPlan();
		/* generate new code here */
		return plan;
	} 

	return create_plan();`;

		// Get the views in memory
		const views_in_memory = await Promise.all(this.agent.doc.windows.map(async (window) => await window.view));
		const formatted_views = this._format_views_as_json(views_in_memory);

		const prompt = `
You are an expert AI assistant that generates executable TypeScript code to update a goal breakdown plan.
Your task is to ONLY MARK TASKS AS COMPLETED or REMOVE TASKS based on the current context.

Last events : 

\`\`\`
${this.agent.logs
	.get_stream()
	.map((event) => `${event.date} - ${event.type}: ${JSON.stringify(event.content)}`)
	.join('\n')}
\`\`\`

<currently_opened_views>
${formatted_views}
</currently_opened_views>

Your task is to generate TypeScript code that updates a goal breakdown plan using the AgentExecutionPlan class.
The code should follow snake_case naming convention for all variables and function names.

Here is the current plan code:

\`\`\`typescript
${current_plan}
\`\`\`

Your task is to update the plan by adding code at the /* generate new code here */ placeholder.

IMPORTANT: You can ONLY:
1. Mark tasks as completed using mark_as_completed()
2. Remove tasks using remove_task()
3. Blank tasks using blank_task()

DO NOT:
1. Add new tasks
2. Add new subtasks
3. Add prerequisites
4. Update task descriptions
5. Update task titles
6. Add task dependencies

IMPORTANT INSTRUCTIONS YOU MUST FOLLOW EXACTLY:
1. NEVER include 'function create_plan()' or 'return create_plan()' or 'return plan;' in your code.
2. ALWAYS preserve the '/* generate new code here */' comment at the EXACT end of your code.
3. DO NOT duplicate any existing code - only add new code or modify existing elements.
4. ONLY output the code that should replace the placeholder.

CRITICAL: When reviewing tasks for completion or removal:
1. COMPLETION: Only mark a task as completed when you have explicit evidence it was done
2. REMOVAL: Remove tasks that are redundant, unnecessary, or no longer relevant
3. BLANKING: Blank tasks that cannot be completed but shouldn't be removed
4. CONSISTENCY: Ensure remaining tasks are still necessary and relevant
5. CLEANUP: Remove or blank tasks that go beyond the user's request
6. DEPENDENCIES: Check if completed tasks affect the relevance of dependent tasks
7. PROGRESSION: Verify that remaining tasks form a logical sequence
8. MINIMALISM: The plan should only contain tasks that are still needed
9. EVIDENCE: Look for clear evidence in events and views before marking complete
10. SCOPE: Remove tasks that extrapolate beyond the user's goal

Available methods for TASK MANAGEMENT:
- AgentExecutionPlan: Main container for tasks
  - remove_task(task): Removes the specified task from the plan. You can remove a task if it is not relevant to the user's goal, or if it is a duplicate of another task.
  - mark_as_completed(task): Marks the specified task as complete only when you are confident (based on the context given to you) that it is fully completed
  - get_task_by_id(id): Retrieves a task by its ID
  - get_all_tasks(): Gets all tasks in the plan

- Task: Represents a single goal or step in the plan
  - mark_as_completed(): Marks the task as complete only when you are confident (based on the context given to you) that it is fully completed	
  - blank_task(reason): Marks the task as completed with a reason why it was blanked

IMPORTANT: Generate ONLY executable TypeScript code that updates an AgentExecutionPlan.
Do not include any explanations or markdown formatting. The code should be complete and ready to execute.
Use snake_case for all function and variable names.

IMPORTANT: The code should be valid TypeScript code.

IMPORTANT: Do not forget to add the /* generate new code here */ after the last instruction.

MOST CRITICAL: Mark tasks as done using mark_as_completed() ONLY IF they are FULLY completed based on the context (events, loaded views, etc), and ONLY WHEN YOU ARE FULLY CONFIDENT that they are fully completed. If you mark a task that is not finished as finished, i am going to get VERY upset.

If you perfectly track task progress, with no mistake, you will be rewarded with a generous tip.
`;

		try {
			const openai = createOpenAIClient();
			let retries = 0;
			const MAX_RETRIES = 3;
			let result = '';

			const amount_of_input_tokens = 0;

			while (retries < MAX_RETRIES) {
				try {
					const stream = await openai.chat.completions.create({
						model: this.model,
						messages: [
							{
								role: 'system',
								content:
									"You are a helpful assistant, expert coder, and expert in tracking task progress. You are very careful about marking tasks as completed, doing so only when you have clear evidence.",
							},
							{ role: 'user', content: prompt },
						],
						temperature: 0,
						stream: true,
					});

					result = '';

					// Get the encoding for the current model
					const enc = encoding_for_model("chatgpt-4o-latest");

					// Count tokens for system message and prompt
					const systemMessage = "You are a helpful assistant, expert coder, and expert in tracking task progress. You are very careful about marking tasks as completed, doing so only when you have clear evidence.";
					const inputTokens = enc.encode(systemMessage).length + enc.encode(prompt).length;

					// console.log("AMOUNT OF INPUT TOKENS", inputTokens);

					let outputTokens = 0;
					let totalContent = '';

					for await (const chunk of stream) {
						const content = chunk.choices[0]?.delta?.content;

						if (content) {
							result += content;
							totalContent += content;
							// Count tokens accurately for the output
							outputTokens = enc.encode(totalContent).length;

							if (content.includes('\n')) {
								const lines = result.split('\n');
								const last_line = lines.length > 1 ? lines[lines.length - 2] : null;

								if (!last_line) {
									continue;
								}

								const comments = last_line.split('// ');

								if (comments.length > 1) {
									let comment = comments[comments.length - 1];
									if (comment) this.agent.effect.thought(comment);
								}
							}
						}
					}

					// Free the encoder to prevent memory leaks
					enc.free();

					// Update token usage after stream completes
					this.agent.record_token_usage(inputTokens, outputTokens, this.model);

					console.log('======= GENERATED CODE', this.current_plan_code ? '(UPDATING)' : '(CREATING)');
					console.log(result);
					console.log('================');

					// Process the generated result
					if (result.startsWith('```typescript')) {
						result = result.slice(13, -3).trim();
					} else if (result.startsWith('```')) {
						result = result.slice(4, -3).trim();
					}

					// Validation and correction
					if (this.current_plan_code) {
						// For updates: check for problematic patterns
						if (result.includes('function create_plan()') || result.includes('return create_plan()') || result.includes('return plan;')) {
							console.log('Generated code contains prohibited elements. Retrying...');
							retries++;
							continue;
						}

						// Ensure the placeholder is preserved
						if (!result.includes('/* generate new code here */')) {
							result += '\n\n/* generate new code here */';
						}
					} else {
						// For new plans: make additional validations
						if (result.includes('function create_plan()') || result.includes('return create_plan();')) {
							console.log('Generated code contains function definition. Retrying...');
							retries++;
							continue;
						}

						// Ensure the placeholder is preserved
						if (!result.includes('/* generate new code here */')) {
							result += '\n\n/* generate new code here */';
						}
					}

					// If we have existing code, update it with the new code
					if (this.current_plan_code) {
						// Replace the placeholder comment with the new code
						const updated_code = this.current_plan_code.replace('/* generate new code here */', result);

						// Store the updated code for future updates
						this.current_plan_code = updated_code;
						this.agent.current_execution_code_plan = updated_code;

						return updated_code;
					} else {
						// For a completely new plan, make sure it has the right structure
						if (!result.includes('function create_plan()')) {
							result = `function create_plan() {
  const plan = new AgentExecutionPlan();
  
  ${result}
  
  return plan;
}

return create_plan();`;
						}

						// Store the new code for future updates
						this.current_plan_code = result;
						this.agent.current_execution_code_plan = result;

						return result;
					}
				} catch (error) {
					console.error(`Error in generation attempt ${retries + 1}:`, error);
					retries++;
					if (retries >= MAX_RETRIES) {
						throw error; // Re-throw if we've exhausted retries
					}
				}
			}

			// If we reach here, the code is valid
			return result;
		} catch (error) {
			console.error('Error generating plan code after all retries:', error);

			// Fallback code in case the API call fails
			if (this.current_plan_code) {
				// If we have existing code, just return it without changes
				console.log('Using existing plan code as fallback');
				return this.current_plan_code;
			} else {
				// Only use the minimal fallback if we have no existing code
				const fallback_code = `
function create_plan() {
    const plan = new AgentExecutionPlan();
    const main_task = plan.add_task({
        title: "Process user request",
        description: "Analyze and respond to the user's goal"
    });
    main_task.add_outcome("response", "The response to the user's request", "string");
    return plan;
}
return create_plan();`;

				this.current_plan_code = fallback_code;
				return fallback_code;
			}
		}
	}

	private async _execute_plan_code(code: string): Promise<AgentExecutionPlan> {
		// console.log('CodeAct: Executing plan code');

		try {
			// Create a safe execution environment
			const sandbox = {
				AgentExecutionPlan: AgentExecutionPlan,
				Task: Task,
				console: console,
			};

			// Wrap the code to ensure it returns a plan
			const wrapped_code = `
				try {
					const result = (function() {
						${code}
					})();
					plan = result instanceof AgentExecutionPlan ? result : null;
				} catch (error) {
					console.error("Error executing plan code:", error);
					throw error; // Re-throw to catch in outer scope
				}
			`;

			// Execute the code in the sandbox
			const vm = require('vm');
			const context = vm.createContext(sandbox);
			let plan;
			vm.runInContext(wrapped_code, context);
			plan = context.plan;

			if (plan instanceof AgentExecutionPlan) {
				// console.log('CodeAct: Plan execution successful');
				return plan;
			} else {
				throw new Error('Plan execution did not return a valid AgentExecutionPlan instance');
			}
		} catch (error) {
			console.error('CodeAct: Error during plan execution:', error);

			// Instead of immediately using fallback, try to fix the code
			const fixed_code = await this._fix_plan_code(code, error);

			// If we got fixed code, try to execute it
			if (fixed_code && fixed_code !== code) {
				// console.log('CodeAct: Attempting to execute fixed code');
				return this._execute_plan_code(fixed_code);
			}

			// If we couldn't fix the code or reached max retries
			// Return the previous version of the plan if execution failed
			if (this.agent.current_execution_code_plan && this.agent.current_execution_code_plan !== code) {
				// Try to execute the previous version of the code
				return this._execute_plan_code(this.agent.current_execution_code_plan);
			} else {
				// If there's no previous version or it's the same code, create a default plan
				const default_plan = new AgentExecutionPlan();
				default_plan.add_task({
					title: 'Process user query',
					description: 'Analyze and respond to user request',
				});
				return default_plan;
			}
		}
	}

	private async _fix_plan_code(code: string, error: any): Promise<string | null> {
		const MAX_FIX_ATTEMPTS = 2; // Allow 2 fix attempts
		let current_code = code;

		for (let attempt = 0; attempt < MAX_FIX_ATTEMPTS; attempt++) {
			try {
				//console.log(`CodeAct: Attempting to fix code (attempt ${attempt + 1}/${MAX_FIX_ATTEMPTS})`);

				// Send effectsStream to the user that we're fixing the plan
				const fixMessages = [
					'Fixing an issue in the plan...',
					'Correcting an error in the execution plan...',
					'Resolving a problem with the plan structure...',
					'Repairing the execution plan...',
					'Addressing an error in the plan code...',
				];

				// Select a random message from the array
				const randomIndex = Math.floor(Math.random() * fixMessages.length);
				const fixMessage = fixMessages[randomIndex];
				
				// Send the thought to the effectsStream stream
				if (fixMessage) {
					this.agent.effect.thought(fixMessage);
				}

				const error_message = error.toString();
				const error_stack = error.stack ? error.stack.toString() : '';

				const fix_prompt = `
You previously generated plan code that has an execution error. Please fix the code.

ERROR:
${error_message}

ERROR STACK:
${error_stack}

CURRENT CODE:
\`\`\`typescript
${current_code}
\`\`\`

Please provide ONLY the fixed code. Make sure it follows all the original requirements:
1. The code must be valid TypeScript
2. It must return an AgentExecutionPlan instance
3. Preserve the /* generate new code here */ comment
4. Do not include explanations, only provide the fixed code
`;

				const openai = createOpenAIClient();
				const response = await openai.chat.completions.create({
					model: this.model,
					messages: [
						{
							role: 'system',
							content:
								'You are a helpful assistant, expert coder, and expert in fixing TypeScript code. You provide only the fixed code without explanations.',
						},
						{ role: 'user', content: fix_prompt },
					],
					temperature: 0,
				});

				// Calculate token usage
				const usage = response.usage;
				if (usage) {
					this.agent.record_token_usage(
						usage.prompt_tokens,
						usage.completion_tokens,
						this.model
					);
				}

			

				let fixed_code = response.choices[0]?.message?.content || '';

				// Process the generated result
				if (fixed_code.startsWith('```typescript')) {
					fixed_code = fixed_code.slice(13).trim();
					if (fixed_code.endsWith('```')) {
						fixed_code = fixed_code.slice(0, -3).trim();
					}
				} else if (fixed_code.startsWith('```')) {
					fixed_code = fixed_code.slice(4).trim();
					if (fixed_code.endsWith('```')) {
						fixed_code = fixed_code.slice(0, -3).trim();
					}
				}

				// Ensure the placeholder is preserved
				if (!fixed_code.includes('/* generate new code here */')) {
					fixed_code += '\n\n/* generate new code here */';
				}

				// Update the current code for the next attempt if needed
				current_code = fixed_code;

				// Store the fixed code for future updates
				this.current_plan_code = fixed_code;
				this.agent.current_execution_code_plan = fixed_code;

				// console.log('CodeAct: Code fixed successfully');
				return fixed_code;
			} catch (fix_error) {
				//console.error(`CodeAct: Error fixing code (attempt ${attempt + 1}):`, fix_error);
				// Continue to next attempt
			}
		}

		// console.error('CodeAct: Failed to fix code after all attempts');
		return null;
	}

	private _send_plan_to_data_stream(plan: AgentExecutionPlan): void {
		// Define types for the plan data structure
		

		// Run validation
		const validation = plan.validate();

		// Get stats
		const stats = plan.get_plan_stats();

		// Convert plan to structured data
		const planData: ExecutionPlanData = {
			id: uuidv4(),
			tasks: [],
			validation,
			stats,
			completed_tasks: [], // Initialize completed tasks array
			active_tasks: [], // Initialize active tasks array
			date: Date.now()
		};

		// Process all tasks
		const tasks = plan.get_all_tasks();
		for (const task of tasks) {
			// Create task data
			const taskData: TaskData = {
				id: task.id,
				title: task.title,
				description: task.description,
				status: task.status,
				priority: task.priority,
				progress_percentage: task.progress_percentage,
				prerequisites: task.prerequisites.map((prerequisite) => ({
					id: prerequisite.id,
					name: prerequisite.name,
					description: prerequisite.description,
				})),
				subtasks: task.subtasks.map((subtask) => ({
					id: subtask.id,
					title: subtask.title,
					description: subtask.description,
					status: subtask.status,
					priority: subtask.priority,
					progress_percentage: subtask.progress_percentage,
					prerequisites: subtask.prerequisites.map((prerequisite) => ({
						id: prerequisite.id,
						name: prerequisite.name,
						description: prerequisite.description,
					})),
					subtasks: [],
				})),
			};

			// Add dependency if exists with human-readable information
			if (task.depends_on) {
				taskData.depends_on = {
					task_id: task.depends_on.task.id,
					task_title: task.depends_on.task.title, // Add task title
				};
			}

			// Add parent ID if it's a subtask
			if (task.parent) {
				taskData.parent_id = task.parent.id;
			}

			// Add to the appropriate array based on completion status
			if (task.status === TaskStatus.COMPLETED) {
				planData.completed_tasks.push(taskData);
			} else {
				planData.active_tasks.push(taskData);
			}

			// Also add to the main tasks array for backward compatibility
			planData.tasks.push(taskData);
		}

		// Send plan data to the data stream
		// this.effect.execution_plan_update({
		// 	...planData,
		// 	date: Date.now()
		// });

		// Log validation results if there are issues
		if (!validation.valid) {
			// 	console.log('CodeAct: Plan validation issues:');
			validation.issues.forEach((issue, index) => {
				// console.log(`  ${index + 1}. ${issue}`);
			});
		}

		// console.log('CodeAct: Plan data sent to data stream');
	}

	private _log_in_file(plan_code: string) {
		try {
			const fs = require('fs');
			const path = require('path');

			// Create a timestamp for unique filename
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const filename = `plan_code_${timestamp}.ts`;

			// Determine the directory path - using a logs directory in the project root
			const logDir = path.join(process.cwd(), 'logs');

			// Create the logs directory if it doesn't exist
			if (!fs.existsSync(logDir)) {
				fs.mkdirSync(logDir, { recursive: true });
			}

			const filePath = path.join(logDir, filename);

			// Write the plan code to the file
			fs.writeFileSync(filePath, plan_code);

			// console.log(`CodeAct: Plan code saved to ${filePath}`);
		} catch (error) {
			// console.error('CodeAct: Error saving plan code to file:', error);
		}
	}

	private _format_views_as_json(views: SerializedView[]): string {

		// console.log("FORMATTING VIEWS, views in memory : ", views.length)


		interface FormattedView {
			name: string;
			description: string;
			links: Array<{
				name: string;
				description: string;
			}>;
			actions: Array<{
				name: string;
				description: string;
			}>;
			components?: FormattedView[];
		}

		const formattedViews = views.map((view) => {
			// Create a simplified view object
			const formattedView: FormattedView = {
				name: view.name,
				description: view.description,
				links: view.clickable_links.map((link) => ({
					name: link.name,
					description: link.description,
				})),
				actions: view.actions.map((action) => ({
					name: action.label,
					description: action.description,
				}))
			};

			// Format components if they exist
			if (view.components && view.components.length > 0) {
				formattedView.components = JSON.parse(this._format_views_as_json(view.components));
			}

			return formattedView;
		});

		return JSON.stringify(formattedViews, null, 2);
	}

}

export default PlannerAgent;



// Add these enum definitions before the Task class
export enum TaskStatus {
	NOT_STARTED = 'not_started',
	IN_PROGRESS = 'in_progress',
	BLOCKED = 'blocked',
	COMPLETED = 'completed',
}

export enum TaskPriority {
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	CRITICAL = 'critical',
}

class Task {
	id: string;
	title: string;
	description: string;
	subtasks: Task[] = [];
	prerequisites: Prerequisite[] = [];
	depends_on: { task: Task } | null = null;
	status: TaskStatus = TaskStatus.NOT_STARTED;
	priority: TaskPriority = TaskPriority.MEDIUM;
	progress_percentage: number = 0;
	parent: Task | null = null;

	// For backward compatibility
	get is_done(): boolean {
		return this.status === TaskStatus.COMPLETED;
	}

	set is_done(value: boolean) {
		this.status = value ? TaskStatus.COMPLETED : TaskStatus.NOT_STARTED;
	}

	constructor({ title, description }: { title: string; description: string }) {
		this.id = uuidv4();
		this.title = title;
		this.description = description;
	}

	add_prerequisite(name: string, description: string): Prerequisite {
		const prerequisite = new Prerequisite(name, description);
		this.prerequisites.push(prerequisite);
		console.log(`Task ${this.title}: Added prerequisite "${name}"`);
		return prerequisite;
	}

	depends_on_task(task: Task): void {
		this.depends_on = { task };
		console.log(`Task ${this.title}: Now depends on task "${task.title}"`);
	}

	// New methods for status management
	update_status(status: TaskStatus): void {
		const oldStatus = this.status;
		this.status = status;

		// Auto-update progress when marked as complete
		if (status === TaskStatus.COMPLETED && this.progress_percentage < 100) {
			this.progress_percentage = 100;
		} else if (status === TaskStatus.NOT_STARTED && this.progress_percentage > 0) {
			this.progress_percentage = 0;
		}

		console.log(`Task ${this.title}: Status updated from ${oldStatus} to ${status}`);
	}

	// Keep this for backward compatibility
	mark_as_completed(): void {
		this.update_status(TaskStatus.COMPLETED);
	}

	// New methods for priority management
	update_priority(priority: TaskPriority): void {
		const oldPriority = this.priority;
		this.priority = priority;
		console.log(`Task ${this.title}: Priority updated from ${oldPriority} to ${priority}`);
	}

	// New methods for progress tracking
	update_progress(percentage: number): void {
		if (percentage < 0 || percentage > 100) {
			throw new Error('Progress percentage must be between 0 and 100');
		}

		this.progress_percentage = percentage;

		// Auto-update status based on progress
		if (percentage === 100 && this.status !== TaskStatus.COMPLETED) {
			this.status = TaskStatus.COMPLETED;
			console.log(`Task ${this.title}: Automatically marked as completed at 100% progress`);
		} else if (percentage > 0 && this.status === TaskStatus.NOT_STARTED) {
			this.status = TaskStatus.IN_PROGRESS;
			console.log(`Task ${this.title}: Automatically marked as in progress`);
		}

		console.log(`Task ${this.title}: Progress updated to ${percentage}%`);
	}

	update_description(description: string): void {
		this.description = description;
		console.log(`Task ${this.title}: Updated description`);
	}

	update_title(title: string): void {
		const oldTitle = this.title;
		this.title = title;
		console.log(`Task renamed: "${oldTitle}" → "${title}"`);
	}

	remove_prerequisite(prerequisite: Prerequisite): void {
		const index = this.prerequisites.findIndex((p) => p.id === prerequisite.id);

		if (index === -1) {
			throw new Error('Prerequisite not found in task');
		}

		this.prerequisites.splice(index, 1);
		console.log(`Task ${this.title}: Removed prerequisite "${prerequisite.name}"`);
	}

	blank_task(reason: string = 'Task deemed unnecessary'): void {
		this.status = TaskStatus.COMPLETED;
		this.progress_percentage = 100;
		this.description = `[BLANKED] ${this.description}\n\nReason: ${reason}`;
		this.title = `[BLANKED] ${this.title}`;
		console.log(`Task blanked: "${this.title}" - Reason: ${reason}`);
	}
}

class Prerequisite {
	id: string;

	constructor(
		public name: string,
		public description: string,
	) {
		this.id = uuidv4();
	}
}

export class AgentExecutionPlan {
	tasks: Task[] = [];

	constructor() {}

	add_task({ title, description }: { title: string; description: string }): Task {
		const task = new Task({ title, description });
		this.tasks.push(task);
		console.log(`Execution Plan: Added task "${title}"`);
		return task;
	}

	add_task_after(after_task: Task, { title, description }: { title: string; description: string }): Task {
		const task = new Task({ title, description });
		const index = this.tasks.findIndex((t) => t.id === after_task.id);

		if (index === -1) {
			throw new Error('Task not found in execution plan');
		}

		this.tasks.splice(index + 1, 0, task);
		console.log(`Execution Plan: Added task "${title}" after "${after_task.title}"`);
		return task;
	}

	add_task_at_index(index: number, { title, description }: { title: string; description: string }): Task {
		const task = new Task({ title, description });

		if (index < 0 || index > this.tasks.length) {
			throw new Error(`Invalid index: ${index}. Valid range is 0 to ${this.tasks.length}`);
		}

		this.tasks.splice(index, 0, task);
		console.log(`Execution Plan: Added task "${title}" at index ${index}`);
		return task;
	}

	remove_task(task: Task): void {
		const index = this.tasks.findIndex((t) => t.id === task.id);

		if (index === -1) {
			throw new Error('Task not found in execution plan');
		}

		this.tasks.splice(index, 1);
		console.log(`Execution Plan: Removed task "${task.title}"`);
	}

	create_subtask(parent_task: Task, { title, description }: { title: string; description: string }): Task {
		const subtask = new Task({ title, description });
		const task = this.tasks.find((t) => t.id === parent_task.id);

		if (!task) {
			throw new Error('Parent task not found in execution plan');
		}

		subtask.parent = parent_task;
		task.subtasks.push(subtask);
		console.log(`Execution Plan: Added subtask "${title}" to "${parent_task.title}"`);
		return subtask;
	}

	update_description(task: Task, description: string): void {
		const found_task = this.tasks.find((t) => t.id === task.id);

		if (!found_task) {
			throw new Error('Task not found in execution plan');
		}

		found_task.update_description(description);
	}

	mark_as_completed(task: Task): void {
		const found_task = this.tasks.find((t) => t.id === task.id);

		if (!found_task) {
			throw new Error('Task not found in execution plan');
		}

		found_task.mark_as_completed();
	}

	get_task_by_id(id: string): Task | undefined {
		return this.tasks.find((t) => t.id === id);
	}

	get_all_tasks(): Task[] {
		return [...this.tasks];
	}

	serialize(): string {
		// Serialize the execution plan into a structured JSON format
		// that is easily understandable for a language model
		const serializedTasks = this.tasks.map((task) => ({
			id: task.id,
			title: task.title,
			description: task.description,
			is_done: task.is_done,
			parent_id: task.parent ? task.parent.id : null,
			subtasks: task.subtasks.map((subtask) => ({
				id: subtask.id,
				title: subtask.title,
				description: subtask.description,
				is_done: subtask.is_done,
			})),
		}));

		// Create a comprehensive representation of the execution plan
		const serializedPlan = {
			tasks: serializedTasks,
			metadata: {
				total_tasks: this.tasks.length,
				completed_tasks: this.tasks.filter((t) => t.is_done).length,
				pending_tasks: this.tasks.filter((t) => !t.is_done).length,
			},
		};

		return JSON.stringify(serializedPlan, null, 2);
	}

	// Add plan validation method
	validate(): { valid: boolean; issues: string[] } {
		const issues: string[] = [];
		const all_tasks = this.get_all_tasks();

		// Check for empty plans
		if (all_tasks.length === 0) {
			issues.push('Plan has no tasks');
		}

		// Check for invalid dependencies
		const tasks_with_dependencies = all_tasks.filter((task) => task.depends_on !== null);
		for (const task of tasks_with_dependencies) {
			if (!task.depends_on) continue; // TypeScript safety check

			const dependency_task = task.depends_on.task;

			// Check if the dependency task exists in the plan
			if (!all_tasks.some((t) => t.id === dependency_task.id)) {
				issues.push(`Task "${task.title}" depends on a task that is not in the plan`);
			}
		}

		// Check for circular dependencies
		const checked_tasks = new Set<string>();
		const visiting_tasks = new Set<string>();

		const check_circular_dependencies = (task_id: string): boolean => {
			if (checked_tasks.has(task_id)) return false;
			if (visiting_tasks.has(task_id)) return true;

			visiting_tasks.add(task_id);

			const task = all_tasks.find((t) => t.id === task_id);
			if (!task || !task.depends_on) {
				checked_tasks.add(task_id);
				visiting_tasks.delete(task_id);
				return false;
			}

			const has_circular = check_circular_dependencies(task.depends_on.task.id);

			checked_tasks.add(task_id);
			visiting_tasks.delete(task_id);

			return has_circular;
		};

		for (const task of all_tasks) {
			if (check_circular_dependencies(task.id)) {
				issues.push(`Circular dependency detected involving task "${task.title}"`);
				break; // Only report one circular dependency
			}
		}

		return { valid: issues.length === 0, issues };
	}

	// Helper to get stats about the plan
	get_plan_stats(): {
		total_tasks: number;
		completed_tasks: number;
		in_progress_tasks: number;
		blocked_tasks: number;
		not_started_tasks: number;
		total_progress_percentage: number;
	} {
		const all_tasks = this.get_all_tasks();
		const total = all_tasks.length;

		if (total === 0) {
			return {
				total_tasks: 0,
				completed_tasks: 0,
				in_progress_tasks: 0,
				blocked_tasks: 0,
				not_started_tasks: 0,
				total_progress_percentage: 0,
			};
		}

		const completed = all_tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
		const in_progress = all_tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
		const blocked = all_tasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
		const not_started = all_tasks.filter((t) => t.status === TaskStatus.NOT_STARTED).length;

		// Calculate overall progress percentage
		const total_progress = all_tasks.reduce((sum, task) => sum + task.progress_percentage, 0);
		const average_progress = Math.round(total_progress / total);

		return {
			total_tasks: total,
			completed_tasks: completed,
			in_progress_tasks: in_progress,
			blocked_tasks: blocked,
			not_started_tasks: not_started,
			total_progress_percentage: average_progress,
		};
	}

	blank_task(task: Task, reason: string = 'Task deemed unnecessary'): void {
		const found_task = this.tasks.find((t) => t.id === task.id);

		if (!found_task) {
			throw new Error('Task not found in execution plan');
		}

		found_task.blank_task(reason);
		console.log(`Execution Plan: Blanked task "${task.title}" - Reason: ${reason}`);
	}

	mark_as_started(task: Task): void {
		const found_task = this.tasks.find((t) => t.id === task.id);

		if (!found_task) {
			throw new Error('Task not found in execution plan');
		}

		found_task.update_status(TaskStatus.IN_PROGRESS);
		console.log(`Execution Plan: Marked task "${task.title}" as started`);
	}
}
