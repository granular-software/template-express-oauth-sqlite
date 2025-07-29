// import { Card, CardContent } from '@/components/ui/card';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
// import { Progress } from '@/components/ui/progress';
// import { useMediaQuery } from '@/hooks/use-media-query';
// import { cn } from '@/lib/utils';
// import { XLogo } from '@phosphor-icons/react';
// import { AnimatePresence, motion } from 'framer-motion';
// import {
// 	AlertCircle,
// 	AlertTriangle,
// 	BookA,
// 	CheckCircle,
// 	ChevronDown,
// 	ChevronRight,
// 	Circle,
// 	CircleCheck,
// 	FileText,
// 	List,
// 	Loader2,
// 	Pause,
// 	Sparkles
// } from 'lucide-react';
// import Image from 'next/image';
// import React, { useState } from 'react';
// import { Tweet } from 'react-tweet';
// import { TextShimmer } from './core/text-shimmer';
// import { StreamUpdate } from './reason-search/view-types';
// import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card';
// import { ExecutionPlan } from '@joshu/os-types';

// // import { ast } from '@repo/app-notes/ast';

// // console.log(ast);

// // export interface StreamUpdate {
// //     id: string;
// //     type: 'plan' | 'web' | 'academic' | 'analysis' | 'progress' | 'x';
// //     status: 'running' | 'completed';
// //     timestamp: number;
// //     message: string;
// //     plan?: {
// //         search_queries: Array<{
// //             query: string;
// //             rationale: string;
// //             source: 'web' | 'academic' | 'both' | 'x' | 'all';
// //             priority: number;
// //         }>;
// //         required_analyses: Array<{
// //             type: string;
// //             description: string;
// //             importance: number;
// //         }>;
// //         special_considerations: string[];
// //     };
// //     query?: string;
// //     source?: string;
// //     results?: Array<{
// //         url: string;
// //         title: string;
// //         content: string;
// //         source: 'web' | 'academic' | 'x';
// //         tweetId?: string;
// //     }>;
// //     findings?: Array<{
// //         insight: string;
// //         evidence: string[];
// //         confidence: number;
// //     }>;
// //     analysisType?: string;
// //     completedSteps?: number;
// //     totalSteps?: number;
// //     isComplete?: boolean;
// //     title?: string;
// //     overwrite?: boolean;
// //     advancedSteps?: number;
// //     gaps?: Array<{
// //         topic: string;
// //         reason: string;
// //         additional_queries: string[];
// //     }>;
// //     recommendations?: Array<{
// //         action: string;
// //         rationale: string;
// //         priority: number;
// //     }>;
// //     uncertainties?: string[];
// // }

// // export interface ExecutionPlanUpdate {
// // 	type: 'execution_plan_update';
// // 	data: {
// // 		id: string;
// // 		date: number;
// // 		tasks: Array<{
// // 			id: string;
// // 			title: string;
// // 			description: string;
// // 			status: string;
// // 			priority: string;
// // 			progress_percentage: number;
// // 			is_done: boolean;
// // 			/* outcomes: Array<{
// // 				id: string;
// // 				name: string;
// // 				description: string;
// // 				type: string;
// // 				is_list: boolean;
// // 			}>; */
// // 			depends_on?: {
// // 				task_id: string;
// // 				outcome_id: string;
// // 			};
// // 			subtasks: Array<{
// // 				id: string;
// // 				title: string;
// // 				description: string;
// // 				is_done: boolean;
// // 				status?: string;
// // 				priority?: string;
// // 				progress_percentage?: number;
// // 				/* outcomes: Array<{
// // 					id: string;
// // 					name: string;
// // 					description: string;
// // 					type: string;
// // 					is_list: boolean;
// // 				}>; */
// // 				prerequisites?: Array<{
// // 					id: string;
// // 					name: string;
// // 					description: string;
// // 				}>;
// // 			}>;
// // 			prerequisites?: Array<{
// // 				id: string;
// // 				name: string;
// // 				description: string;
// // 			}>;
// // 		}>;
// // 		validation?: {
// // 			valid: boolean;
// // 			issues: string[];
// // 		};
// // 		stats?: {
// // 			total_tasks: number;
// // 			completed_tasks: number;
// // 			in_progress_tasks: number;
// // 			blocked_tasks: number;
// // 			not_started_tasks: number;
// // 			total_progress_percentage: number;
// // 		};
// // 	};
// // }

