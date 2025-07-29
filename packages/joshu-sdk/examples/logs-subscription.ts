import { ComputerImage, Agent, OsLog } from "@joshu/sdk";

async function demonstrateLogsSubscription() {
	// Create and start a computer instance
	const computer = new ComputerImage({ name: "LogsDemo" });
	
	try {
		console.log("🚀 Starting computer session...");
		await computer.start();

		// Subscribe to logs - this will call the callback every time a new log is synced
		console.log("📋 Setting up logs subscription...");
		const unsubscribeLogs = computer.subscribeToLogs((log: OsLog) => {
			console.log("📝 New log received:", {
				id: log.id.slice(0, 8) + "...",
				type: log.type,
				agent_id: log.agent_id?.slice(0, 8) + "...",
				date: log.date,
				application: log.application,
				content_description: log.content.description || "No description"
			});
		});

		// Create an agent to generate some logs
		const agent = Agent.fromComputer(computer, {
			name: "LogsTestAgent",
			description: "An agent to test logs subscription",
			instructions: "You help users with their tasks and generate logs."
		});

		console.log("🤖 Agent created, sending user query to generate logs...");
		await agent.sendUserQuery("Please say hello and explain what you can do");

		// Let it run for a bit to collect logs
		console.log("⏰ Waiting for logs to be generated...");
		await new Promise(resolve => setTimeout(resolve, 10000));

		// Cleanup
		console.log("🧹 Cleaning up...");
		unsubscribeLogs();
		computer.stop();
		
	} catch (error) {
		console.error("❌ Error:", error);
	}
}

// Run the demonstration
demonstrateLogsSubscription().catch(console.error); 