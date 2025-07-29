







// Demo function to showcase CodeAct functionality
// export async function runCodeActDemo(feedback: FeedbackStream, query: string): Promise<AgentExecutionPlan> {
// 	console.log('Starting CodeAct Demo with query:', query);

// 	const codeAct = new CodeAct(feedback);
// 	const executionPlan = await codeAct.execute(query);

// 	// Log the execution plan details
// 	console.log('CodeAct Demo - Generated Execution Plan:');
// 	console.log(`Total tasks: ${executionPlan.get_all_tasks().length}`);

// 	executionPlan.get_all_tasks().forEach((task, index) => {
// 		console.log(`Task ${index + 1}: ${task.title}`);
// 		console.log(`  Description: ${task.description}`);
// 		console.log(`  Subtasks: ${task.subtasks.length}`);
// 		console.log(`  Outcomes: ${task.outcomes.length}`);
// 		console.log(`  Is Done: ${task.is_done}`);
// 		console.log(`  Dependencies: ${task.depends_on ? `Depends on "${task.depends_on.outcome.name}" from "${task.depends_on.task.title}"` : 'None'}`);
// 	});

// 	return executionPlan;
// }

// Example usage with a real query
// export async function runRealCodeActExample(query: string | null, feedback: FeedbackStream): Promise<AgentExecutionPlan> {
// 	// const realQuery = "Get the 10 biggest customers and send to each of them a personnalized email based on their profile with a discount of 10% on their next purchase";

// 	const realQuery = query || 'Plan my trip to japan';

// 	console.log('Running real CodeAct example with query:', realQuery);

// 	const codeAct = new CodeAct(feedback);
// 	const executionPlan = await codeAct.execute(realQuery);

// 	// This is what we expect the plan to look like (approximately):
// 	// 1. Requirements Analysis task
// 	// 2. Frontend Design task (depends on Requirements)
// 	// 3. Backend API Development task (depends on ddRequirements)
// 	// 4. Stock Data Integration task (depends on Backend API)
// 	// 5. Data Visualization Component task (depends on Frontend Design)
// 	// 6. Testing task (depends on multiple previous tasks)
// 	// 7. Deployment task (final task)

// 	console.log('Real CodeAct Example - Generated Plan Structure:');
// 	console.log(`Generated ${executionPlan.get_all_tasks().length} tasks for the web application project`);

// 	// Output the task dependency chain
// 	const tasks = executionPlan.get_all_tasks();
// 	console.log('Task Dependency Chain:');
// 	tasks.forEach((task, index) => {
// 		const dependencyInfo = task.depends_on
// 			? `→ Depends on: "${task.depends_on.task.title}" (outcome: ${task.depends_on.outcome.name})`
// 			: '→ No dependencies (starting task)';

// 		console.log(`${index + 1}. ${task.title} ${dependencyInfo}`);
// 	});

// 	return executionPlan;
// }
