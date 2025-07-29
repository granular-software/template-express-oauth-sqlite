/* eslint-disable @next/next/no-img-element */
'use client';
import 'katex/dist/katex.min.css';

import { Desktop } from '@/components/desktop/Desktop';
import ExecutionPlanComponent, { LastThought } from '@/components/execution-plan';
import { InstallPrompt } from '@/components/InstallPrompt';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FormComponent from '@/components/ui/form-component';
import { Separator } from '@/components/ui/separator';
import { AgentChunk, useOsClient } from '@/hooks/useOsClient';
import { cn, getUserId, SearchGroupId } from '@/lib/utils';
import { ReasoningUIPart, SourceUIPart, TextUIPart, ToolInvocationUIPart } from '@ai-sdk/ui-utils';
import {
	ActionParametersFilledEventContent,
	OsDocument,
	SelectedOptionsEventContent,
	UserQueryEventContent,
	Agent,
	IterativeAppBuilderState,
} from '@joshu/os-types';
import { CalendarBlank, Clock as PhosphorClock } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
	AlignLeft,
	ArrowRight,
	BrainCircuit,
	Check,
	ChevronDown,
	Copy,
	ListFilter,
	MessageSquare,
	Monitor,
	Moon,
	Pause,
	Play,
	Plus,
	Settings,
	Sun,
	X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import React, { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppBuilderJourney } from '@/components/AppBuilderJourney';

export const maxDuration = 120;
interface Attachment {
	name: string;
	contentType: string;
	url: string;
	size: number;
}

