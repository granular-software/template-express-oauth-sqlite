// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { LoadedViewsUpdate, SelectedOptionsUpdate, ActionParametersFilledUpdate, StreamUpdate } from '../reason-search/view-types';
// import { ViewRenderer } from '../reason-search/ViewRenderer';
// import { SerializedView } from '@/os/apps';
// import { Calendar, Globe, ListFilter, ListTodo, Network, Notebook, Search, Workflow, Link, Check } from 'lucide-react';
// import { Rnd } from 'react-rnd';
// import { motion, AnimatePresence } from 'framer-motion';

// interface DesktopProps {
// 	chunks: StreamUpdate[][];
// }
// // Window position and size tracking interface
// interface WindowState {
// 	width: number;
// 	height: number;
// 	x: number;
// 	y: number;
// 	zIndex: number;
// }

// interface WindowStates {
// 	[key: string]: WindowState;
// }

// // Define proper types for selected options
// interface SelectedOption {
// 	token: string;
// 	is_action: boolean;
// 	score?: number;
// 	serialized_view?: {
// 		name?: string;
// 		actions?: Array<{
// 			alias: string;
// 			label?: string;
// 			name?: string;
// 		}>;
// 		links?: Array<{
// 			alias: string;
// 			name?: string;
// 			target_view?: string;
// 		}>;
// 	};
// }

// // Define proper types for selection notification
// interface SelectionNotificationData {
// 	viewName: string;
// 	optionName: string;
// 	isAction: boolean;
// 	timestamp: number;
// }

// export const Desktop: React.FC<DesktopProps> = ({ chunks }) => {
// 	const [views, setViews] = useState<SerializedView[]>([]);
// 	const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
// 	const [actionParameters, setActionParameters] = useState<any[] | null>(null);
// 	const [selectedAction, setSelectedAction] = useState<any | null>(null);
// 	const [windowStates, setWindowStates] = useState<WindowStates>({});
// 	const [highestZIndex, setHighestZIndex] = useState(100);
// 	const desktopRef = useRef<HTMLDivElement>(null);
// 	const osScreenRef = useRef<HTMLDivElement>(null);
// 	// Add fullscreen state
// 	const [isFullScreen, setIsFullScreen] = useState(false);
// 	const [recentlySelectedOptions, setRecentlySelectedOptions] = useState<string[]>([]);
// 	const [selectionNotification, setSelectionNotification] = useState<SelectionNotificationData | null>(null);

// 	// Add escape key handler for fullscreen mode
// 	useEffect(() => {
// 		const handleEscapeKey = (e: KeyboardEvent) => {
// 			if (e.key === 'Escape' && isFullScreen) {
// 				setIsFullScreen(false);
// 			}
// 		};
		
// 		window.addEventListener('keydown', handleEscapeKey);
		
// 		return () => {
// 			window.removeEventListener('keydown', handleEscapeKey);
// 		};
// 	}, [isFullScreen]);

// 	// Process updates to extract the latest state
// 	useEffect(() => {
// 		try {
// 			const updates = chunks.flat();
// 			if (updates.length === 0) return; // No updates to process

// 			// --- Process Loaded Views ---
// 			const loadedViewsUpdates = updates.filter((update) => update.type === 'loaded_views') as LoadedViewsUpdate[];
// 			if (loadedViewsUpdates.length > 0) {
// 				const lastLoadedViewsUpdate = loadedViewsUpdates[loadedViewsUpdates.length - 1];
// 				const newViews = lastLoadedViewsUpdate.data.views || [];
				
// 				// Initialize window states for new views
// 				let newWindowStates = {...windowStates};
// 				let shouldUpdateWindowStates = false;
// 				let newHighestZIndex = highestZIndex;
				
// 				newViews.forEach((view) => {
// 					if (view.type !== 'desktop' && !windowStates[view.name]) {
// 						// Generate a random position for new windows
// 						const desktopWidth = desktopRef.current?.clientWidth || 800;
// 						const desktopHeight = desktopRef.current?.clientHeight || 600;
						
// 						newWindowStates[view.name] = {
// 							width: 500,
// 							height: 400,
// 							x: Math.random() * (desktopWidth - 550),
// 							y: Math.random() * (desktopHeight - 450),
// 							zIndex: newHighestZIndex + 1
// 						};
						
// 						newHighestZIndex += 1;
// 						shouldUpdateWindowStates = true;
// 					}
// 				});
				
// 				// Only update state if necessary, and do it separately
// 				if (shouldUpdateWindowStates) {
// 					setWindowStates(newWindowStates);
// 					setHighestZIndex(newHighestZIndex);
// 				}
				
// 				// Only call setViews if the views are actually different
// 				if (JSON.stringify(views) !== JSON.stringify(newViews)) {
// 					setViews(newViews);
// 				}
// 			}

// 			// --- Process Selected Options ---
// 			const selectedOptionsUpdates = updates.filter((update) => update.type === 'selected_options') as SelectedOptionsUpdate[];
// 			if (selectedOptionsUpdates.length > 0) {
// 				const lastSelectedOptionsUpdate = selectedOptionsUpdates[selectedOptionsUpdates.length - 1];
// 				// Cast the options to ensure type compatibility
// 				const newSelectedOptions: SelectedOption[] = (lastSelectedOptionsUpdate.data.options || [])
// 					.map(option => ({
// 						...option,
// 						serialized_view: {
// 							...option.serialized_view,
// 							actions: option.serialized_view?.actions?.map(action => ({
// 								...action,
// 								alias: action.label || '' // Use existing alias if available, fallback to label
// 							})) || []
// 						}
// 					})) as SelectedOption[];
				