// // export interface ThoughtUpdate {
// // 	type: 'thought';
// // 	data: {
// // 		id: string;
// // 		date: number;
// // 		thought: string;
// // 		timestamp: number;
// // 		overwrite: boolean;
// // 		is_done: boolean;
// // 	};
// // }

// // export interface LoadedViewsUpdate {
// // 	type: 'loaded_views';
// // 	data: {
// // 		id: string;
// // 		date: number;
// // 		views: Array<{
// // 			name: string;
// // 			description: string;
// // 			links: Array<{
// // 				name: string;
// // 				description: string;
// // 			}>;
// // 			actions: Array<any>;

// // 			view_component: ViewComponent
// // 		}>;
// // 	};
// // }

// // export interface SelectedOptionsUpdate {
// // 	type: 'selected_options';
// // 	data: {
// // 		id: string;
// // 		date: number;
// // 		options: Array<{
// // 			name: string;
// // 			serialized_view: {
// // 				name: string;
// // 				description: string;
// // 				links: Array<{
// // 					name: string;
// // 					description: string;
// // 					alias: string;
// // 				}>;
// // 				actions: Array<any>;
// // 			};
// // 			is_action: boolean;
// // 			is_link: boolean;
// // 			score: number;
// // 			token: string;
// // 		}>;
// // 	};
// // }

// // export type StreamUpdate = ExecutionPlanUpdate | ThoughtUpdate | LoadedViewsUpdate | SelectedOptionsUpdate;

// export const LastThought = ({ thought }: { thought: string }) => {
// 	return (
// 		// <div className="space-y-2">
// 		// 	<TextShimmer className="text-sm font-medium">{thought}</TextShimmer>
// 		// </div><

// 		<div>
// 			<div className="flex items-center justify-between mt-5 mb-2">
// 				<div className="flex items-center gap-2">
// 					{thought.match(/^[\p{Emoji}]/u) ? (
// 						<div className="size-8 flex items-center justify-center">{thought.match(/^[\p{Emoji}]/u)?.[0]}</div>
// 					) : (
// 						<Image src="/joshu.svg" alt="Joshu" className="size-8 invert-0 " width={100} height={100} unoptimized quality={100} />
// 					)}
// 					<h2 className="text-lg font-semibold font-lora text-neutral-800 dark:text-neutral-200">Joshu</h2>
// 				</div>
// 			</div>
// 			<TextShimmer className="text-sm font-medium">{thought.match(/^[\p{Emoji}]/u) ? thought.replace(/^[\p{Emoji}]/u, '') : thought}</TextShimmer>
// 		</div>
// 	);
// };

// const SourcesList = ({ sources, type }: { sources: any[]; type: 'web' | 'academic' | 'x' }) => {
// 	if (type === 'x') {
// 		return (
// 			<div className="space-y-4 max-w-xl mx-auto">
// 				{sources?.map((source, i) =>
// 					source.tweetId ? (
// 						<div key={i} className="tweet-container">
// 							<Tweet id={source.tweetId} />
// 						</div>
// 					) : (
// 						<a
// 							key={i}
// 							href={source.url}
// 							target="_blank"
// 							rel="noopener noreferrer"
// 							className="block p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
// 						>
// 							<div className="flex items-start gap-3">
// 								<div className="flex-shrink-0 mt-1">
// 									<XLogo className="h-4 w-4 text-neutral-500" />
// 								</div>
// 								<div>
// 									<h4 className="text-sm font-medium leading-tight">{source.title}</h4>
// 									<p className="text-xs text-neutral-500 mt-1 line-clamp-2">{source.content}</p>
// 								</div>
// 							</div>
// 						</a>
// 					),
// 				)}
// 			</div>
// 		);
// 	}

