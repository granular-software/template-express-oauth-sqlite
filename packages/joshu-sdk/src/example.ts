import { ComputerImage } from './computer-image';
import type { AppsInstallConfig } from '@joshu/os-types';

// Example of how to use the ComputerImage with app configuration
async function main() {
    // Define the apps configuration
    const appsConfig: AppsInstallConfig = {
        apps: [
            {
                name: "Customer Management",
                description: "An application to manage customer information and interactions",
                icon: "👥",
                tabs: [
                    {
                        path: "app_customers_application",
                        label: "Customers",
                        description: "Customer management interface",
                        tab_name: "Customers",
                        components: [
                            {
                                type: "text_input",
                                path: "app_customer_search",
                                label: "Search Customers",
                                description: "Search through customer database"
                            },
                            {
                                type: "instances_list",
                                path: "app_customers_list",
                                label: "Customer List",
                                description: "List of all customers with ability to create new ones",
                                can_create: true,
                                prototype: "customer"
                            }
                        ]
                    }
                ]
            },
            {
                name: "Project Tracker",
                description: "Track project progress and tasks",
                icon: "📊",
                tabs: [
                    {
                        path: "app_projects_application",
                        label: "Projects",
                        description: "Project management interface",
                        tab_name: "Projects",
                        components: [
                            {
                                type: "instances_list",
                                path: "app_projects_list",
                                label: "Project List",
                                description: "List of all projects with ability to create new ones",
                                can_create: true,
                                prototype: "project"
                            }
                        ]
                    }
                ]
            }
        ]
    };

    // Create ComputerImage instance with apps configuration
    const computer = new ComputerImage({
        name: "My Computer with Apps",
        url: "ws://localhost:3002", // Optional: defaults to localhost:3002
        apps: appsConfig
    });

    try {
        // Start the computer - this will join the session and install the apps
        const sessionId = await computer.start();
        console.log(`Computer started with session: ${sessionId}`);
        console.log(`Apps installed: ${appsConfig.apps.map(app => app.name).join(', ')}`);

        // Subscribe to document updates
        const unsubscribe = computer.subscribe((doc) => {
            if (doc) {
                console.log(`Document updated - Windows: ${doc.windows.length}, Agents: ${doc.agents.length}`);
            }
        });

        // Subscribe to logs
        const unsubscribeLogs = computer.subscribeToLogs((log) => {
            console.log(`[${log.type}] ${log.application}: ${JSON.stringify(log.content)}`);
        });

        // Send a message to test the agent
        await computer.sendMessage("Show me the customer management interface");

        // Keep the example running for a bit
        setTimeout(() => {
            unsubscribe();
            unsubscribeLogs();
            computer.stop();
            console.log("Computer stopped");
        }, 30000); // 30 seconds

    } catch (error) {
        console.error("Error starting computer:", error);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

export { main as exampleUsage }; 