// 				// Track newly selected options for highlighting
// 				const newlySelectedTokens = newSelectedOptions
// 					.filter(option => !selectedOptions.some(existing => existing.token === option.token))
// 					.map(option => option.token);
				
// 				if (newlySelectedTokens.length > 0) {
// 					// Add to recently selected options
// 					setRecentlySelectedOptions(newlySelectedTokens);
					
// 					// Clear the recently selected status after a short delay (2 seconds)
// 					setTimeout(() => {
// 						setRecentlySelectedOptions(prev => 
// 							prev.filter(token => !newlySelectedTokens.includes(token))
// 						);
// 					}, 2000);
					
// 					// Show notification for the first newly selected option
// 					if (newlySelectedTokens.length > 0 && newSelectedOptions.length > 0) {
// 						const firstNewOption = newSelectedOptions.find(option => 
// 							newlySelectedTokens.includes(option.token)
// 						);
						
// 						if (firstNewOption) {
// 							setSelectionNotification({
// 								viewName: firstNewOption.serialized_view?.name || "Unknown",
// 								optionName: firstNewOption.is_action 
// 									? (firstNewOption.serialized_view?.actions?.find(a => a.alias === firstNewOption.token)?.label || firstNewOption.token)
// 									: (firstNewOption.serialized_view?.links?.find(l => l.alias === firstNewOption.token)?.name || firstNewOption.token),
// 								isAction: firstNewOption.is_action,
// 								timestamp: Date.now()
// 							});
							
// 							// Clear notification after 3 seconds
// 							setTimeout(() => {
// 								setSelectionNotification(null);
// 							}, 3000);
// 						}
// 					}
// 				}
				
// 				setSelectedOptions(newSelectedOptions);

// 				// Find the action in the *latest* selection update
// 				const lastActionOption = lastSelectedOptionsUpdate.data.options?.find((option) => option.is_action);
// 				if (lastActionOption) {
// 					// Only update if the action is different from the current one
// 					if (selectedAction?.token !== lastActionOption.token || selectedAction?.serialized_view?.name !== lastActionOption.serialized_view?.name) {
// 						setSelectedAction(lastActionOption);
// 						setActionParameters(null); // Reset parameters when a new action is selected
// 					}
// 				} else {
// 					// If the latest update has no action selected, clear the global action state
// 					setSelectedAction(null);
// 					setActionParameters(null);
// 				}
// 			}

// 			// --- Process Action Parameters ---
// 			// Only process if an action is currently selected
// 			if (selectedAction) {
// 				const actionParametersUpdates = updates.filter((update) => update.type === 'action_parameters_filled') as ActionParametersFilledUpdate[];
// 				if (actionParametersUpdates.length > 0) {
// 					const lastActionParametersUpdate = actionParametersUpdates[actionParametersUpdates.length - 1];
// 					setActionParameters(lastActionParametersUpdate.data.parameters || []);
// 				}
// 			}
// 		} catch (error) {
// 			console.error('Error processing updates:', error);
// 		}
// 	}, [chunks, windowStates, highestZIndex, selectedOptions, selectedAction]);

// 	// Function to check if a path is selected
// 	const isSelected = (path: string): boolean => {
// 		try {
// 			if (!selectedOptions || selectedOptions.length === 0) return false;

// 			return selectedOptions.some((option) => {
// 				try {
// 					// Check if this option refers to a link with this path
// 					const matchingLink = option.serialized_view?.links?.some((link: any) => link.alias === option.token && link.name === path);

// 					// Check if this option refers to an action with this path
// 					const matchingAction = option.serialized_view?.actions?.some(
// 						(action: any) => action.alias === option.token && (action.label === path || action.name === path),
// 					);

// 					return matchingLink || matchingAction;
// 				} catch (error) {
// 					console.error('Error in isSelected option check:', error);
// 					return false;
// 				}
// 			});
// 		} catch (error) {
// 			console.error('Error in isSelected:', error);
// 			return false;
// 		}
// 	};

// 	// Enhanced isRecentlySelected function with proper types
// 	const isRecentlySelected = (path: string, isAction: boolean = false): boolean => {
// 		try {
// 			if (!recentlySelectedOptions || recentlySelectedOptions.length === 0) return false;

// 			return selectedOptions.some((option) => {
// 				if (!recentlySelectedOptions.includes(option.token)) return false;
				
// 				try {
// 					if (isAction) {
// 						// Check if this option refers to an action with this path
// 						const matchingAction = option.serialized_view?.actions?.some(
// 							(action: { alias: string; label?: string; name?: string }) => 
// 								action.alias === option.token && (action.label === path || action.name === path)
// 						);
// 						return option.is_action && matchingAction;
// 					} else {
// 						// Check if this option refers to a link with this path
// 						const matchingLink = option.serialized_view?.links?.some(
// 							(link: { alias: string; name?: string; target_view?: string }) => 
// 								link.alias === option.token && (link.name === path || link.target_view === path)
// 						);
// 						return !option.is_action && matchingLink;
// 					}
// 				} catch (error) {
// 					console.error('Error in isRecentlySelected option check:', error);
// 					return false;
// 				}
// 			});
// 		} catch (error) {
// 			console.error('Error in isRecentlySelected:', error);
// 			return false;
// 		}
// 	};

// 	// Function to get the selection score for a path
// 	const getSelectionScore = (path: string): number => {
// 		try {
// 			if (!selectedOptions || selectedOptions.length === 0) return 0;

