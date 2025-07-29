// import { Agent } from '../src';

// async function main() {
// 	// Create an agent
// 	const agent = new Agent({
// 		name: 'ProductivityAgent',
// 		description: 'An AI agent that helps with productivity tasks',
// 		instructions: `You are a helpful AI assistant that can interact with applications.
// Your goal is to help users with productivity tasks like managing notes, calendar events, and to-do lists.
// Always be precise and efficient in your actions.`,
// 		url: 'ws://localhost:3002', // Adjust URL as needed
// 	});

// 	try {
// 		console.log('Starting agent...');
		
// 		// Start the agent and connect to JOSHU OS
// 		const sessionId = await agent.start();
// 		console.log(`Agent connected with session: ${sessionId}`);

// 		// Set up event monitoring
// 		agent.onEvent('action', (event) => {
// 			console.log('Action event:', event.content);
// 		});

// 		agent.onEvent('observation', (event) => {
// 			console.log('Observation:', event.content);
// 		});

// 		// Add some context
// 		agent.updateContext('user_name', 'John');
// 		agent.updateContext('preferred_apps', ['notes', 'calendar']);

// 		// Execute a simple task
// 		console.log('\n--- Executing Task 1 ---');
// 		const task1 = await agent.executeTask('Open the notes application');
// 		console.log('Task 1 result:', task1.status);

// 		// Execute a more complex task
// 		console.log('\n--- Executing Task 2 ---');
// 		const task2 = await agent.executeTask('Create a new note with the title "Daily Tasks" and add some sample tasks');
// 		console.log('Task 2 result:', task2.status);

// 		// Wait a bit and check agent memory
// 		await new Promise(resolve => setTimeout(resolve, 2000));
		
// 		const memory = agent.getMemory();
// 		console.log('\n--- Agent Memory ---');
// 		console.log('Total events:', memory.events.length);
// 		console.log('Total thoughts:', memory.thoughts.length);
// 		console.log('Context:', memory.context);

// 		// Get agent statistics
// 		const stats = agent.getStats();
// 		console.log('\n--- Agent Statistics ---');
// 		console.log('Total tasks:', stats.totalTasks);
// 		console.log('Completed tasks:', stats.completedTasks);
// 		console.log('Success rate:', stats.successRate + '%');
// 		console.log('Connected:', stats.isConnected);

// 		// Show recent thoughts
// 		const recentThoughts = agent.getRecentThoughts(5);
// 		console.log('\n--- Recent Thoughts ---');
// 		recentThoughts.forEach((thought, index) => {
// 			console.log(`${index + 1}. ${thought.content}`);
// 		});

// 	} catch (error) {
// 		console.error('Error:', error);
// 	} finally {
// 		// Clean up
// 		console.log('\nStopping agent...');
// 		agent.stop();
// 	}
// }

// // Run the example
// if (require.main === module) {
// 	main().catch(console.error);
// } 