// 	return (
// 		<div className="space-y-3">
// 			{sources?.map((source, i) => (
// 				<a
// 					key={i}
// 					href={source.url}
// 					target="_blank"
// 					rel="noopener noreferrer"
// 					className="block p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
// 				>
// 					<div className="flex items-start gap-3">
// 						<div className="flex-shrink-0 mt-1">
// 							<img
// 								src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=128`}
// 								alt=""
// 								className="w-4 h-4"
// 								onError={(e) => {
// 									const target = e.target as HTMLImageElement;
// 									target.style.display = 'none';
// 									target.nextElementSibling?.classList.remove('hidden');
// 								}}
// 							/>
// 							<div className="hidden">
// 								{type === 'web' ? (
// 									<FileText className="h-4 w-4 text-neutral-500" />
// 								) : type === 'academic' ? (
// 									<BookA className="h-4 w-4 text-neutral-500" />
// 								) : (
// 									<XLogo className="h-4 w-4 text-neutral-500" />
// 								)}
// 							</div>
// 						</div>
// 						<div>
// 							<h4 className="text-sm font-medium leading-tight">{source.title}</h4>
// 							<p className="text-xs text-neutral-500 mt-1 line-clamp-2">{source.content}</p>
// 						</div>
// 					</div>
// 				</a>
// 			))}
// 		</div>
// 	);
// };

// const AllSourcesView = ({ sources, type, id }: { sources: any[]; type: 'web' | 'academic' | 'x'; id?: string }) => {
// 	const isDesktop = useMediaQuery('(min-width: 768px)');
// 	const title = type === 'web' ? 'Web Sources' : type === 'academic' ? 'Academic Sources' : 'X Posts';

// 	if (isDesktop) {
// 		return (
// 			<Dialog>
// 				<DialogTrigger asChild>
// 					<button id={id} className="hidden">
// 						Show All
// 					</button>
// 				</DialogTrigger>
// 				<DialogContent className={cn('max-h-[80vh] overflow-y-auto', type === 'x' ? 'max-w-2xl' : 'max-w-4xl')}>
// 					<DialogHeader>
// 						<DialogTitle className="flex items-center gap-2">
// 							{type === 'web' && <FileText className="h-4 w-4" />}
// 							{type === 'academic' && <BookA className="h-4 w-4" />}
// 							{type === 'x' && <XLogo className="h-4 w-4" />}
// 							{title}
// 						</DialogTitle>
// 					</DialogHeader>
// 					<SourcesList sources={sources} type={type} />
// 				</DialogContent>
// 			</Dialog>
// 		);
// 	}

// 	return (
// 		<Drawer>
// 			<DrawerTrigger asChild>
// 				<button id={id} className="hidden">
// 					Show All
// 				</button>
// 			</DrawerTrigger>
// 			<DrawerContent className="h-[85vh]">
// 				<DrawerHeader>
// 					<DrawerTitle className="flex items-center gap-2">
// 						{type === 'web' && <FileText className="h-4 w-4" />}
// 						{type === 'academic' && <BookA className="h-4 w-4" />}
// 						{type === 'x' && <XLogo className="h-4 w-4" />}
// 						{title}
// 					</DrawerTitle>
// 				</DrawerHeader>
// 				<div className="p-4 overflow-y-auto">
// 					<SourcesList sources={sources} type={type} />
// 				</div>
// 			</DrawerContent>
// 		</Drawer>
// 	);
// };

// // First, let's create a new component for the animated tab content
// const AnimatedTabContent = ({ children, value, selected }: { children: React.ReactNode; value: string; selected: string }) => (
// 	<motion.div
// 		role="tabpanel"
// 		initial={{ opacity: 0, x: 10 }}
// 		animate={{
// 			opacity: value === selected ? 1 : 0,
// 			x: value === selected ? 0 : 10,
// 			pointerEvents: value === selected ? 'auto' : 'none',
// 		}}
// 		transition={{
// 			duration: 0.2,
// 			ease: 'easeOut',
// 		}}
// 		className={cn('absolute top-0 left-0 right-0', value === selected ? 'relative' : 'hidden')}
// 	>
// 		{children}
// 	</motion.div>
// );

