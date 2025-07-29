import { ComputerImage } from './computer-image';
import { Agent as AgentType, Task, OsLog } from '@joshu/os-types';
import { AgentOptions, TaskOptions, AgentSubscriber, TaskSubscriber } from './types';

/**
 * Simplified Agent that communicates with the server for all operations
 */
export class Agent {
	private computer: ComputerImage;
	private agentId: string | null = null;
	private agentName: string;

	constructor(computer: ComputerImage, options: AgentOptions) {
		this.computer = computer;
		this.agentName = options.name;
		
		// Send agent creation request to server
		this.createAgent(options);
	}

	/**
	 * Factory method to create an Agent from a ComputerImage
	 */
	static fromComputer(computer: ComputerImage, options: AgentOptions): Agent {
		return new Agent(computer, options);
	}

	/**
	 * Create agent on the server
	 */
	private async createAgent(options: AgentOptions): Promise<void> {
		if (!this.computer.isConnected()) {
			throw new Error('Computer not connected to JOSHU OS');
		}

		const message = {
			type: 'create_agent',
			name: options.name,
			description: options.description,
			instructions: options.instructions,
		};

		try {
			await this.computer.sendWebSocketMessage(message);
			console.log(`🤖 Agent creation request sent: ${options.name}`);
		} catch (error) {
			console.error('Failed to send agent creation request:', error);
			return;
		}
		
		// Listen for document updates to get the agent ID
		const unsubscribe = this.computer.subscribe((doc) => {
			if (doc && doc.agents && doc.agents.length > 0 && !this.agentId) {
				// Look for an agent with matching name
				const matchingAgent = doc.agents.find(agent => 
					agent.name === options.name
				);
				
				if (matchingAgent) {
					this.agentId = matchingAgent.id;
					console.log(`✅ Agent ID acquired: ${this.agentId.slice(0, 8)}... (${matchingAgent.name})`);
					unsubscribe();
				}
			}
		});

		// Give it a longer timeout for agent creation
		setTimeout(() => {
			if (!this.agentId) {
				console.warn(`⚠️  Agent ID not acquired after timeout for ${options.name}`);
				console.warn('   The agent may still be created - check the server logs');
			}
		}, 5000);
	}

	/**
	 * Assign a task to this agent
	 */
	async assignTask(options: TaskOptions): Promise<string> {
		if (!this.computer.isConnected()) {
			throw new Error('Computer not connected to JOSHU OS');
		}

		if (!this.agentId) {
			throw new Error('Agent not created yet - wait for agent creation to complete');
		}

		const message = {
			type: 'assign_task',
			agentId: this.agentId,
			description: options.description,
		};

		try {
			await this.computer.sendWebSocketMessage(message);
			console.log(`📋 Task assignment request sent to agent ${this.agentId.slice(0, 8)}...`);
			return 'pending'; // Server will provide actual task ID
		} catch (error) {
			console.error('Failed to assign task:', error);
			throw error;
		}
	}

	/**
	 * Send a user query message to the JOSHU OS
	 */
	async give_task(message: string): Promise<void> {
		if (!this.computer.isConnected()) {
			throw new Error('Computer not connected to JOSHU OS');
		}

		const messageData = {
			type: 'user_message',
			message: message,
		};

		try {
			await this.computer.sendWebSocketMessage(messageData);
			console.log(`💬 User query sent: ${message.slice(0, 50)}${message.length > 50 ? '...' : ''}`);
		} catch (error) {
			console.error('Failed to send user query:', error);
			throw error;
		}
	}

	/**
	 * Pause the agent
	 */
	async pause(): Promise<void> {
		if (!this.computer.isConnected()) {
			throw new Error('Computer not connected to JOSHU OS');
		}

		const message = {
			type: 'pause'
		};

		try {
			await this.computer.sendWebSocketMessage(message);
			console.log(`⏸️  Agent paused: ${this.agentName}`);
		} catch (error) {
			console.error('Failed to pause agent:', error);
			throw error;
		}
	}

	/**
	 * Resume the agent
	 */
	async resume(): Promise<void> {
		if (!this.computer.isConnected()) {
			throw new Error('Computer not connected to JOSHU OS');
		}

		const message = {
			type: 'resume'
		};

		try {
			await this.computer.sendWebSocketMessage(message);
			console.log(`▶️  Agent resumed: ${this.agentName}`);
		} catch (error) {
			console.error('Failed to resume agent:', error);
			throw error;
		}
	}

	/**
	 * Subscribe to agent logs - returns logs filtered by this agent's ID
	 */
	subscribeToAgent(callback: (log: OsLog) => void): () => void {
		return this.computer.subscribeToLogs((log: OsLog) => {
			// Only call callback for logs that belong to this agent
			if (this.agentId && log.agent_id === this.agentId) {
				callback(log);
			}
		});
	}

	/**
	 * Subscribe to task updates for a specific task
	 */
	subscribeToTask(taskId: string, callback: TaskSubscriber): () => void {
		return this.computer.subscribe((doc) => {
			if (doc && doc.agents && this.agentId) {
				const agent = doc.agents.find(a => a.id === this.agentId);
				if (agent && agent.tasks) {
					const task = agent.tasks.find((t: Task) => t.id === taskId);
					if (task) {
						callback(task);
					}
				}
			}
		});
	}

	/**
	 * Get agent from document
	 */
	getAgent(): AgentType | null {
		const doc = this.computer.getState();
		if (doc && doc.agents && this.agentId) {
			return doc.agents.find(a => a.id === this.agentId) || null;
		}
		return null;
	}

	/**
	 * Get this agent's document/object from the OS document
	 */
	getState(): AgentType | null {
		const doc = this.computer.getState();
		if (doc && doc.agents && this.agentId) {
			return doc.agents.find(a => a.id === this.agentId) || null;
		}
		return null;
	}

	/**
	 * Get all tasks for this agent
	 */
	getTasks(): Task[] {
		const agent = this.getAgent();
		return agent?.tasks || [];
	}

	/**
	 * Get specific task
	 */
	getTask(taskId: string): Task | null {
		const tasks = this.getTasks();
		return tasks.find((t: Task) => t.id === taskId) || null;
	}

	/**
	 * Get agent ID (may be null if agent not yet created)
	 */
	getId(): string | null {
		return this.agentId;
	}

	/**
	 * Get agent name
	 */
	getName(): string {
		return this.agentName;
	}

	/**
	 * Check if agent is created and has an ID
	 */
	isCreated(): boolean {
		return this.agentId !== null;
	}
} 