// 			const option = selectedOptions.find((option) => {
// 				try {
// 					// Check if this option refers to a link with this path
// 					const matchingLink = option.serialized_view?.links?.some((link: any) => link.alias === option.token && link.name === path);

// 					// Check if this option refers to an action with this path
// 					const matchingAction = option.serialized_view?.actions?.some(
// 						(action: any) => action.alias === option.token && (action.label === path || action.name === path),
// 					);

// 					return matchingLink || matchingAction;
// 				} catch (error) {
// 					console.error('Error in getSelectionScore option check:', error);
// 					return false;
// 				}
// 			});

// 			return option?.score ?? 0;
// 		} catch (error) {
// 			console.error('Error in getSelectionScore:', error);
// 			return 0;
// 		}
// 	};

// 	const apps = [
// 		{
// 			name: 'Notes',
// 			icon: Notebook,
// 			color: 'text-yellow-600',
// 		},
// 		{
// 			name: 'Finder',
// 			icon: Search,
// 			color: 'text-blue-600',
// 		},
// 		{
// 			name: 'Tables',
// 			icon: ListFilter,
// 			color: 'text-purple-600',
// 		},
// 		{
// 			name: 'Agenda',
// 			icon: Calendar,
// 			color: 'text-red-600',
// 		},
// 		{
// 			name: 'Browser',
// 			icon: Globe,
// 			color: 'text-cyan-600',
// 		},
// 		{
// 			name: 'Automations',
// 			icon: Workflow,
// 			color: 'text-orange-600',
// 		},
// 		{
// 			name: 'MindMaps',
// 			icon: Network,
// 			color: 'text-indigo-600',
// 		},
// 		{
// 			name: 'Planner',
// 			icon: ListTodo,
// 			color: 'text-green-600',
// 		},
// 	];

// 	// Bring a window to the front
// 	const bringToFront = (viewName: string) => {
// 		setHighestZIndex(prev => prev + 1);
// 		setWindowStates(prev => ({
// 			...prev,
// 			[viewName]: {
// 				...prev[viewName],
// 				zIndex: highestZIndex + 1
// 			}
// 		}));
// 	};

// 	// Function to ensure window stays within bounds
// 	const ensureWindowInBounds = (viewName: string, x: number, y: number, width: number, height: number) => {
// 		if (!desktopRef.current) return { x, y };
		
// 		const desktopWidth = desktopRef.current.clientWidth;
// 		const desktopHeight = desktopRef.current.clientHeight;
		
// 		// Calculate bounds to keep window fully visible
// 		// Allow a small margin (e.g., window header) to remain visible
// 		const minVisibleHeight = 40; // Height of the window header
		
// 		const boundedX = Math.min(Math.max(0, x), desktopWidth - Math.min(width, 100));
// 		const boundedY = Math.min(Math.max(0, y), desktopHeight - minVisibleHeight);
		
// 		return { x: boundedX, y: boundedY };
// 	};

// 	// Add window animation states
// 	const [minimizedWindows, setMinimizedWindows] = useState<Set<string>>(new Set());
// 	const [maximizedWindows, setMaximizedWindows] = useState<Set<string>>(new Set());
// 	const [windowPositionsBeforeMaximize, setWindowPositionsBeforeMaximize] = useState<{[key: string]: {x: number, y: number, width: number, height: number}}>({});
	
// 	// Window control functions
// 	const minimizeWindow = (viewName: string) => {
// 		setMinimizedWindows(prev => {
// 			const newSet = new Set(prev);
// 			newSet.add(viewName);
// 			return newSet;
// 		});
// 	};
	
// 	const maximizeWindow = (viewName: string) => {
// 		if (maximizedWindows.has(viewName)) {
// 			// Restore window
// 			setMaximizedWindows(prev => {
// 				const newSet = new Set(prev);
// 				newSet.delete(viewName);
// 				return newSet;
// 			});
			
// 			// Restore previous position and size
// 			if (windowPositionsBeforeMaximize[viewName]) {
// 				setWindowStates(prev => ({
// 					...prev,
// 					[viewName]: {
// 						...prev[viewName],
// 						...windowPositionsBeforeMaximize[viewName]
// 					}
// 				}));
// 			}
// 		} else {
// 			// Save current position and size
// 			setWindowPositionsBeforeMaximize(prev => ({
// 				...prev,
// 				[viewName]: {
// 					x: windowStates[viewName]?.x || 0,
// 					y: windowStates[viewName]?.y || 0,
// 					width: windowStates[viewName]?.width || 500,
// 					height: windowStates[viewName]?.height || 400
// 				}
// 			}));
			
// 			// Maximize window
// 			setMaximizedWindows(prev => {
// 				const newSet = new Set(prev);
// 				newSet.add(viewName);
// 				return newSet;
// 			});
// 		}
// 	};
	
// 	const closeWindow = (viewName: string) => {
// 		// In a real OS this would close the window
// 		// For demo purposes, we'll just minimize it
// 		minimizeWindow(viewName);
// 	};
	
// 	const restoreWindow = (viewName: string) => {
// 		setMinimizedWindows(prev => {
// 			const newSet = new Set(prev);
// 			newSet.delete(viewName);
// 			return newSet;
// 		});
// 		bringToFront(viewName);
// 	};

// 	// Toggle fullscreen mode
// 	const toggleFullScreen = () => {
// 		setIsFullScreen(prev => !prev);
// 	};

// 	// Add GPU acceleration to the component
// 	useEffect(() => {
// 		const osscreen = osScreenRef.current;
// 		if (!osscreen) return;
		