// // Add this new component for empty states
// const EmptyState = ({ type, isLoading = false }: { type: 'web' | 'academic' | 'analysis' | 'x'; isLoading?: boolean }) => {
// 	const icons = {
// 		web: FileText,
// 		academic: BookA,
// 		analysis: Sparkles,
// 		x: XLogo,
// 	} as const;
// 	const Icon = icons[type];

// 	const messages = {
// 		web: 'Web sources will appear here once found',
// 		academic: 'Academic sources will appear here once found',
// 		analysis: 'Analysis results will appear here once complete',
// 		x: isLoading ? 'Searching X...' : 'X posts will appear here once found',
// 	};

// 	return (
// 		<div className="flex flex-col items-center justify-center py-8 px-4 rounded-lg border-2 border-dashed border-neutral-200 dark:border-neutral-800">
// 			<div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
// 				{isLoading ? (
// 					<Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
// 				) : type === 'x' ? (
// 					<XLogo className="w-5 h-5 text-neutral-400" />
// 				) : (
// 					<Icon className="w-5 h-5 text-neutral-400" />
// 				)}
// 			</div>
// 			<p className="text-sm text-neutral-500 text-center">{messages[type]}</p>
// 		</div>
// 	);
// };

// // Helper function to get status icon
// const getStatusIcon = (status: string) => {
// 	switch (status) {
// 		case 'completed':
// 			return <CheckCircle className="h-5 w-5 text-green-500" />;
// 		case 'in_progress':
// 			return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
// 		case 'blocked':
// 			return <Pause className="h-5 w-5 text-amber-500" />;
// 		case 'not_started':
// 		default:
// 			return <Circle className="h-5 w-5 text-neutral-300 dark:text-neutral-600" />;
// 	}
// };

// const ExecutionPlanComponent = ({ execution_plan }: { execution_plan: ExecutionPlan }) => {
// 	const [isCollapsed, setIsCollapsed] = useState(false);
// 	const [selectedTab, setSelectedTab] = useState('web');
// 	const [showCompletedTasks, setShowCompletedTasks] = useState(false);

// 	const execution_plan_updates = updates.filter((update) => update.type === 'execution_plan_update');
// 	const thought_updates = updates.filter((update) => update.type === 'thought');

// 	const last_execution_plan_update = execution_plan_updates.length > 0 ? execution_plan_updates[execution_plan_updates.length - 1] : null;

// 	// Calculate progress based on task stats from the update
// 	const { completedTasks, totalTasks, progress, isComplete, inProgressTasks, blockedTasks } = React.useMemo(() => {
// 		if (execution_plan_updates.length === 0)
// 			return {
// 				completedTasks: 0,
// 				totalTasks: 0,
// 				progress: 0,
// 				isComplete: false,
// 				inProgressTasks: 0,
// 				blockedTasks: 0,
// 			};

// 		const latestUpdate = execution_plan_updates[0];

// 		// Use stats if available, otherwise calculate from tasks
// 		if (latestUpdate.data.stats) {
// 			const stats = latestUpdate.data.stats;
// 			return {
// 				completedTasks: stats.completed_tasks,
// 				totalTasks: stats.total_tasks,
// 				progress: stats.total_progress_percentage,
// 				isComplete: stats.completed_tasks === stats.total_tasks,
// 				inProgressTasks: stats.in_progress_tasks,
// 				blockedTasks: stats.blocked_tasks,
// 			};
// 		} else {
// 			// Fallback to previous calculation method
// 			const completed = latestUpdate.data.tasks.filter((task) => task.is_done).length;
// 			const total = latestUpdate.data.tasks.length;
// 			const currentProgress = total === 0 ? 0 : (completed / total) * 100;
// 			const complete = completed === total;

// 			return {
// 				completedTasks: completed,
// 				totalTasks: total,
// 				progress: currentProgress,
// 				isComplete: complete,
// 				inProgressTasks: 0,
// 				blockedTasks: 0,
// 			};
// 		}
// 	}, [updates]);

