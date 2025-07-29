// Database Types
export type ScalarType = 'string' | 'number' | 'boolean' | 'date' | 'json';

export interface DatabaseField {
	name: string;
	type: ScalarType | string; // scalar type or reference to another type
	label: string;
	description: string;
	required?: boolean;
	defaultValue?: any;
}

export interface DatabaseType {
	name: string;
	label: string;
	description: string;
	fields: DatabaseField[];
}

export interface DatabaseSchema {
	types: DatabaseType[];
}

// File System Types
export interface FileSystemEntry {
	name: string;
	type: 'file' | 'directory';
	path: string;
	content?: string; // for files
	children?: FileSystemEntry[]; // for directories
	size?: number;
	createdAt: Date;
	modifiedAt: Date;
}

export interface FileSystem {
	root: FileSystemEntry;
	currentPath: string;
}

// Browser Types
export interface BrowserSettings {
	searchEngine: {
		name: string;
		url: string;
	};
	allowedSites: string[];
	blockedSites: string[];
	homepage: string;
	userAgent?: string;
	enableJavaScript: boolean;
	enableCookies: boolean;
}

// Application Types
export interface Application {
	name: string;
	type: 'database' | 'filesystem' | 'browser' | 'custom';
	enabled: boolean;
	config: any;
}

// Task and Streaming Types
export interface TaskSubscription {
	taskId: string;
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
	progress?: number;
	updates: TaskUpdate[];
}

export interface TaskUpdate {
	id: string;
	timestamp: Date;
	type: 'status_change' | 'progress' | 'message' | 'error' | 'result';
	data: any;
}

export interface AgentStream {
	agentId: string;
	events: StreamEvent[];
}

export interface StreamEvent {
	id: string;
	timestamp: Date;
	type: 'thought' | 'action' | 'observation' | 'task_start' | 'task_end' | 'error';
	data: any;
}

// Computer Configuration
export interface ComputerConfig {
	database?: DatabaseSchema;
	fileSystem?: FileSystem;
	browser?: BrowserSettings;
	applications?: Application[];
}

// Simple agent creation options
export interface AgentOptions {
	name: string;
	description: string;
	instructions: string;
}

// Simple task creation options
export interface TaskOptions {
	description: string;
}

// Simple subscription callback types
export type AgentSubscriber = (agent: any) => void;
export type TaskSubscriber = (task: any) => void; 