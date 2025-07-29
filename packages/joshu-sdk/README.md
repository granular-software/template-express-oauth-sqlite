# @joshu/sdk

A TypeScript SDK for communicating with JOSHU OS - an AI-powered operating system that can control applications and execute tasks autonomously.

## Features

- Connect to JOSHU OS via WebSocket
- Configure and install applications dynamically
- Subscribe to document updates and logs
- Send messages to the AI agent

## Installation

```bash
npm install @joshu/sdk
# or
yarn add @joshu/sdk
# or
bun add @joshu/sdk
```

## Quick Start

### Creating a Computer Image

A `ComputerImage` represents a virtual computer instance that connects to JOSHU OS:

```typescript
import { ComputerImage } from '@joshu/sdk';

const computer = new ComputerImage({
  name: 'MyComputer',
  url: 'ws://localhost:3002', // JOSHU OS WebSocket URL
});

// Start the computer
await computer.start();

// Send a message to the OS
await computer.sendMessage('Please open the notes app');

// Wait for the OS to finish processing
await computer.waitForReady();

// Get the current state
const document = computer.getState();
console.log('Current windows:', document?.windows);
```

### Creating an AI Agent

An `Agent` provides a higher-level interface with memory, task management, and context:

```typescript
import { Agent } from '@joshu/sdk';

const agent = new Agent({
  name: 'TaskAgent',
  instructions: 'You are a helpful AI agent that can manage tasks and applications.',
  url: 'ws://localhost:3002',
});

// Start the agent
await agent.start();

// Execute a task
const task = await agent.executeTask('Create a new note with the title "Meeting Notes"');
console.log('Task result:', task);

// Check agent statistics
const stats = agent.getStats();
console.log('Agent stats:', stats);
```

## App Configuration

You can configure applications to be installed when the ComputerImage starts:

```typescript
import { ComputerImage } from '@joshu/sdk';
import type { AppsInstallConfig } from '@joshu/os-types';

const appsConfig: AppsInstallConfig = {
    apps: [
        {
            name: "Customer Management",
            description: "An application to manage customer information",
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
                            description: "List of all customers",
                            can_create: true,
                            prototype: "customer"
                        }
                    ]
                }
            ]
        }
    ]
};

const computer = new ComputerImage({
    name: "My Computer with Apps",
    apps: appsConfig
});

await computer.start(); // Apps will be automatically installed
```

## Component Types

The following component types are supported:

### Text Input Component
```typescript
{
    type: "text_input",
    path: "unique_path",
    label: "Display Label",
    description: "Component description"
}
```

### Instances List Component
```typescript
{
    type: "instances_list",
    path: "unique_path",
    label: "Display Label", 
    description: "Component description",
    can_create: true, // Whether users can create new instances
    prototype: "entity_type" // The type of entity this list manages
}
```

## Subscribing to Updates

```typescript
// Subscribe to document updates
const unsubscribe = computer.subscribe((doc) => {
    if (doc) {
        console.log(`Windows: ${doc.windows.length}, Agents: ${doc.agents.length}`);
    }
});

// Subscribe to logs
const unsubscribeLogs = computer.subscribeToLogs((log) => {
    console.log(`[${log.type}] ${log.application}: ${JSON.stringify(log.content)}`);
});

// Cleanup
unsubscribe();
unsubscribeLogs();
```

## Sending Messages

```typescript
await computer.sendMessage("Show me the customer management interface");
```

## Complete Example

See `src/example.ts` for a complete working example with multiple apps and components.

## API Reference

### ComputerImage

Represents a virtual computer instance that communicates with JOSHU OS.

#### Constructor

```typescript
new ComputerImage(options?: ComputerImageOptions)
```

Options:
- `id?: string` - Unique identifier for the computer
- `name?: string` - Human-readable name
- `description?: string` - Description of the computer
- `url?: string` - WebSocket URL (default: 'ws://localhost:3002')
- `reconnectAttempts?: number` - Max reconnection attempts (default: 5)
- `reconnectDelay?: number` - Reconnection delay in ms (default: 1000)
- `apps?: AppsInstallConfig` - Apps to install on startup

#### Methods

**Basic Operations:**
- `start(sessionId?: string): Promise<string>` - Start and connect to JOSHU OS
- `startDesktop(sessionId?: string): Promise<string>` - Start in desktop mode
- `stop(): void` - Stop and disconnect
- `isConnected(): boolean` - Check connection status

**Communication:**
- `sendMessage(message: string): Promise<void>` - Send a message to the OS
- `openApp(appName: string): Promise<void>` - Open an application
- `closeWindow(windowId: string): Promise<void>` - Close a window
- `clickLink(windowId: string, routerPath: string): Promise<void>` - Click a link

**Control:**
- `pause(): Promise<void>` - Pause the OS agent
- `resume(): Promise<void>` - Resume the OS agent

**State Access:**
- `getState(): OsDocument | null` - Get current OS document
- `getEvents(): Event[]` - Get all events
- `getThoughts(): Thought[]` - Get all thoughts
- `getWindows(): Window[]` - Get all windows

**Subscriptions:**
- `subscribe(callback: (doc: OsDocument | null) => void): () => void` - Subscribe to document updates
- `subscribeToLogs(callback: (log: OsLog) => void): () => void` - Subscribe to new logs

**Utilities:**
- `waitFor(condition, timeout?): Promise<OsDocument>` - Wait for a condition
- `waitForReady(timeout?): Promise<OsDocument>` - Wait for OS to be ready
- `waitForEvents(count, timeout?): Promise<Event[]>` - Wait for events
- `waitForWindow(matcher, timeout?): Promise<Window>` - Wait for a window

### Agent