// 	// Check if any tasks are running
// 	const showRunningIndicators = !isComplete && updates.length > 0;

// 	// Track expanded state by task title instead of ID to persist across updates
// 	const [expandedTaskTitles, setExpandedTaskTitles] = useState<Set<string>>(new Set());

// 	const handleTaskClick = (task: any) => {
// 		setExpandedTaskTitles((prev) => {
// 			const newState = new Set(prev);
// 			if (newState.has(task.title)) {
// 				newState.delete(task.title);
// 			} else {
// 				newState.add(task.title);
// 			}
// 			return newState;
// 		});
// 	};

// 	// Helper function to get priority icon - only shows for high/critical
// 	const getPriorityIcon = (priority: string) => {
// 		switch (priority) {
// 			case 'critical':
// 				return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
// 			case 'high':
// 				return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
// 			case 'medium':
// 			case 'low':
// 			default:
// 				return null;
// 		}
// 	};

// 	const isTaskExpanded = (task: any) => expandedTaskTitles.has(task.title);

// 	// Get completed and active tasks from the current tasks array
// 	const { completedTasksList, activeTasksList } = React.useMemo(() => {
// 		if (!last_execution_plan_update || !last_execution_plan_update.data.tasks) {
// 			return { completedTasksList: [], activeTasksList: [] };
// 		}

// 		const completed = last_execution_plan_update.data.tasks.filter((task) => task.is_done || task.status === 'completed');

// 		const active = last_execution_plan_update.data.tasks.filter((task) => !task.is_done && task.status !== 'completed');

// 		return { completedTasksList: completed, activeTasksList: active };
// 	}, [last_execution_plan_update]);

// 	// Count of completed tasks (for display)
// 	const completedTasksCount = completedTasksList.length;

// 	return (
// 		<div className="space-y-4">
// 			{/* Completed Tasks Collapsible Section */}
// 			{completedTasksCount > 0 && (
// 				<div className="mb-4">
// 					<button
// 						onClick={() => setShowCompletedTasks(!showCompletedTasks)}
// 						className="flex items-center gap-2 w-full p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
// 					>
// 						<CheckCircle className="h-4 w-4 text-green-500" />
// 						<span className="text-sm font-medium">
// 							{completedTasksCount} task{completedTasksCount !== 1 ? 's' : ''} completed
// 						</span>
// 						<ChevronDown className={cn('ml-auto h-4 w-4 text-neutral-500 transition-transform', showCompletedTasks && 'rotate-180')} />
// 					</button>

// 					<AnimatePresence initial={false}>
// 						{showCompletedTasks && (
// 							<motion.div
// 								initial={{ height: 0, opacity: 0 }}
// 								animate={{
// 									height: 'auto',
// 									opacity: 1,
// 									transition: {
// 										height: { duration: 0.2, ease: 'easeOut' },
// 										opacity: { duration: 0.15, delay: 0.05 },
// 									},
// 								}}
// 								exit={{
// 									height: 0,
// 									opacity: 0,
// 									transition: {
// 										height: { duration: 0.2, ease: 'easeIn' },
// 										opacity: { duration: 0.1 },
// 									},
// 								}}
// 								className="overflow-hidden"
// 							>
// 								<div className="space-y-2 mt-2 pl-2 border-l-2 border-green-200 dark:border-green-800">
// 									{completedTasksList.map((task) => (
// 										<Card key={task.id} className="w-full shadow-none hover:shadow-none">
// 											<div
// 												className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
// 												onClick={() => handleTaskClick(task)}
// 											>
// 												<div className="flex items-center gap-3">
// 													<CheckCircle className="h-5 w-5 text-green-500" />
// 													<div>
// 														<h4 className="text-sm font-medium">{task.title}</h4>
// 														{task.description && <p className="text-xs text-neutral-500 mt-1">{task.description}</p>}
// 													</div>
// 												</div>
// 												{(task.subtasks?.length > 0 || (task.prerequisites && task.prerequisites?.length > 0)) && (
// 													<ChevronRight
// 														className={cn(
// 															'h-4 w-4 text-neutral-400 flex-shrink-0 transition-transform',
// 															isTaskExpanded(task) && 'rotate-90',
// 														)}
// 													/>
// 												)}
// 											</div>