// 		// Apply hardware acceleration
// 		osscreen.style.transform = 'translateZ(0)';
// 		osscreen.style.backfaceVisibility = 'hidden';
// 		osscreen.style.perspective = '1000px';
		
// 		// Apply to desktop container as well
// 		if (desktopRef.current) {
// 			desktopRef.current.style.transform = 'translateZ(0)';
// 			desktopRef.current.style.backfaceVisibility = 'hidden';
// 			desktopRef.current.style.perspective = '1000px';
// 		}
// 	}, []);

// 	// Remove the dynamic resizing useEffect and replace with a simpler one
// 	useEffect(() => {
// 		const osscreen = osScreenRef.current;
// 		if (!osscreen) return;
		
// 		if (isFullScreen) {
// 			// Set to fullscreen mode
// 			osscreen.style.position = 'fixed';
// 			osscreen.style.top = '0';
// 			osscreen.style.left = '0';
// 			osscreen.style.width = '100vw';
// 			osscreen.style.height = '100vh';
// 			osscreen.style.zIndex = '9999';
// 			osscreen.style.margin = '0';
// 			osscreen.style.borderRadius = '0';
// 			// Add GPU acceleration for fullscreen mode
// 			osscreen.style.transform = 'translateZ(0)';
// 		} else {
// 			// Get viewport dimensions
// 			const viewportWidth = window.innerWidth;
			
// 			// Set to maximum size with fixed margins
// 			const horizontalMargin = 120; // pixels margin on each side
// 			const maxWidth = viewportWidth - (horizontalMargin * 2);
			
// 			// Apply the maximum width and maintain aspect ratio
// 			osscreen.style.width = `${maxWidth}px`;
// 			osscreen.style.height = `${maxWidth * (9/16)}px`;
			
// 			// Center using relative positioning
// 			osscreen.style.position = 'relative';
// 			osscreen.style.left = `calc(50% - ${maxWidth / 2}px)`;
// 			osscreen.style.marginTop = '60px';
// 			osscreen.style.marginBottom = '60px';
// 			osscreen.style.zIndex = 'auto';
// 			osscreen.style.borderRadius = '1.5rem'; // 3xl in Tailwind
// 		}
		
// 		// Handle window resize
// 		const handleResize = () => {
// 			if (!isFullScreen) {
// 				const newViewportWidth = window.innerWidth;
// 				const horizontalMargin = 120;
// 				const newMaxWidth = newViewportWidth - (horizontalMargin * 2);
				
// 				osscreen.style.width = `${newMaxWidth}px`;
// 				osscreen.style.height = `${newMaxWidth * (9/16)}px`;
// 				osscreen.style.left = `calc(50% - ${newMaxWidth / 2}px)`;
// 			}
// 		};
		
// 		window.addEventListener('resize', handleResize);
		
// 		return () => {
// 			window.removeEventListener('resize', handleResize);
// 		};
// 	}, [isFullScreen]);

// 	// Optimize the SelectionNotification component by memoizing it
// 	const SelectionNotification = useCallback(() => {
// 		if (!selectionNotification) return null;
		
// 		const { viewName, optionName, isAction, timestamp } = selectionNotification;
// 		const age = Date.now() - timestamp;
// 		const opacity = Math.max(0, 1 - (age / 3000)); // Fade out over 3 seconds
		
// 		return (
// 			<AnimatePresence>
// 				<motion.div 
// 					initial={{ opacity: 0, y: 20 }}
// 					animate={{ opacity: 1, y: 0 }}
// 					exit={{ opacity: 0, y: -20 }}
// 					className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50"
// 					style={{ opacity }}
// 				>
// 					<div className={`
// 						px-4 py-3 rounded-lg shadow-lg flex items-center gap-3
// 						${isAction 
// 							? 'bg-purple-600 text-white dark:bg-purple-700' 
// 							: 'bg-blue-600 text-white dark:bg-blue-700'}
// 					`}>
// 						{isAction ? (
// 							<div className="h-8 w-8 rounded-full bg-purple-500/30 flex items-center justify-center">
// 								<Check className="h-5 w-5" />
// 							</div>
// 						) : (
// 							<div className="h-8 w-8 rounded-full bg-blue-500/30 flex items-center justify-center">
// 								<Link className="h-5 w-5" />
// 							</div>
// 						)}
						
// 						<div>
// 							<div className="text-sm font-medium">
// 								{isAction ? 'Action Triggered' : 'Link Selected'}
// 							</div>
// 							<div className="text-xs opacity-90">
// 								{optionName} in {viewName}
// 							</div>
// 						</div>
// 					</div>
// 				</motion.div>
// 			</AnimatePresence>
// 		);
// 	}, [selectionNotification]);

// 	// Render the OS screen content with windows
// 	return (
// 		<div 
// 			ref={osScreenRef}
// 			className={`relative bg-gradient-to-br from-blue-200/90 via-indigo-200/80 to-purple-300/90 dark:from-blue-900/90 dark:via-indigo-900/80 dark:to-purple-800/90 p-6 backdrop-blur-md shadow-2xl mx-auto border border-white/30 dark:border-white/10 osscreen ${isFullScreen ? '' : 'rounded-3xl'}`}
// 			style={{ 
// 				aspectRatio: isFullScreen ? 'auto' : '16/9', 
// 				overflow: 'hidden',
// 				// Add GPU acceleration styles
// 				transform: 'translateZ(0)',
// 				backfaceVisibility: 'hidden',
// 				willChange: 'transform, opacity'
// 			}}
// 		>
// 			{/* Selection notification */}
// 			<SelectionNotification />