const HomeContent = () => {
	const [query] = useQueryState('query', parseAsString.withDefault(''));
	const [q] = useQueryState('q', parseAsString.withDefault(''));
	const [model] = useQueryState('model', parseAsString.withDefault('scira-default'));
	const [session] = useQueryState('session', parseAsString.withDefault(''));
	const [showDesktop, setShowDesktop] = useState(false);

	const initialState = useMemo(
		() => ({
			query: query || q,
			model: model,
			session: session,
		}),
		[query, q, model, session],
	);

	const lastSubmittedQueryRef = useRef(initialState.query);
	const [selectedModel, setSelectedModel] = useState(initialState.model);
	const bottomRef = useRef<HTMLDivElement>(null);
	const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
	const [isEditingMessage, setIsEditingMessage] = useState(false);
	const [editingMessageIndex, setEditingMessageIndex] = useState(-1);
	const [attachments, setAttachments] = useState<Attachment[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const initializedRef = useRef(false);
	const [selectedGroup, setSelectedGroup] = useState<SearchGroupId>('extreme');
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [hasManuallyScrolled, setHasManuallyScrolled] = useState(false);
	const isAutoScrollingRef = useRef(false);

	// Get stored user ID
	const userId = useMemo(() => getUserId(), []);

	const [input, setInput] = useState('');

	const client = useOsClient();

	const { document: doc, thoughts, chunks, connect, isConnected, sendMessage, switchSession, executionPlan } = client;

	const status = doc?.session_state.status || 'ready';

	const ThemeToggle: React.FC = () => {
		const { resolvedTheme, setTheme } = useTheme();

		return (
			<Button
				variant="ghost"
				size="icon"
				onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
				className="bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800"
			>
				<Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
				<Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
				<span className="sr-only">Toggle theme</span>
			</Button>
		);
	};

	const lastUserChunkIndex = useMemo(() => {
		for (let i = chunks.length - 1; i >= 0; i--) {
			if (chunks[i].role === 'user') {
				return i;
			}
		}
	}, [chunks, thoughts]);

	useEffect(() => {
		// Reset manual scroll when streaming starts
		if (status === 'streaming') {
			setHasManuallyScrolled(false);
			// Initial scroll to bottom when streaming starts
			if (bottomRef.current) {
				isAutoScrollingRef.current = true;
				bottomRef.current.scrollIntoView({ behavior: 'smooth' });
			}
		}
	}, [status]);

	useEffect(() => {
		let scrollTimeout: NodeJS.Timeout;

		const handleScroll = () => {
			// Clear any pending timeout
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}

			// If we're not auto-scrolling and we're streaming, it must be a user scroll
			if (!isAutoScrollingRef.current && status === 'streaming') {
				const isAtBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
				if (!isAtBottom) {
					setHasManuallyScrolled(true);
				}
			}
		};

		window.addEventListener('scroll', handleScroll);

		// Auto-scroll on new content if we haven't manually scrolled
		if (status === 'streaming' && !hasManuallyScrolled && bottomRef.current) {
			scrollTimeout = setTimeout(() => {
				isAutoScrollingRef.current = true;
				bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
				// Reset auto-scroll flag after animation
				setTimeout(() => {
					isAutoScrollingRef.current = false;
				}, 100);
			}, 100);
		}

		return () => {
			window.removeEventListener('scroll', handleScroll);
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}
		};
	}, [chunks, suggestedQuestions, status, hasManuallyScrolled, thoughts]);

	// const handleSuggestedQuestionClick = useCallback(
	// 	async (question: string) => {
	// 		setSuggestedQuestions([]);

	// 		await append({
	// 			content: question.trim(),
	// 			role: 'user',
	// 		});
	// 	},
	// 	[append],
	// );

	// const handleMessageEdit = useCallback(
	// 	(index: number) => {
	// 		setIsEditingMessage(true);
	// 		setEditingMessageIndex(index);
	// 		setInput(messages[index].content);
	// 	},
	// 	[messages, setInput],
	// );

	const handleMessageUpdate = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (input.trim()) {
				// // Create new messages array up to the edited message
				// const newMessages = messages.slice(0, editingMessageIndex + 1);
				// // Update the edited message
				// newMessages[editingMessageIndex] = { ...newMessages[editingMessageIndex], content: input.trim() };
				// // Set the new messages array
				// // setMessages(newMessages);
				// // Reset editing state
				// setIsEditingMessage(false);
				// setEditingMessageIndex(-1);
				// // Store the edited message for reference
				// lastSubmittedQueryRef.current = input.trim();
				// // Clear input
				// setInput('');
				// // Reset suggested questions
				// setSuggestedQuestions([]);
				// // Trigger a new chat completion without appending
				// // reload();
			} else {
				toast.error('Please enter a valid message.');
			}
		},
		[input, editingMessageIndex, setInput],
	);

	interface NavbarProps {}

	const Navbar: React.FC<NavbarProps> = () => {
		const [showLoadDialog, setShowLoadDialog] = useState(false);
		const [sessionId, setSessionId] = useState('');
		const router = useRouter();

		const handleLoadSession = async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (sessionId.trim()) {
				try {
					await switchSession(sessionId.trim());
					router.push(`/?session=${encodeURIComponent(sessionId.trim())}`);
					setShowLoadDialog(false);
					// Reset UI state
					// setMessages([]);
					setSuggestedQuestions([]);
					setHasSubmitted(false);
				} catch (error) {
					toast.error('Failed to load session');
				}
			}
		};

		return (
            <div
				className={cn(
					'fixed top-0 left-0 right-0 z-[60] flex justify-between items-center p-4',
					// Add opaque background only after submit
					status === 'ready' ? 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60' : 'bg-background',
				)}
			>
                <div className="flex items-center gap-4">
					<Link href="/new">
						<Button
							type="button"
							variant={'secondary'}
							className="rounded-full bg-accent hover:bg-accent/80 backdrop-blur-sm group transition-all hover:scale-105 pointer-events-auto"
						>
							<Plus size={18} className="group-hover:rotate-90 transition-all" />
							<span className="text-sm ml-2 group-hover:block hidden animate-in fade-in duration-300">New task</span>
						</Button>
					</Link>
					<Button
						type="button"
						variant={'secondary'}
						className="rounded-full bg-accent hover:bg-accent/80 backdrop-blur-sm group transition-all hover:scale-105 pointer-events-auto"
						onClick={() => setShowLoadDialog(true)}
					>
						<ArrowRight size={18} className="group-hover:translate-x-1 transition-all" />
						<span className="text-sm ml-2 group-hover:block hidden animate-in fade-in duration-300">Load session</span>
					</Button>

					{showDesktop ? (
						<Button
							type="button"
							variant={'secondary'}
							className="rounded-full bg-accent hover:bg-accent/80 backdrop-blur-sm group transition-all hover:scale-105 pointer-events-auto"
							onClick={async () => {
								// Create a new session by switching to a new random session ID
								const newSessionId = crypto.randomUUID();
								const sid = await switchSession(newSessionId);
								setShowDesktop(false);
							}}
						>
							<MessageSquare size={18} className="group-hover:scale-110 transition-all" />
							<span className="text-sm ml-2 group-hover:block hidden animate-in fade-in duration-300">Conversation</span>
						</Button>
					) : (
						<Button
							type="button"
							variant={'secondary'}
							className="rounded-full bg-accent hover:bg-accent/80 backdrop-blur-sm group transition-all hover:scale-105 pointer-events-auto"
							onClick={handleDesktopMode}
						>
							<Monitor size={18} className="group-hover:scale-110 transition-all" />
							<span className="text-sm ml-2 group-hover:block hidden animate-in fade-in duration-300">Desktop</span>
						</Button>
					)}
				</div>
                <div className="flex items-center space-x-4">
					<ThemeToggle />
				</div>
                <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
					<DialogContent className="sm:max-w-[425px]">
						<DialogHeader>
							<DialogTitle>Load Existing Session</DialogTitle>
							<DialogDescription>Enter a session ID to load an existing conversation.</DialogDescription>
						</DialogHeader>
						<form onSubmit={handleLoadSession}>
							<div className="grid gap-4 py-4">
								<div className="grid grid-cols-4 items-center gap-4">
									<input
										id="sessionId"
										value={sessionId}
										onChange={(e) => setSessionId(e.target.value)}
										className="col-span-4 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
										placeholder="Enter session ID..."
									/>
								</div>
							</div>
							<DialogFooter>
								<Button type="submit" disabled={!sessionId.trim()}>
									Load Session
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
            </div>
        );
	};

	const handleModelChange = useCallback((newModel: string) => {
		setSelectedModel(newModel);
	}, []);

	const resetSuggestedQuestions = useCallback(() => {
		setSuggestedQuestions([]);
	}, []);

	// const memoizedMessages = useMemo(() => {
	// 	// Create a shallow copy
	// 	const msgs = [...messages];

	// 	return msgs.filter((message) => {
	// 		// Keep all user messages
	// 		if (message.role === 'user') return true;

	// 		// For assistant messages
	// 		if (message.role === 'assistant') {
	// 			// Keep messages that have tool invocations
	// 			if (message.parts?.some((part) => part.type === 'tool-invocation')) {
	// 				return true;
	// 			}
	// 			// Keep messages that have text parts but no tool invocations
	// 			if (message.parts?.some((part) => part.type === 'text') || !message.parts?.some((part) => part.type === 'tool-invocation')) {
	// 				return true;
	// 			}
	// 			return false;
	// 		}
	// 		return false;
	// 	});
	// }, [messages]);

	// const memoizedChunks = useMemo(() => {
	// 	return chunks;
	// }, [chunks, thoughts]);

	// Add this type at the top with other interfaces
	type MessagePart = TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart;

	// Update the renderPart function signature
	// const renderMessage = (messageIndex: number, message: any) => {
	// 	return <JoshuResponse key={`${messageIndex}-tool`} message={message} />;
	// };

	// Add near other state declarations in HomeContent
	interface ReasoningTiming {
		startTime: number;
		endTime?: number;
	}

	const [reasoningTimings, setReasoningTimings] = useState<Record<string, ReasoningTiming>>({});

	// Add state for tracking live elapsed time
	const [liveElapsedTimes, setLiveElapsedTimes] = useState<Record<string, number>>({});

	// Update live elapsed time for active reasoning sections
	useEffect(() => {
		const activeReasoningSections = Object.entries(reasoningTimings).filter(([_, timing]) => !timing.endTime);

		if (activeReasoningSections.length === 0) return;

		const interval = setInterval(() => {
			const now = Date.now();
			const updatedTimes: Record<string, number> = {};

			activeReasoningSections.forEach(([key, timing]) => {
				updatedTimes[key] = (now - timing.startTime) / 1000;
			});

			setLiveElapsedTimes((prev) => ({
				...prev,
				...updatedTimes,
			}));
		}, 100);

		return () => clearInterval(interval);
	}, [reasoningTimings]);

	// useEffect(() => {
	// 	messages.forEach((message, messageIndex) => {
	// 		message.parts?.forEach((part, partIndex) => {
	// 			if (part.type === 'reasoning') {
	// 				const sectionKey = `${messageIndex}-${partIndex}`;
	// 				const isComplete = message.parts[partIndex + 1]?.type === 'text';

	// 				if (!reasoningTimings[sectionKey]) {
	// 					setReasoningTimings((prev) => ({
	// 						...prev,
	// 						[sectionKey]: { startTime: Date.now() },
	// 					}));
	// 				} else if (isComplete && !reasoningTimings[sectionKey].endTime) {
	// 					setReasoningTimings((prev) => ({
	// 						...prev,
	// 						[sectionKey]: {
	// 							...prev[sectionKey],
	// 							endTime: Date.now(),
	// 						},
	// 					}));
	// 				}
	// 			}
	// 		});
	// 	});
	// }, [messages, reasoningTimings]);

	const WidgetSection = memo(() => {
		const [currentTime, setCurrentTime] = useState(new Date());
		const timerRef = useRef<NodeJS.Timeout>();

		useEffect(() => {
			// Sync with the nearest second
			const now = new Date();
			const delay = 1000 - now.getMilliseconds();

			// Initial sync
			const timeout = setTimeout(() => {
				setCurrentTime(new Date());

				// Then start the interval
				timerRef.current = setInterval(() => {
					setCurrentTime(new Date());
				}, 1000);
			}, delay);

			return () => {
				clearTimeout(timeout);
				if (timerRef.current) {
					clearInterval(timerRef.current);
				}
			};
		}, []);

		// Get user's timezone
		const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;

		// Format date and time with timezone
		const dateFormatter = new Intl.DateTimeFormat('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			timeZone: timezone,
		});

		const timeFormatter = new Intl.DateTimeFormat('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: true,
			timeZone: timezone,
		});

		const formattedDate = dateFormatter.format(currentTime);
		const formattedTime = timeFormatter.format(currentTime);

		const handleDateTimeClick = useCallback(() => {
			if (status !== 'ready') return;

			// append({
			// 	content: `What's the current date and time?`,
			// 	role: 'user',
			// });

			lastSubmittedQueryRef.current = `What's the current date and time?`;
			setHasSubmitted(true);
		}, []);

		return (
			<div className="mt-8 w-full">
				<div className="flex flex-wrap gap-3 justify-center">
					{/* Time Widget */}
					<Button
						variant="outline"
						className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:shadow-sm transition-all h-auto"
						onClick={handleDateTimeClick}
					>
						<PhosphorClock weight="duotone" className="h-5 w-5 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform" />
						<span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">{formattedTime}</span>
					</Button>

					{/* Date Widget */}
					<Button
						variant="outline"
						className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:shadow-sm transition-all h-auto"
						onClick={handleDateTimeClick}
					>
						<CalendarBlank weight="duotone" className="h-5 w-5 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
						<span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">{formattedDate}</span>
					</Button>
				</div>
			</div>
		);
	});

	WidgetSection.displayName = 'WidgetSection';

	// submitted: The message has been sent to the API and we're awaiting the start of the response stream.
	// streaming: The response is actively streaming in from the API, receiving chunks of data.
	// ready: The full response has been received and processed; a new user message can be submitted.
	// error: An error occurred during the API request, preventing successful completion.

	useEffect(() => {
		if (initialState.session && !isConnected) {
			connect(initialState.session);
		}
	}, [initialState.session, isConnected]);

	const handleSubmit = (input: string) => sendMessage(input).then(() => setInput(''));

	// Handle desktop mode initialization
	const handleDesktopMode = useCallback(async () => {
		setShowDesktop(true);
		// Create a new session for desktop mode
		const sid = await connect(undefined, { mode: 'desktop' });
		if (!sid) {
			toast.error('Failed to start desktop mode');
			setShowDesktop(false);
		}
	}, [connect]);

	return (
		<div className="flex flex-col !font-sans items-center min-h-screen bg-background text-foreground transition-all duration-500">
			<Navbar />

			<div
				className={`w-full p-2 sm:p-4 ${
					status === 'ready' && chunks.length === 0
						? 'min-h-screen flex flex-col items-center justify-center' // Center everything when no messages
						: 'mt-20 sm:mt-16' // Add top margin when showing messages
				}`}
			>
				<div className={`w-full max-w-[90%] !font-sans sm:max-w-2xl space-y-6 p-0 mx-auto transition-all duration-300`}>
					{status === 'ready' && chunks.length === 0 && (
						<div className="text-center !font-sans">
							<div className="flex justify-center mb-8">
								<img src="/joshu.svg" alt="Joshu" width={100} height={100} className="opacity-90 dark:opacity-60" />
							</div>
							<h1 className="text-2xl sm:text-4xl mb-6 text-neutral-800 dark:text-neutral-100 font-lora font-semibold">What can I do for you?</h1>
						</div>
					)}
					<AnimatePresence>
						{chunks.length === 0 && !hasSubmitted && !showDesktop && (
							<motion.div initial={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.5 }} className={cn('!mt-4')}>
								<FormComponent
									input={input}
									setInput={setInput}
									attachments={attachments}
									setAttachments={setAttachments}
									handleSubmit={handleSubmit}
									fileInputRef={fileInputRef}
									inputRef={inputRef}
									chunks={chunks}
									selectedModel={selectedModel}
									setSelectedModel={handleModelChange}
									resetSuggestedQuestions={resetSuggestedQuestions}
									lastSubmittedQueryRef={lastSubmittedQueryRef}
									selectedGroup={selectedGroup}
									setSelectedGroup={setSelectedGroup}
									showExperimentalModels={true}
									status={status || 'ready'}
									setHasSubmitted={setHasSubmitted}
								/>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Add the widget section below form when no messages */}
					{!hasSubmitted && !showDesktop && (
						<div>
							<WidgetSection />
						</div>
					)}

					<div className="space-y-4 sm:space-y-6 mb-32">
						{chunks.map((chunk, index) => (
							<div
								key={index}
								className={`${
									// Add border only if this is an assistant message AND there's a next message
									chunk.role === 'agent' && index < chunks.length - 1 ? '!mb-12 border-b border-neutral-200 dark:border-neutral-800' : ''
								}`.trim()}
							>
								{chunk.role === 'user' && (
									<motion.div
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.5 }}
										className="mb-4 px-0"
									>
										<div className="flex-grow min-w-0">
											{isEditingMessage && editingMessageIndex === index ? (
												<form onSubmit={handleMessageUpdate} className="w-full">
													<div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
														<div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
															<span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Edit Query</span>
															<div className="bg-neutral-100 dark:bg-neutral-800 rounded-[9px] border border-neutral-200 dark:border-neutral-700 flex items-center">
																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	onClick={() => {
																		setIsEditingMessage(false);
																		setEditingMessageIndex(-1);
																		setInput('');
																	}}
																	className="h-7 w-7 !rounded-l-lg !rounded-r-none text-neutral-500 dark:text-neutral-400 hover:text-primary"
																	disabled={status === 'streaming'}
																>
																	<X className="h-4 w-4" />
																</Button>
																<Separator orientation="vertical" className="h-7 bg-neutral-200 dark:bg-neutral-700" />
																<Button
																	type="submit"
																	variant="ghost"
																	size="icon"
																	className="h-7 w-7 !rounded-r-lg !rounded-l-none text-neutral-500 dark:text-neutral-400 hover:text-primary"
																	disabled={status === 'streaming'}
																>
																	<ArrowRight className="h-4 w-4" />
																</Button>
															</div>
														</div>
														<div className="p-4">
															<textarea
																value={input}
																onChange={(e) => setInput(e.target.value)}
																rows={3}
																className="w-full resize-none rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
																placeholder="Edit your message..."
															/>
														</div>
													</div>
												</form>
											) : (
												<div className="group relative">
													<div className="relative">
														<p className="text-xl font-medium font-sans break-words text-neutral-900 dark:text-neutral-100 pr-10 sm:pr-12">
															{(chunk.logs[0].content as UserQueryEventContent).text}
														</p>
														{!isEditingMessage && index === lastUserChunkIndex && (
															<div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent rounded-[9px] border border-neutral-200 dark:border-neutral-700 flex items-center">
																<Button
																	variant="ghost"
																	size="icon"
																	// onClick={() => handleMessageEdit(index)}
																	className="h-7 w-7 !rounded-l-lg !rounded-r-none text-neutral-500 dark:text-neutral-400 hover:text-primary"
																	disabled={status === 'streaming'}
																>
																	<svg
																		width="15"
																		height="15"
																		viewBox="0 0 15 15"
																		fill="none"
																		xmlns="http://www.w3.org/2000/svg"
																		className="h-4 w-4"
																	>
																		<path
																			d="M12.1464 1.14645C12.3417 0.951184 12.6583 0.951184 12.8535 1.14645L14.8535 3.14645C15.0488 3.34171 15.0488 3.65829 14.8535 3.85355L10.9109 7.79618C10.8349 7.87218 10.7471 7.93543 10.651 7.9835L6.72359 9.94721C6.53109 10.0435 6.29861 10.0057 6.14643 9.85355C5.99425 9.70137 5.95652 9.46889 6.05277 9.27639L8.01648 5.34897C8.06455 5.25283 8.1278 5.16507 8.2038 5.08907L12.1464 1.14645ZM12.5 2.20711L8.91091 5.79618L7.87266 7.87267L9.94915 6.83442L13.5382 3.24535L12.5 2.20711ZM8.99997 1.49997C9.27611 1.49997 9.49997 1.72383 9.49997 1.99997C9.49997 2.27611 9.27611 2.49997 8.99997 2.49997H4.49997C3.67154 2.49997 2.99997 3.17154 2.99997 3.99997V11C2.99997 11.8284 3.67154 12.5 4.49997 12.5H11.5C12.3284 12.5 13 11.8284 13 11V6.49997C13 6.22383 13.2238 5.99997 13.5 5.99997C13.7761 5.99997 14 6.22383 14 6.49997V11C14 12.3807 12.8807 13.5 11.5 13.5H4.49997C3.11926 13.5 1.99997 12.3807 1.99997 11V3.99997C1.99997 2.61926 3.11926 1.49997 4.49997 1.49997H8.99997Z"
																			fill="currentColor"
																			fillRule="evenodd"
																			clipRule="evenodd"
																		/>
																	</svg>
																</Button>
																<Separator orientation="vertical" className="h-7" />
																<Button
																	variant="ghost"
																	size="icon"
																	onClick={() => {
																		navigator.clipboard.writeText((chunk.logs[0].content as UserQueryEventContent).text);
																		toast.success('Copied to clipboard');
																	}}
																	className="h-7 w-7 !rounded-r-lg !rounded-l-none text-neutral-500 dark:text-neutral-400 hover:text-primary"
																>
																	<Copy className="h-4 w-4" />
																</Button>
															</div>
														)}
													</div>
												</div>
											)}
										</div>
									</motion.div>
								)}

								{chunk.role === 'agent' && (
									<>
										{/* Chunks: <pre>{JSON.stringify(chunk.loops.map((l) => l.thoughts))}</pre> */}
										{/* Top: {thoughts.length} */}
										<JoshuResponse key={`${index}-tool`} chunk={chunk as AgentChunk} doc={doc as OsDocument} />

										{index === chunks.length - 1 && suggestedQuestions.length > 0 && (
											<motion.div
												initial={{ opacity: 0, y: 20 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: 20 }}
												transition={{ duration: 0.5 }}
												className="w-full max-w-xl sm:max-w-2xl mt-6"
											>
												<div className="flex items-center gap-2 mb-4">
													<AlignLeft className="w-5 h-5 text-primary" />
													<h2 className="font-semibold text-base text-neutral-800 dark:text-neutral-200">Suggested questions</h2>
												</div>
												<div className="space-y-2 flex flex-col">
													{suggestedQuestions.map((question, index) => (
														<Button
															key={index}
															variant="ghost"
															className="w-fit font-medium rounded-2xl p-1 justify-start text-left h-auto py-2 px-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 whitespace-normal"
															// onClick={() => handleSuggestedQuestionClick(question)}
														>
															{question}
														</Button>
													))}
												</div>
											</motion.div>
										)}
									</>
								)}
							</div>
						))}

						{doc?.agents && doc.agents.length > 0 && (
							<div className="mt-8 border-t border-neutral-200 dark:border-neutral-800 pt-6 pb-4">
								{/* <AppBuilderJourney agents={doc.agents as Agent[]} /> */}
								<div className="space-y-2">
									<h3 className="text-lg font-semibold">Agents ({doc.agents.length})</h3>
									{doc.agents.map((agent, index) => (
										<div key={agent.id} className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg">
											<div className="font-medium">{agent.name}</div>
											<div className="text-sm text-neutral-600 dark:text-neutral-400">{agent.description}</div>
											<div className="text-xs text-neutral-500 mt-1">
												Tasks: {agent.tasks?.length || 0} | Active: {agent.is_active ? 'Yes' : 'No'}
											</div>
										</div>
									))}
								</div>

								<p>
									Agents: {JSON.stringify(doc.agents)}
								</p>
							</div>
						)}

						{/* {(doc?.executionPlan || showDesktop) && doc && (
							<>
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 20 }}
									transition={{ duration: 0.5 }}
									className="w-full max-w-xl sm:max-w-2xl mb-4 flex justify-end"
								>
									<Button
										variant="outline"
										className="rounded-full px-4 py-2 flex items-center gap-2 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
										onClick={doc?.paused ? client.resume : client.pause}
									>
										{doc?.paused ? (
											<>
												<Play className="w-4 h-4 text-green-500" />
												<span>Resume</span>
											</>
										) : (
											<>
												<Pause className="w-4 h-4 text-amber-500" />
												<span>Pause</span>
											</>
										)}
									</Button>
								</motion.div>

								<div id="os-screen-container" className="relative">
									<Desktop doc={doc as OsDocument} client={client} />


								</div>
							</>
						)} */}

						{/* <pre>
							{JSON.stringify(doc, null, 2)}
						</pre> */}
{/* 
						{thoughts.length > 0 && doc?.sessionState.status === 'streaming' && (
							<LastThought key={`last-thought-${0}`} thought={thoughts[thoughts.length - 1].content || 'Thinking...'} />
						)} */}
					</div>

					<div ref={bottomRef} />
				</div>

				<AnimatePresence>
					{(chunks.length > 0 || hasSubmitted) && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 20 }}
							transition={{ duration: 0.5 }}
							className="fixed bottom-4 left-0 right-0 w-full max-w-[90%] sm:max-w-2xl mx-auto z-20"
						>
							<FormComponent
								input={input}
								setInput={setInput}
								attachments={attachments}
								setAttachments={setAttachments}
								handleSubmit={handleSubmit}
								fileInputRef={fileInputRef}
								inputRef={inputRef}
								// stop={stop}
								// messages={messages as any}
								chunks={chunks}
								// append={append}
								selectedModel={selectedModel}
								setSelectedModel={handleModelChange}
								resetSuggestedQuestions={resetSuggestedQuestions}
								lastSubmittedQueryRef={lastSubmittedQueryRef}
								selectedGroup={selectedGroup}
								setSelectedGroup={setSelectedGroup}
								showExperimentalModels={false}
								status={status || 'ready'}
								setHasSubmitted={setHasSubmitted}
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
};