// 											<AnimatePresence initial={false}>
// 												{isTaskExpanded(task) && (
// 													<motion.div
// 														initial={{ height: 0, opacity: 0 }}
// 														animate={{
// 															height: 'auto',
// 															opacity: 1,
// 															transition: {
// 																height: { duration: 0.2, ease: 'easeOut' },
// 																opacity: { duration: 0.15, delay: 0.05 },
// 															},
// 														}}
// 														exit={{
// 															height: 0,
// 															opacity: 0,
// 															transition: {
// 																height: { duration: 0.2, ease: 'easeIn' },
// 																opacity: { duration: 0.1 },
// 															},
// 														}}
// 														className="overflow-hidden"
// 													>
// 														<CardContent className="px-4 pt-0 pb-3">
// 															{/* Prerequisites section */}
// 															{task.prerequisites && task.prerequisites.length > 0 && (
// 																<div className="mt-2 mb-4 pl-8 border-l border-neutral-200 dark:border-neutral-800 ml-2">
// 																	<h5 className="text-xs font-medium mb-2">Prerequisites</h5>
// 																	<div className="space-y-2">
// 																		{task.prerequisites.map((prereq, index) => (
// 																			<div
// 																				key={prereq.id}
// 																				className="p-2 rounded-lg bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800"
// 																			>
// 																				<div className="flex items-start gap-2">
// 																					<CircleCheck className="h-3.5 w-3.5 text-purple-500" />
// 																					<div>
// 																						<h6 className="text-xs font-medium text-purple-700 dark:text-purple-300">
// 																							{prereq.description}
// 																						</h6>
// 																					</div>
// 																				</div>
// 																			</div>
// 																		))}
// 																	</div>
// 																</div>
// 															)}

// 															{/* Subtasks section */}
// 															{task.subtasks && task.subtasks.length > 0 && (
// 																<div className="pl-8 border-l border-neutral-200 dark:border-neutral-800 ml-2 mt-2 space-y-3">
// 																	<h5 className="text-xs font-medium mb-2">Steps</h5>
// 																	{task.subtasks.map((subtask, index) => (
// 																		<motion.div
// 																			key={subtask.id}
// 																			initial={{ opacity: 0, y: 10 }}
// 																			animate={{ opacity: 1, y: 0 }}
// 																			transition={{ delay: index * 0.05 }}
// 																			className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
// 																		>
// 																			<div className="flex items-start gap-2">
// 																				<div className="flex-shrink-0 mt-1">
// 																					<CheckCircle className="h-4 w-4 text-green-500" />
// 																				</div>
// 																				<div className="space-y-1 min-w-0 flex-1">
// 																					<span className="text-xs font-medium">{subtask.title}</span>
// 																					{subtask.description && (
// 																						<p className="text-xs text-neutral-500">{subtask.description}</p>
// 																					)}
// 																				</div>
// 																			</div>
// 																		</motion.div>
// 																	))}
// 																</div>
// 															)}
// 														</CardContent>
// 													</motion.div>
// 												)}
// 											</AnimatePresence>
// 										</Card>
// 									))}
// 								</div>
// 							</motion.div>
// 						)}
// 					</AnimatePresence>
// 				</div>
// 			)}

// 			{/* Active Tasks */}
// 			<div className="space-y-4">
// 				{activeTasksList.map((task) => (
// 					<Card key={task.id} className="w-full shadow-none hover:shadow-none">
// 						<div
// 							className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
// 							onClick={() => handleTaskClick(task)}
// 						>
// 							<div className="flex items-center gap-3">
// 								{/* Status Icon - Use status if available, fall back to is_done */}
// 								{task.status ? (
// 									getStatusIcon(task.status)
// 								) : task.is_done ? (
// 									<CheckCircle className="h-5 w-5 text-green-500" />
// 								) : (
// 									<Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
// 								)}