// 			{/* Fullscreen toggle button
// 			<button 
// 				onClick={toggleFullScreen}
// 				className="absolute top-2 right-12 z-50 bg-white/40 dark:bg-black/40 backdrop-blur-xl rounded-full p-1.5 border border-white/40 dark:border-white/10 shadow-lg hover:bg-white/60 dark:hover:bg-black/60 transition-colors duration-200"
// 				title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
// 			>
// 				{isFullScreen ? (
// 					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-neutral-800 dark:text-white">
// 						<path fillRule="evenodd" d="M5.25 2.25a3 3 0 0 0-3 3v13.5a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3V5.25a3 3 0 0 0-3-3H5.25ZM6.75 7.5a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0V9.81l1.72 1.72a.75.75 0 1 0 1.06-1.06L8.56 8.75h1.44a.75.75 0 0 0 0-1.5h-3a.75.75 0 0 0-.75.75Zm10.5 4.5a.75.75 0 0 0-.75.75v1.94l-1.72-1.72a.75.75 0 1 0-1.06 1.06l1.72 1.72h-1.44a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 .75-.75v-3a.75.75 0 0 0-.75-.75Z" clipRule="evenodd" />
// 					</svg>
// 				) : (
// 					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-neutral-800 dark:text-white">
// 						<path fillRule="evenodd" d="M15 3.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V5.56l-3.97 3.97a.75.75 0 1 1-1.06-1.06l3.97-3.97h-2.69a.75.75 0 0 1-.75-.75Zm-12 0A.75.75 0 0 1 3.75 3h4.5a.75.75 0 0 1 0 1.5H5.56l3.97 3.97a.75.75 0 0 1-1.06 1.06L4.5 5.56v2.69a.75.75 0 0 1-1.5 0v-4.5Zm11.47 11.78a.75.75 0 1 1 1.06-1.06l3.97 3.97v-2.69a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1 0-1.5h2.69l-3.97-3.97Zm-4.94-1.06a.75.75 0 0 1 0 1.06L5.56 19.5h2.69a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 1.5 0v2.69l3.97-3.97a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
// 					</svg>
// 				)}
// 			</button> */}

// 			{/* Subtle animated gradient overlay - add GPU acceleration */}
// 			<div 
// 				className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 dark:from-transparent dark:via-blue-500/5 dark:to-purple-500/10 animate-gradient-slow rounded-3xl overflow-hidden"
// 				style={{
// 					transform: 'translateZ(0)',
// 					willChange: 'transform, opacity'
// 				}}
// 			/>
			
// 			{/* Subtle grid pattern */}
// 			<div className="absolute inset-0 bg-grid-white/[0.03] dark:bg-grid-white/[0.02] [mask-image:linear-gradient(0deg,transparent,black)] rounded-3xl" />
			
// 			{/* Glass reflection effect */}
// 			<div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent h-1/3 rounded-t-3xl" />
			
// 			{/* Status bar at top */}
// 			<div className="absolute top-0 left-0 right-0 h-8 bg-white/20 dark:bg-black/20 backdrop-blur-md border-b border-white/10 dark:border-white/5 px-4 flex items-center justify-between z-10">
// 				<div className="flex items-center gap-3">
// 					<div className="text-neutral-800/90 dark:text-white/90 font-medium text-xs flex items-center gap-1.5">
// 						<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
// 							<path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" fillOpacity="0.8" />
// 							<path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
// 							<path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
// 						</svg>
// 						Joshu OS
// 					</div>
// 				</div>
// 				<div className="flex items-center gap-3">
// 					{/* Fullscreen toggle button - repositioned to status bar */}
// 					<button 
// 						onClick={toggleFullScreen}
// 						className="bg-transparent hover:bg-white/20 dark:hover:bg-white/10 rounded-full p-1 transition-colors duration-200 flex items-center justify-center"
// 						title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
// 					>
// 						{isFullScreen ? (
// 							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-neutral-800 dark:text-white">
// 								<path fillRule="evenodd" d="M5.25 2.25a3 3 0 0 0-3 3v13.5a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3V5.25a3 3 0 0 0-3-3H5.25ZM6.75 7.5a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0V9.81l1.72 1.72a.75.75 0 1 0 1.06-1.06L8.56 8.75h1.44a.75.75 0 0 0 0-1.5h-3a.75.75 0 0 0-.75.75Zm10.5 4.5a.75.75 0 0 0-.75.75v1.94l-1.72-1.72a.75.75 0 1 0-1.06 1.06l1.72 1.72h-1.44a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 .75-.75v-3a.75.75 0 0 0-.75-.75Z" clipRule="evenodd" />
// 							</svg>
// 						) : (
// 							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-neutral-800 dark:text-white">
// 								<path fillRule="evenodd" d="M15 3.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V5.56l-3.97 3.97a.75.75 0 1 1-1.06-1.06l3.97-3.97h-2.69a.75.75 0 0 1-.75-.75Zm-12 0A.75.75 0 0 1 3.75 3h4.5a.75.75 0 0 1 0 1.5H5.56l3.97 3.97a.75.75 0 0 1-1.06 1.06L4.5 5.56v2.69a.75.75 0 0 1-1.5 0v-4.5Zm11.47 11.78a.75.75 0 1 1 1.06-1.06l3.97 3.97v-2.69a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1 0-1.5h2.69l-3.97-3.97Zm-4.94-1.06a.75.75 0 0 1 0 1.06L5.56 19.5h2.69a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 1.5 0v2.69l3.97-3.97a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
// 							</svg>
// 						)}
// 					</button>
// 					<div className="text-neutral-700/90 dark:text-white/80 text-xs flex items-center gap-1.5">
// 						<div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
// 						Online
// 					</div>
// 					<div className="text-neutral-700/90 dark:text-white/80 text-xs">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
// 				</div>
// 			</div>
			