const LoadingFallback = () => (
	<div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
		<div className="flex flex-col items-center gap-6 p-8">
			<div className="relative w-12 h-12">
				<div className="absolute inset-0 rounded-full border-4 border-neutral-200 dark:border-neutral-800" />
				<div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
			</div>

			<p className="text-sm text-neutral-600 dark:text-neutral-400 animate-pulse">Loading...</p>
		</div>
	</div>
);

const JoshuResponse = ({ chunk, doc }: { chunk: AgentChunk; doc: OsDocument }) => {
	return (
		<div className="space-y-4">
			{/* {doc.executionPlan && <ExecutionPlanComponent execution_plan={doc.executionPlan} doc={doc} />} */}
			{/* Always show the OS screen as soon as we have any updates */}
			{chunk.loops.map((loop, loopIndex) => {
				const is_last_view = loopIndex === chunk.loops.length - 1;

				// Define apps data here or pass from a higher level if needed elsewhere
				if (!is_last_view) {
					return <FinishedLoopDetails key={`loop-${loopIndex}`} loop={loop} loopIndex={loopIndex} />;
				}
				return null;
			})}
		</div>
	);
};

JoshuResponse.displayName = 'JoshuResponse';

const FinishedLoopDetails = memo(({ loop, loopIndex }: { loop: AgentChunk['loops'][0]; loopIndex: number }) => {
	const thoughts = loop.thoughts;

	const lastThought = thoughts.length > 0 ? thoughts[thoughts.length - 1] : null;

	// const views: LoadedViewsUpdate['data']['views'] = loadedViewsUpdate?.data.views || [];
	const selectedOptions = loop.logs.find((u) => u.type === 'selected_options');
	// const actionParamsFilled = loop.logs.find((u) => u.type === 'action_parameters_filled');

	return (
		<Collapsible defaultOpen={false}>
			<CollapsibleTrigger className="w-full">
				<div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 hover:from-blue-500/10 hover:via-purple-500/10 hover:to-blue-500/10 transition-all border border-blue-500/10 hover:border-blue-500/20">
					{selectedOptions ? (
						<>
							<div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-inner">
								<Check className="h-4 w-4 text-white" />
							</div>
							<div className="flex-1 truncate">
								<div className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
									{(selectedOptions.content as SelectedOptionsEventContent).options?.[0]?.type === 'click_link' ? 'Open' : 'Triggered'}{' '}
									<span className="text-blue-500/90">{(selectedOptions.content as SelectedOptionsEventContent).options?.[0]?.name}</span>
								</div>
							</div>
						</>
					) : (
						<>
							<div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center animate-pulse shadow-inner">
								<BrainCircuit className="h-4 w-4 text-white" />
							</div>
							<div className="flex-1 truncate">
								<div className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
									{lastThought ? <span className="truncate">{lastThought.content.substring(0, 40)}...</span> : 'Processing...'}
								</div>
							</div>
						</>
					)}
					<ChevronDown className="h-4 w-4 text-neutral-500 transition-transform ui-open:rotate-180" />
				</div>
			</CollapsibleTrigger>

			<CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					exit={{ opacity: 0, height: 0 }}
					transition={{ duration: 0.3, ease: 'easeInOut' }}
					className="mt-3 pl-10 space-y-4"
				>
					{thoughts.length > 0 && (
						<div className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm rounded-lg p-4 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
							<h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-3 flex items-center gap-2">
								<BrainCircuit className="h-4 w-4 text-purple-500" />
								Thought Process
							</h4>
							<div className="space-y-2.5">
								{thoughts.map((thought, i) => (
									<div
										key={thought.id}
										className="text-sm text-neutral-600 dark:text-neutral-300 pl-3 border-l-2 border-purple-300/50 dark:border-purple-700/50"
									>
										{thought.content}
									</div>
								))}
							</div>
						</div>
					)}

					{selectedOptions && (
						<div className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm rounded-lg p-4 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
							<h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-3 flex items-center gap-2">
								<ListFilter className="h-4 w-4 text-blue-500" />
								Selection Analysis
							</h4>
							<div className="flex flex-wrap gap-2">
								{(selectedOptions.content as SelectedOptionsEventContent).options
									.sort((a, b) => b.score - a.score)
									.map((option, i) => {
										const scorePercentage = Math.round(option.score * 100);
										const getScoreClass = (score: number) => {
											if (score > 0.8) return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm';
											if (score > 0.6) return 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-sm';
											return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
										};

										return (
											<Badge key={i} className={`flex items-center gap-1.5 px-2.5 py-1 ${getScoreClass(option.score)}`}>
												{option.score > 0.5 && <Check className="h-3 w-3" />}
												{option.name}
												<span className="opacity-80 text-[10px] font-normal">{scorePercentage}%</span>
											</Badge>
										);
									})}
							</div>
						</div>
					)}
					{/* {actionParamsFilled && (
						<div className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm rounded-lg p-4 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
							<h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-3 flex items-center gap-2">
								<Settings className="h-4 w-4 text-orange-500" />
								Action Prepared:{' '}
								<span className="text-orange-600 dark:text-orange-400">
									{(actionParamsFilled.content as ActionParametersFilledEventContent).action_id}
								</span>
							</h4>
							<div className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/50 p-3 rounded-md">
								<pre className="whitespace-pre-wrap font-mono">
									<table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
										<thead>
											<tr>
												<th className="px-2 py-1 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
													Parameter
												</th>
												<th className="px-2 py-1 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
													Value
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
											{(actionParamsFilled.content as ActionParametersFilledEventContent).parameters.map((param: any, index: number) => (
												<tr key={index} className={index % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-800/30' : ''}>
													<td className="px-2 py-1 text-xs text-neutral-800 dark:text-neutral-300 font-medium">{param.name}</td>
													<td className="px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400">
														{typeof param.value === 'object' ? JSON.stringify(param.value) : String(param.value)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</pre>
							</div>
						</div>
					)} */}
				</motion.div>
			</CollapsibleContent>
		</Collapsible>
	);
});

FinishedLoopDetails.displayName = 'FinishedLoopDetails';

const Home = () => {
	return (
		<Suspense fallback={<LoadingFallback />}>
			<HomeContent />
			<InstallPrompt />
		</Suspense>
	);
};

export default Home;
