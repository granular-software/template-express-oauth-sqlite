import { RankedOption, SerializedView } from '@joshu/os-types';
import { WindowStates } from '../components/Views';
import { SelectionNotificationData } from '../hooks/useProcessUpdates';
import { createContext } from 'react';
import React from 'react';

export interface DesktopContextType {
	windows: { id: string; view: SerializedView }[];
	windowStates: WindowStates;
	highestZIndex: number;
	minimizedWindows: Set<string>;
	maximizedWindows: Set<string>;
	windowPositionsBeforeMaximize: {
		[key: string]: { x: number; y: number; width: number; height: number };
	};
	desktopRef: React.RefObject<HTMLDivElement>;
	isFullScreen: boolean;
}

export interface DesktopActionsContextType {
	bringToFront: (viewName: string) => void;
	minimizeWindow: (viewName: string) => void;
	maximizeWindow: (viewName: string) => void;
	closeWindow: (windowId: string) => void;
	restoreWindow: (viewName: string) => void;
	toggleFullScreen: () => void;
	ensureWindowInBounds: (viewName: string, x: number, y: number, width: number, height: number) => { x: number; y: number };
	setWindowStates: React.Dispatch<React.SetStateAction<WindowStates>>;
}

export interface SelectionContextType {
	selectedOptions: RankedOption[];
	selectedAction: RankedOption | null;
	actionParameters: any[] | null;
	recentlySelectedOptions: string[];
	selectionNotification: SelectionNotificationData | null;
	isSelected: (path: string) => boolean;
	getSelectionScore: (path: string) => number;
	isRecentlySelected: (path: string, isAction?: boolean) => boolean;
}

export const DesktopContext = createContext<DesktopContextType | null>(null);
export const DesktopActionsContext = createContext<DesktopActionsContextType | null>(null);
export const SelectionContext = createContext<SelectionContextType | null>(null);

// Custom hooks to use the contexts
export const useDesktop = () => {
	const context = React.useContext(DesktopContext);
	if (!context) throw new Error('useDesktop must be used within a DesktopProvider');
	return context;
};

export const useDesktopActions = () => {
	const context = React.useContext(DesktopActionsContext);
	if (!context) throw new Error('useDesktopActions must be used within a DesktopProvider');
	return context;
};

export const useSelection: () => SelectionContextType = () => {
	const context = React.useContext(SelectionContext);
	if (!context) throw new Error('useSelection must be used within a DesktopProvider');
	return context;
};

// Window management utility functions
export const createWindowManagementUtils = (
	setHighestZIndex: React.Dispatch<React.SetStateAction<number>>,
	setWindowStates: React.Dispatch<React.SetStateAction<WindowStates>>,
	setMinimizedWindows: React.Dispatch<React.SetStateAction<Set<string>>>,
	setMaximizedWindows: React.Dispatch<React.SetStateAction<Set<string>>>,
	setWindowPositionsBeforeMaximize: React.Dispatch<React.SetStateAction<{
		[key: string]: { x: number; y: number; width: number; height: number };
	}>>,
	setIsFullScreen: React.Dispatch<React.SetStateAction<boolean>>,
	highestZIndex: number,
	windowStates: WindowStates,
	windowPositionsBeforeMaximize: {
		[key: string]: { x: number; y: number; width: number; height: number };
	},
	desktopRef: React.RefObject<HTMLDivElement>
) => {
	// Bring a window to the front
	const bringToFront = (viewName: string) => {
		setHighestZIndex((prev) => prev + 1);
		setWindowStates((prev) => ({
			...prev,
			[viewName]: {
				...prev[viewName],
				zIndex: highestZIndex + 1,
			},
		}));
	};

	// Function to ensure window stays within bounds
	const ensureWindowInBounds = (viewName: string, x: number, y: number, width: number, height: number) => {
		if (!desktopRef.current) return { x, y };

		const desktopWidth = desktopRef.current.clientWidth;
		const desktopHeight = desktopRef.current.clientHeight;

		// Calculate bounds to keep window fully visible
		// Allow a small margin (e.g., window header) to remain visible
		const minVisibleHeight = 40; // Height of the window header

		const boundedX = Math.min(Math.max(0, x), desktopWidth - Math.min(width, 100));
		const boundedY = Math.min(Math.max(0, y), desktopHeight - minVisibleHeight);

		return { x: boundedX, y: boundedY };
	};

	// Window control functions
	const minimizeWindow = (viewName: string) => {
		setMinimizedWindows((prev) => {
			const newSet = new Set(prev);
			newSet.add(viewName);
			return newSet;
		});
	};

	const maximizeWindow = (window_id: string) => {
		setMaximizedWindows((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(window_id)) {
				// Restore window
				newSet.delete(window_id);
				
				// Restore previous position and size
				if (windowPositionsBeforeMaximize[window_id]) {
					setWindowStates((prev) => ({
						...prev,
						[window_id]: {
							...prev[window_id],
							...windowPositionsBeforeMaximize[window_id],
						},
					}));
				}
			} else {
				// Save current position and size
				setWindowPositionsBeforeMaximize((prev) => ({
					...prev,
					[window_id]: {
						x: windowStates[window_id]?.x || 0,
						y: windowStates[window_id]?.y || 0,
						width: windowStates[window_id]?.width || 500,
						height: windowStates[window_id]?.height || 400,
					},
				}));
				
				// Add to maximized set
				newSet.add(window_id);
			}
			return newSet;
		});
	};

	const closeWindow = (window_id: string) => {
		// // In a real OS this would close the window
		// // For demo purposes, we'll just minimize it
		// minimizeWindow(viewName);
	};

	const restoreWindow = (window_id: string) => {
		setMinimizedWindows((prev) => {
			const newSet = new Set(prev);
			newSet.delete(window_id);
			return newSet;
		});
		bringToFront(window_id);
	};

	// Toggle fullscreen mode
	const toggleFullScreen = () => {
		setIsFullScreen((prev) => !prev);
	};

	return {
		bringToFront,
		ensureWindowInBounds,
		minimizeWindow,
		maximizeWindow,
		closeWindow,
		restoreWindow,
		toggleFullScreen,
	};
};