// 			{/* Desktop icons */}
// 			<div 
// 				className="absolute top-12 left-6 grid grid-cols-1 gap-5"
// 				style={{
// 					transform: 'translateZ(0)',
// 					willChange: 'transform'
// 				}}
// 			>
// 				{apps.slice(0, 4).map((app, i) => (
// 					<div 
// 						key={i} 
// 						className="group flex flex-col items-center w-16 cursor-pointer"
// 						onClick={() => {
// 							// Find if this app is already open
// 							const appView = views.find(view => view.name === app.name);
// 							if (appView) {
// 								// If minimized, restore it
// 								if (minimizedWindows.has(app.name)) {
// 									restoreWindow(app.name);
// 								} else {
// 									// Otherwise bring to front
// 									bringToFront(app.name);
// 								}
// 							}
// 							// In a real OS, this would launch the app if not open
// 						}}
// 					>
// 						<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-neutral-800/80 dark:to-neutral-700/60 flex items-center justify-center shadow-lg group-hover:scale-105 transition-all duration-200 border border-white/40 dark:border-white/10 group-hover:border-white/60 dark:group-hover:border-white/20">
// 							{<app.icon className={`h-6 w-6 ${app.color} dark:${app.color}`} />}
// 						</div>
// 						<span className="mt-1.5 text-xs font-medium text-neutral-800/90 dark:text-white/90 text-center px-1.5 py-0.5 rounded bg-white/30 dark:bg-black/30 backdrop-blur-sm shadow-sm">
// 							{app.name}
// 						</span>
// 					</div>
// 				))}
// 			</div>
			
// 			<div 
// 				className="relative h-full backdrop-filter backdrop-blur-sm"
// 				style={{
// 					transform: 'translateZ(0)',
// 					willChange: 'transform'
// 				}}
// 			>
// 				{/* Display the actual views/windows */}
// 				<div className="h-full" ref={desktopRef}>
// 					{/* {views.length === 0 ? (
// 						<div className="flex flex-col items-center justify-center h-full w-full">
// 							<div className="relative w-16 h-16 mb-6 backdrop-blur-sm">
// 								<div className="absolute inset-0 rounded-full border-4 border-white/40 dark:border-neutral-800/60"></div>
// 								<div className="absolute inset-0 rounded-full border-4 border-t-blue-500/90 border-r-transparent border-b-transparent border-l-transparent animate-spin duration-1500"></div>
// 							</div>
// 							<h3 className="text-lg font-medium text-neutral-800/90 dark:text-white/90 mb-2 backdrop-blur-sm">Initializing the OS</h3>
// 							<p className="text-sm text-neutral-700/80 dark:text-white/70 text-center max-w-md backdrop-blur-sm">
// 								Preparing your workspace environment...
// 							</p>
// 							<div className="mt-6 flex gap-2">
// 								<div className="w-2.5 h-2.5 rounded-full bg-blue-500/80 dark:bg-blue-400/80 animate-pulse shadow-lg shadow-blue-500/20"></div>
// 								<div className="w-2.5 h-2.5 rounded-full bg-blue-500/80 dark:bg-blue-400/80 animate-pulse delay-150 shadow-lg shadow-blue-500/20"></div>
// 								<div className="w-2.5 h-2.5 rounded-full bg-blue-500/80 dark:bg-blue-400/80 animate-pulse delay-300 shadow-lg shadow-blue-500/20"></div>
// 							</div>
// 						</div>
// 					) : (
// 						<></>
// 					)} */}

// 					{views && views.length > 0 ? (
// 						views
// 							.filter((view) => view.type !== 'desktop' && !minimizedWindows.has(view.name))
// 							.map((view, i) => {
// 								// Determine if the currently selected action belongs to this view
// 								const isActionView = selectedAction && selectedAction.serialized_view?.name === view.name;
// 								// Find the specific action definition within the view's data
// 								const actionDefinition = isActionView ? view.actions?.find((a: any) => a.alias === selectedAction.token) : null;
								
// 								// Get window state or use default
// 								const windowState = windowStates[view.name] || {
// 									width: 500,
// 									height: 400,
// 									x: i * 20,
// 									y: i * 20,
// 									zIndex: 100 + i
// 								};
								
// 								// Check if window is maximized
// 								const isMaximized = maximizedWindows.has(view.name);
								
// 								// Find app icon for this view
// 								const appInfo = apps.find(app => app.name === view.name) || apps[0];

// 								return (
// 									<Rnd
// 										key={view.name || i}
// 										data-view-name={view.name}
// 										size={{ 
// 											width: isMaximized ? (desktopRef.current?.clientWidth ?? windowState.width) - 20 : windowState.width, 
// 											height: isMaximized ? (desktopRef.current?.clientHeight ?? windowState.height) - 20 : windowState.height 
// 										}}
// 										position={{ 
// 											x: isMaximized ? 10 : windowState.x, 
// 											y: isMaximized ? 10 : windowState.y 
// 										}}
// 										style={{ 
// 											zIndex: windowState.zIndex,
// 											transition: isMaximized ? 'width 0.2s, height 0.2s, transform 0.2s' : undefined
// 										}}
// 										bounds="parent"
// 										onDragStart={() => bringToFront(view.name)}
// 										onResizeStart={() => bringToFront(view.name)}
// 										onDragStop={(e, d) => {
// 											if (!isMaximized) {
// 												// Ensure window stays within bounds
// 												const { x, y } = ensureWindowInBounds(
// 													view.name, 
// 													d.x, 
// 													d.y, 
// 													windowState.width, 
// 													windowState.height
// 												);
												