// 								<div>
// 									<div className="flex items-center gap-2 flex-wrap">
// 										<h4 className="text-sm font-medium">{task.title}</h4>
// 										{/* Priority Icon - only for high/critical */}
// 										{task.priority && getPriorityIcon(task.priority)}
// 									</div>
// 									{task.description && <p className="text-xs text-neutral-500 mt-1">{task.description}</p>}

// 									{/* Progress Bar */}
// 									{task.progress_percentage > 0 && (
// 										<div className="flex items-center gap-2 mt-1.5">
// 											<Progress value={task.progress_percentage} className={cn('h-1 w-24', !task.is_done && 'animate-pulse')} />
// 											<span className="text-xs text-neutral-500">{task.progress_percentage}%</span>
// 										</div>
// 									)}
// 								</div>
// 							</div>
// 							<div className="flex items-center gap-3">
// 								{/* Prerequisites Indicator */}
// 								{task.prerequisites && task.prerequisites.length > 0 && (
// 									<HoverCard>
// 										<HoverCardTrigger asChild>
// 											<div className="relative cursor-pointer">
// 												<List className="h-4 w-4 text-neutral-500" />
// 												<span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900 text-[10px] font-medium text-purple-600 dark:text-purple-400">
// 													{task.prerequisites.length}
// 												</span>
// 											</div>
// 										</HoverCardTrigger>
// 										<HoverCardContent className="w-80 p-2">
// 											<div className="space-y-2">
// 												<h5 className="text-xs font-medium">Prerequisites</h5>
// 												{task.prerequisites.map((prerequisite, idx) => (
// 													<div
// 														key={idx}
// 														className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800"
// 													>
// 														<div className="flex items-start gap-2">
// 															<div className="flex-shrink-0 mt-1">
// 																<CircleCheck className="h-3.5 w-3.5 text-neutral-500" />
// 															</div>
// 															<div>
// 																<h6 className="text-xs font-medium">{prerequisite.description}</h6>
// 															</div>
// 														</div>
// 													</div>
// 												))}
// 											</div>
// 										</HoverCardContent>
// 									</HoverCard>
// 								)}

// 								{/* Expansion Indicator */}
// 								{(task.subtasks?.length > 0 || task.prerequisites?.length || task.depends_on) && (
// 									<ChevronRight
// 										className={cn('h-4 w-4 text-neutral-400 flex-shrink-0 transition-transform', isTaskExpanded(task) && 'rotate-90')}
// 									/>
// 								)}
// 							</div>
// 						</div>

// 						<AnimatePresence initial={false}>
// 							{isTaskExpanded(task) && (
// 								<motion.div
// 									initial={{ height: 0, opacity: 0 }}
// 									animate={{
// 										height: 'auto',
// 										opacity: 1,
// 										transition: {
// 											height: { duration: 0.2, ease: 'easeOut' },
// 											opacity: { duration: 0.15, delay: 0.05 },
// 										},
// 									}}
// 									exit={{
// 										height: 0,
// 										opacity: 0,
// 										transition: {
// 											height: { duration: 0.2, ease: 'easeIn' },
// 											opacity: { duration: 0.1 },
// 										},
// 									}}
// 									className="overflow-hidden"
// 								>
// 									<CardContent className="px-4 sm:px-6 pt-0 pb-3">
// 										{/* Prerequisites section */}
// 										{task.prerequisites && task.prerequisites.length > 0 && (
// 											<div className="mt-2 mb-4 pl-8 border-l border-neutral-200 dark:border-neutral-800 ml-2">
// 												<h5 className="text-xs font-medium mb-2">Prerequisites</h5>
// 												<div className="space-y-2">
// 													{task.prerequisites.map((prereq, index) => (
// 														<div
// 															key={prereq.id}
// 															className="p-2 rounded-lg bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800"
// 														>
// 															<div className="flex items-start gap-2">
// 																<div className="flex-shrink-0 mt-1">
// 																	<CircleCheck className="h-3.5 w-3.5 text-purple-500 mt-0.5" />
// 																</div>
// 																<div>
// 																	<h6 className="text-xs font-medium text-purple-700 dark:text-purple-300">
// 																		{prereq.description}
// 																	</h6>
// 																	<p className="text-xs text-neutral-500">Click to edit</p>
// 																</div>
// 															</div>
// 														</div>
// 													))}
// 												</div>
// 											</div>
// 										)}

