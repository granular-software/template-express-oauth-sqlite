export * from "../index";

// import { Agent, Task } from '../index';

// export interface ConnectionState {
// 	id: string;
// 	connectedAt: Date;
// 	lastPing: Date;
// }

// export interface FieldDefinition {
// 	name: string;
// 	type: string;
// 	required?: boolean;
// 	defaultValue?: any;
// }

// export interface SerializedView {
// 	id: string;
// 	name: string;
// 	fields: FieldDefinition[];
// 	data: any[];
// }

// export interface ExecutionPlanData {
// 	plan: string;
// 	steps: string[];
// 	currentStep: number;
// 	status: 'planning' | 'executing' | 'completed' | 'failed';
// }

// export interface TokenUsage {
// 	prompt: number;
// 	completion: number;
// 	total: number;
// 	cost?: number;
// }

// export interface SessionState {
// 	status: 'initializing' | 'ready' | 'processing' | 'error' | 'done';
// 	currentAction?: string;
// 	executionPlan?: ExecutionPlanData;
// 	tokenUsage?: TokenUsage;
// }

// export interface ActionReport {
// 	id: string;
// 	type: string;
// 	description: string;
// 	timestamp: Date;
// 	success: boolean;
// 	result?: any;
// 	error?: string;
// }

// export interface TriggerableAction {
// 	id: string;
// 	name: string;
// 	description: string;
// 	enabled: boolean;
// 	hotkey?: string;
// }

// export interface Event {
// 	id: string;
// 	type: string;
// 	timestamp: Date;
// 	data: any;
// 	source?: string;
// }

// export interface Thought {
// 	id: string;
// 	content: string;
// 	timestamp: Date;
// 	type: 'reasoning' | 'planning' | 'observation' | 'decision';
// 	confidence?: number;
// }

// export interface Window {
// 	id: string;
// 	title: string;
// 	app: string;
// 	x: number;
// 	y: number;
// 	width: number;
// 	height: number;
// 	visible: boolean;
// 	focused: boolean;
// 	minimized: boolean;
// 	data?: any;
// }

// export interface OsDocument {
// 	sessionState: SessionState;
// 	windows: Window[];
// 	events: Event[];
// 	thoughts: Thought[];
// 	agents: Agent[];
// 	paused: boolean;
// } 