// 												setWindowStates(prev => ({
// 													...prev,
// 													[view.name]: {
// 														...prev[view.name],
// 														x,
// 														y
// 													}
// 												}));
// 											}
// 										}}
// 										onResizeStop={(e, direction, ref, delta, position) => {
// 											if (!isMaximized) {
// 												const width = parseInt(ref.style.width);
// 												const height = parseInt(ref.style.height);
												
// 												// Ensure window stays within bounds after resize
// 												const { x, y } = ensureWindowInBounds(
// 													view.name,
// 													position.x,
// 													position.y,
// 													width,
// 													height
// 												);
												
// 												setWindowStates(prev => ({
// 													...prev,
// 													[view.name]: {
// 														...prev[view.name],
// 														width,
// 														height,
// 														x,
// 														y
// 													}
// 												}));
// 											}
// 										}}
// 										minWidth={300}
// 										minHeight={200}
// 										dragHandleClassName="window-header"
// 										disableDragging={isMaximized}
// 										enableResizing={!isMaximized}
// 									>
// 										<div
// 											className="bg-white/95 dark:bg-neutral-900/95 rounded-lg shadow-xl border border-neutral-200/30 dark:border-neutral-700/40 backdrop-blur-md overflow-hidden flex flex-col h-full transition-shadow duration-200 hover:shadow-2xl"
// 										>
// 											{/* Window Header */}
// 											<div 
// 												className="window-header bg-gradient-to-r from-neutral-100/90 to-neutral-50/90 dark:from-neutral-800/90 dark:to-neutral-850/90 px-3 py-2 border-b border-neutral-200/30 dark:border-neutral-700/50 cursor-move flex items-center justify-between"
// 												onDoubleClick={() => maximizeWindow(view.name)}
// 											>
// 												<div className="flex items-center gap-2">
// 													<div className="flex gap-1.5">
// 														<button 
// 															onClick={(e) => { e.stopPropagation(); closeWindow(view.name); }}
// 															className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 shadow-inner shadow-red-700/20 transition-colors duration-150"
// 														></button>
// 														<button 
// 															onClick={(e) => { e.stopPropagation(); minimizeWindow(view.name); }}
// 															className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 shadow-inner shadow-yellow-700/20 transition-colors duration-150"
// 														></button>
// 														<button 
// 															onClick={(e) => { e.stopPropagation(); maximizeWindow(view.name); }}
// 															className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 shadow-inner shadow-green-700/20 transition-colors duration-150"
// 														></button>
// 													</div>
// 													<div className="flex items-center gap-2 ml-2">
// 														{appInfo.icon && <appInfo.icon className={`h-4 w-4 ${appInfo.color}`} />}
// 														<div className="text-sm font-medium truncate">{view.name}</div>
// 													</div>
// 												</div>
// 												<div className="flex items-center gap-1.5">
// 													{/* Window controls */}
// 													<button className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 p-0.5 rounded">
// 														<Search className="h-3.5 w-3.5" />
// 													</button>
// 												</div>
// 											</div>
// 											{/* Window Content */}
// 											<div className="window-content p-4 flex-grow overflow-auto">
// 												<ViewRenderer
// 													view={view}
// 													isSelected={isSelected}
// 													getSelectionScore={getSelectionScore}
// 													isRecentlySelected={isRecentlySelected}
// 												/>
// 											</div>
// 											{/* Window Status Bar */}
// 											<div className="bg-neutral-100/80 dark:bg-neutral-800/80 border-t border-neutral-200/30 dark:border-neutral-700/30 px-3 py-1 text-xs text-neutral-500 dark:text-neutral-400 flex justify-between items-center">
// 												<div>{view.name} {view.type !== 'desktop' ? '• Active' : ''}</div>
// 												<div className="flex items-center gap-2">
// 													{isActionView && (
// 														<span className="px-1.5 py-0.5 bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
// 															Action in progress
// 														</span>
// 													)}
// 												</div>
// 											</div>
// 										</div>
// 									</Rnd>
// 								);
// 							})
// 					) : (
// 						<></>
// 					)}
// 				</div>
// 			</div>

// 			{/* Minimized windows tray - redesigned and moved to top */}
// 			{minimizedWindows.size > 0 && (
// 				<div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
// 					<div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl rounded-full px-4 py-1.5 border border-white/40 dark:border-white/10 shadow-lg flex items-center gap-1">
// 						<div className="mr-1 text-xs font-medium text-neutral-800/90 dark:text-white/90 px-1.5">
// 							Minimized
// 						</div>
// 						<div className="h-4 w-px bg-white/30 dark:bg-white/10 mx-1"></div>
// 						<div className="flex items-center gap-1">
// 							{Array.from(minimizedWindows).map((viewName) => {
// 								const appInfo = apps.find(app => app.name === viewName) || apps[0];
// 								return (
// 									<button 
// 										key={viewName}
// 										onClick={() => restoreWindow(viewName)}
// 										className="group flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-white/30 dark:hover:bg-white/10 transition-all duration-200"
// 									>
// 										<div className="relative">
// 											{appInfo.icon && <appInfo.icon className={`h-5 w-5 ${appInfo.color}`} />}
// 											<div className="absolute -right-1 -bottom-1 w-2.5 h-2.5 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
// 												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2 h-2 text-neutral-600 dark:text-neutral-300">
// 													<path d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
// 												</svg>
// 											</div>
// 										</div>
// 										<span className="text-xs font-medium text-neutral-800/90 dark:text-white/90 group-hover:opacity-100 opacity-80 transition-opacity duration-200">{viewName}</span>
// 									</button>
// 								);
// 							})}
// 						</div>
// 					</div>
					