// Selection utility functions
export const createSelectionUtils = (selectedOptions: RankedOption[], recentlySelectedOptions: string[]) => {
	// Function to check if a path is selected
	const isSelected = (path: string): boolean => {
		try {
			if (!selectedOptions || selectedOptions.length === 0) return false;

			return selectedOptions.some((option) => {
				try {
					// Check if this option refers to a link with this path
					const matchingLink = option.serialized_view?.clickable_links?.some((link: any) => link.alias === option.token && link.name === path);

					// Check if this option refers to an action with this path
					const matchingAction = option.serialized_view?.actions?.some(
						(action: any) => action.alias === option.token && (action.label === path || action.name === path),
					);

					return matchingLink || matchingAction;
				} catch (error) {
					console.error('Error in isSelected option check:', error);
					return false;
				}
			});
		} catch (error) {
			console.error('Error in isSelected:', error);
			return false;
		}
	};

	// Function to get the selection score for a path
	const getSelectionScore = (path: string): number => {
		try {
			if (!selectedOptions || selectedOptions.length === 0) return 0;

			const option = selectedOptions.find((option) => {
				try {
					// Check if this option refers to a link with this path
					const matchingLink = option.serialized_view?.clickable_links?.some((link: any) => link.alias === option.token && link.name === path);

					// Check if this option refers to an action with this path
					const matchingAction = option.serialized_view?.actions?.some(
						(action: any) => action.alias === option.token && (action.label === path || action.name === path),
					);

					return matchingLink || matchingAction;
				} catch (error) {
					console.error('Error in getSelectionScore option check:', error);
					return false;
				}
			});

			return option?.score ?? 0;
		} catch (error) {
			console.error('Error in getSelectionScore:', error);
			return 0;
		}
	};

	// Enhanced isRecentlySelected function with proper types
	const isRecentlySelected = (path: string, isAction: boolean = false): boolean => {
		try {
			if (!recentlySelectedOptions || recentlySelectedOptions.length === 0) return false;

			return selectedOptions.some((option) => {
				if (!recentlySelectedOptions.includes(option.token)) return false;

				try {
					if (isAction) {
						// Check if this option refers to an action with this path
						const matchingAction = option.serialized_view?.actions?.some(
							(action: { alias: string; label?: string; name?: string }) =>
								action.alias === option.token && (action.label === path || action.name === path),
						);
						return option.type === 'action' && matchingAction;
					} else {
						// Check if this option refers to a link with this path
						const matchingLink = option.serialized_view?.clickable_links?.some(
							(link: { alias: string; name?: string; window_id?: string; router_path?: string }) =>
								// A changer
								link.alias === option.token && (link.name === path || link.window_id === path || link.router_path === path),
						);
						return option.type === 'click_link' && matchingLink;
					}
				} catch (error) {
					console.error('Error in isRecentlySelected option check:', error);
					return false;
				}
			});
		} catch (error) {
			console.error('Error in isRecentlySelected:', error);
			return false;
		}
	};

	return {
		isSelected,
		getSelectionScore,
		isRecentlySelected,
	};
};