High-level AI agent that can execute tasks with memory and context.

#### Constructor

```typescript
new Agent(options: AgentOptions)
```

Options (extends ComputerImageOptions):
- `name: string` - Agent name (required)
- `description?: string` - Agent description
- `instructions?: string` - System instructions for the agent
- `autoStart?: boolean` - Whether to auto-start (not implemented yet)

#### Methods

**Agent Management:**
- `start(sessionId?: string): Promise<string>` - Start the agent
- `startDesktop(sessionId?: string): Promise<string>` - Start in desktop mode
- `stop(): void` - Stop the agent
- `setInstructions(instructions: string): void` - Update agent instructions

**Task Execution:**
- `executeTask(description: string, timeout?: number): Promise<AgentTask>` - Execute a task
- `sendMessage(message: string): Promise<void>` - Send contextual message
- `getCurrentTask(): AgentTask | null` - Get current task
- `isBusy(): boolean` - Check if agent is executing a task
- `waitForIdle(timeout?: number): Promise<void>` - Wait for agent to finish

**Memory & Context:**
- `getMemory(): AgentMemory` - Get agent memory
- `updateContext(key: string, value: any): void` - Update context
- `getContext(key: string): any` - Get context value
- `clearMemory(): void` - Clear agent memory
- `getRecentEvents(count?: number): Event[]` - Get recent events
- `getRecentThoughts(count?: number): Thought[]` - Get recent thoughts

**Event Handling:**
- `onEvent(eventType: string, handler: Function): void` - Register event handler
- `offEvent(eventType: string): void` - Remove event handler

**Statistics:**
- `getStats()` - Get agent statistics
- `getTaskHistory(): AgentTask[]` - Get task history

### JoshuClient

Low-level WebSocket client for direct communication with JOSHU OS.

#### Constructor

```typescript
new JoshuClient(options?: ClientOptions)
```

#### Methods

All the basic WebSocket operations for communicating with JOSHU OS. See ComputerImage for a higher-level interface.

## Examples

### Basic Task Execution

```typescript
import { Agent } from '@joshu/sdk';

const agent = new Agent({
  name: 'ProductivityAgent',
  instructions: 'You help users manage their productivity apps.',
});

await agent.start();

// Execute multiple tasks
await agent.executeTask('Open the calendar app');
await agent.executeTask('Create a meeting for tomorrow at 2 PM');
await agent.executeTask('Add a reminder to prepare presentation');

console.log('Tasks completed:', agent.getStats().completedTasks);
```

### Event Monitoring

```typescript
import { ComputerImage } from '@joshu/sdk';

const computer = new ComputerImage({ name: 'Monitor' });

// Subscribe to real-time updates
computer.subscribe((doc) => {
  if (doc) {
    console.log('New events:', doc.events.length);
    console.log('Active windows:', doc.windows.length);
  }
});

await computer.start();
await computer.sendMessage('Please show me all open applications');
```

### Logs Subscription

```typescript
import { ComputerImage, OsLog } from '@joshu/sdk';

const computer = new ComputerImage({ name: 'LogsMonitor' });

// Subscribe to new logs - callback is called every time a new log is synced
const unsubscribeLogs = computer.subscribeToLogs((log: OsLog) => {
  console.log(`New ${log.type} log from agent ${log.agent_id}:`, {
    id: log.id,
    date: log.date,
    application: log.application,
    content: log.content
  });
});

await computer.start();
await computer.sendMessage('Please open the notes app and create a new note');

// Logs will be printed as they are generated by the OS and agents

// Don't forget to unsubscribe when done
// unsubscribeLogs();
```

### Advanced Agent with Context

```typescript
import { Agent } from '@joshu/sdk';

const agent = new Agent({
  name: 'ProjectManager',
  instructions: 'You are a project management assistant.',
});

// Set up event handlers
agent.onEvent('action', (event) => {
  console.log('Action completed:', event.content);
});

await agent.start();

// Build context over time
agent.updateContext('project', 'Website Redesign');
agent.updateContext('deadline', '2024-01-15');

await agent.executeTask('Create a new project task list');
await agent.executeTask('Add tasks for the website redesign project');

// Agent will use the context in subsequent tasks
const memory = agent.getMemory();
console.log('Agent context:', memory.context);
```

## Error Handling

The SDK includes built-in error handling and retry logic:

```typescript
try {
  const computer = new ComputerImage({
    reconnectAttempts: 3,
    reconnectDelay: 2000,
  });
  
  await computer.start();
  await computer.sendMessage('Hello JOSHU');
  
} catch (error) {
  console.error('Failed to connect or send message:', error);
}
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import { 
  Agent, 
  ComputerImage, 
  OsDocument, 
  Event, 
  AgentTask,
  OsLog
} from '@joshu/sdk';

// All types are fully typed
const handleEvent = (event: Event) => {
  console.log(`Event type: ${event.type}`);
};

const handleLog = (log: OsLog) => {
  console.log(`Log type: ${log.type}, Agent: ${log.agent_id}`);
};

const processTask = (task: AgentTask) => {
  if (task.status === 'completed') {
    console.log('Task finished successfully');
  }
};
```

## Configuration

### Environment Variables

- `JOSHU_OS_URL` - Default WebSocket URL for JOSHU OS
- `JOSHU_RECONNECT_ATTEMPTS` - Default number of reconnection attempts
- `JOSHU_RECONNECT_DELAY` - Default reconnection delay in milliseconds

### Connection Options

```typescript
const options = {
  url: 'ws://localhost:3002',
  reconnectAttempts: 5,
  reconnectDelay: 1000,
};

const agent = new Agent({
  name: 'MyAgent',
  ...options
});
```

## License

MIT 