// 					{/* Subtle glow effect */}
// 					<div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-md -z-10"></div>
// 				</div>
// 			)}

// 			{/* Desktop widgets area
// 			<div className="absolute top-12 right-6 w-64">
// 				<div className="bg-white/30 dark:bg-black/30 backdrop-blur-md rounded-xl p-3 shadow-lg border border-white/30 dark:border-white/10 mb-4">
// 					<div className="flex items-center justify-between mb-2">
// 						<h3 className="text-xs font-medium text-neutral-800/90 dark:text-white/90">System Status</h3>
// 						<div className="text-xs text-neutral-600 dark:text-neutral-400">{new Date().toLocaleDateString()}</div>
// 					</div>
// 					<div className="space-y-2">
// 						<div className="flex items-center justify-between">
// 							<div className="text-xs text-neutral-700 dark:text-neutral-300">Memory</div>
// 							<div className="w-24 h-1.5 bg-neutral-200/50 dark:bg-neutral-700/50 rounded-full overflow-hidden">
// 								<div className="h-full bg-blue-500/70 dark:bg-blue-400/70 rounded-full" style={{ width: '65%' }}></div>
// 							</div>
// 						</div>
// 						<div className="flex items-center justify-between">
// 							<div className="text-xs text-neutral-700 dark:text-neutral-300">CPU</div>
// 							<div className="w-24 h-1.5 bg-neutral-200/50 dark:bg-neutral-700/50 rounded-full overflow-hidden">
// 								<div className="h-full bg-green-500/70 dark:bg-green-400/70 rounded-full" style={{ width: '30%' }}></div>
// 							</div>
// 						</div>
// 						<div className="flex items-center justify-between">
// 							<div className="text-xs text-neutral-700 dark:text-neutral-300">Storage</div>
// 							<div className="w-24 h-1.5 bg-neutral-200/50 dark:bg-neutral-700/50 rounded-full overflow-hidden">
// 								<div className="h-full bg-purple-500/70 dark:bg-purple-400/70 rounded-full" style={{ width: '45%' }}></div>
// 							</div>
// 						</div>
// 					</div>
// 				</div>
// 			</div> */}

// 			{/* Elegant dock at the bottom - add GPU acceleration */}
// 			<div 
// 				className="absolute bottom-6 left-1/2 transform -translate-x-1/2"
// 				style={{
// 					transform: 'translate3d(-50%, 0, 0)',
// 					willChange: 'transform'
// 				}}
// 			>
// 				<div className="relative bg-white/30 dark:bg-black/40 backdrop-blur-xl rounded-full px-6 py-3 border border-white/30 dark:border-white/10 shadow-xl">
// 					<div className="flex items-center gap-5 justify-center">
// 						{apps.map((app, i) => {
// 							const isOpen = views.some(view => view.name === app.name);
// 							const isMinimized = minimizedWindows.has(app.name);
							
// 							return (
// 								<div key={i} className="group relative flex flex-col items-center">
// 									<div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-xs font-medium bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg">
// 										{app.name}
// 									</div>
// 									<div 
// 										className={`relative w-12 h-12 rounded-full bg-gradient-to-br from-white/90 to-white/70 dark:from-neutral-800/90 dark:to-neutral-700/70 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-200 ${
// 											isOpen && !isMinimized 
// 												? `border-2 ${app.color.replace('text-', 'border-')} ring-4 ring-${app.color.replace('text-', '')}/20` 
// 												: isMinimized 
// 													? 'border border-neutral-400/50 dark:border-neutral-500/50 opacity-70' 
// 													: 'border border-white/40 dark:border-white/10 group-hover:border-white/60 dark:group-hover:border-white/20'
// 										}`}
// 										onClick={() => {
// 											if (isOpen && isMinimized) {
// 												restoreWindow(app.name);
// 											} else if (isOpen) {
// 												minimizeWindow(app.name);
// 											}
// 											// In a real implementation, this would launch the app if not open
// 										}}
// 									>
// 										{<app.icon className={`h-6 w-6 ${
// 											isOpen && !isMinimized 
// 												? `${app.color} filter drop-shadow-md` 
// 												: isMinimized 
// 													? `${app.color} opacity-70` 
// 													: app.color
// 										}`} />}
										
// 										{/* Subtle glow effect for open apps */}
// 										{isOpen && !isMinimized && (
// 											<div className={`absolute inset-0 rounded-full ${app.color.replace('text-', 'bg-')}/10 animate-pulse-slow blur-sm -z-10`}></div>
// 										)}
// 									</div>
// 									{isOpen && !isMinimized ? (
// 										<div className={`absolute -bottom-1 w-2 h-2 rounded-full ${app.color.replace('text-', 'bg-')} shadow-lg shadow-${app.color.replace('text-', '')}/30`}></div>
// 									) : isMinimized ? (
// 										<div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500"></div>
// 									) : null}
// 								</div>
// 							);
// 						})}
// 					</div>
// 				</div>

// 				{/* Enhanced reflection effect */}
// 				<div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4/5 h-6 bg-gradient-to-t from-white/10 to-transparent blur-md rounded-full"></div>
// 			</div>
// 		</div>
// 	);
// };