// 										{/* Subtasks section */}
// 										{task.subtasks && task.subtasks.length > 0 && (
// 											<div className="pl-8 border-l border-neutral-200 dark:border-neutral-800 ml-2 mt-2 space-y-3">
// 												<h5 className="text-xs font-medium mb-2">Steps</h5>
// 												{task.subtasks.map((subtask, index) => (
// 													<motion.div
// 														key={subtask.id}
// 														initial={{ opacity: 0, y: 10 }}
// 														animate={{ opacity: 1, y: 0 }}
// 														transition={{ delay: index * 0.05 }}
// 														className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
// 													>
// 														<div className="flex items-start gap-2">
// 															<div className="flex-shrink-0 mt-1">
// 																{/* Status Icon for subtask */}
// 																{subtask.status ? (
// 																	getStatusIcon(subtask.status)
// 																) : subtask.is_done ? (
// 																	<CheckCircle className="h-4 w-4 text-green-500" />
// 																) : (
// 																	<Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
// 																)}
// 															</div>
// 															<div className="space-y-1 min-w-0 flex-1">
// 																<div className="flex items-center gap-2 flex-wrap">
// 																	<span className="text-xs font-medium">{subtask.title}</span>
// 																	{/* Priority Icon for subtask - only for high/critical */}
// 																	{subtask.priority && getPriorityIcon(subtask.priority)}
// 																</div>
// 																{subtask.description && <p className="text-xs text-neutral-500">{subtask.description}</p>}

// 																{/* Subtask progress bar */}
// 																{!!subtask.progress_percentage && subtask.progress_percentage > 0 && (
// 																	<div className="flex items-center gap-2 mt-1.5">
// 																		<Progress
// 																			value={subtask.progress_percentage}
// 																			className={cn('h-1 w-24', !subtask.is_done && 'animate-pulse')}
// 																		/>
// 																		{/* <span className="text-xs text-neutral-500">{subtask.progress_percentage}%</span> */}
// 																	</div>
// 																)}

// 																{/* Subtask prerequisites if any */}
// 																{!!subtask.prerequisites && subtask.prerequisites.length > 0 && (
// 																	<div className="mt-2 pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-700">
// 																		<h6 className="text-[11px] font-medium mb-1.5">Prerequisites:</h6>
// 																		<div className="grid gap-1.5">
// 																			{subtask.prerequisites.map((prereq, idx) => (
// 																				<div key={idx} className="flex items-start gap-1.5">
// 																					<div className="flex-shrink-0 mt-0.5">
// 																						<CircleCheck className="h-3 w-3 text-purple-400" />
// 																					</div>
// 																					<div>
// 																						<p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
// 																							{prereq.description}
// 																						</p>
// 																						<p className="text-xs text-neutral-500">Click to edit</p>
// 																					</div>
// 																				</div>
// 																			))}
// 																		</div>
// 																	</div>
// 																)}
// 															</div>
// 														</div>
// 													</motion.div>
// 												))}
// 											</div>
// 										)}

// 										{/* Dependencies section - with human-readable format */}
// 										{/* {task.depends_on && (
// 											<div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
// 												<h5 className="text-xs font-medium mb-2 flex items-center gap-1.5">
// 													<ArrowRight className="h-3.5 w-3.5 text-neutral-500" />
// 													Dependencies
// 												</h5>
// 												<div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
// 													<div className="flex items-center gap-2">
// 														<ArrowRight className="h-3.5 w-3.5 text-neutral-500" />
// 														<span className="text-xs">Depends on previous task</span>
// 													</div>
// 												</div>
// 											</div>
// 										)} */}
// 									</CardContent>
// 								</motion.div>
// 							)}
// 						</AnimatePresence>
// 					</Card>
// 				))}
// 			</div>

			
		
// 		</div>
// 	);
// };

// export default ExecutionPlanComponent;
