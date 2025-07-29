import { Check, Link } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { OsDocument, RankedOption, SerializedView } from '@joshu/os-types';
import { AnimatePresence, motion } from 'framer-motion';
import DesktopFluff from './components/DesktopFluff';
import Dock from './components/Dock';
import MinimizedWindowsTray from './components/MinimizedWindowsTray';
import Views, { WindowStates } from './components/Views';
import {
	DesktopActionsContext,
	DesktopActionsContextType,
	DesktopContext,
	DesktopContextType,
	SelectionContext,
	SelectionContextType,
	createSelectionUtils,
	createWindowManagementUtils,
} from './context';
import { useEscapeKeyHandler } from './hooks/useEscapeKeyHandler';
import { useGPUAcceleration } from './hooks/useGPUAcceleration';
import { SelectionNotificationData, useProcessUpdates } from './hooks/useProcessUpdates';
import { UseOsClient } from '@/hooks/useOsClient';

export const Desktop: React.FC<{ doc: OsDocument, client: UseOsClient }> = ({ doc, client }) => {
	const [windows, setWindows] = useState<{ id: string; view: SerializedView }[]>([]);
	const [selectedOptions, setSelectedOptions] = useState<RankedOption[]>([]);
	const [actionParameters, setActionParameters] = useState<any[] | null>(null);
	const [selectedAction, setSelectedAction] = useState<RankedOption | null>(null);
	const [windowStates, setWindowStates] = useState<WindowStates>({});
	const [highestZIndex, setHighestZIndex] = useState(100);
	const desktopRef = useRef<HTMLDivElement>(null);
	const osScreenRef = useRef<HTMLDivElement>(null);

	const [isFullScreen, setIsFullScreen] = useState(false);
	const [recentlySelectedOptions, setRecentlySelectedOptions] = useState<string[]>([]);
	const [selectionNotification, setSelectionNotification] = useState<SelectionNotificationData | null>(null);

	// Add escape key handler for fullscreen mode
	useEscapeKeyHandler(isFullScreen, setIsFullScreen);

	useGPUAcceleration(osScreenRef, desktopRef);

	// This is the useProcessUpdates hook
	useProcessUpdates(
		doc,
		desktopRef,
		windowStates,
		highestZIndex,
		selectedOptions,
		selectedAction,
		setWindowStates,
		setWindows,
		setHighestZIndex,
		windows,
		setSelectedOptions,
		setRecentlySelectedOptions,
		setSelectionNotification,
		setActionParameters,
		setSelectedAction,
	);

	const [minimizedWindows, setMinimizedWindows] = useState<Set<string>>(new Set());
	const [maximizedWindows, setMaximizedWindows] = useState<Set<string>>(new Set());
	const [windowPositionsBeforeMaximize, setWindowPositionsBeforeMaximize] = useState<{
		[key: string]: { x: number; y: number; width: number; height: number };
	}>({});

	// Create window management utilities using the factory function
	const windowManagementUtils = createWindowManagementUtils(
		setHighestZIndex,
		setWindowStates,
		setMinimizedWindows,
		setMaximizedWindows,
		setWindowPositionsBeforeMaximize,
		setIsFullScreen,
		highestZIndex,
		windowStates,
		windowPositionsBeforeMaximize,
		desktopRef,
	);

	// Create selection utilities using the factory function
	const selectionUtils = createSelectionUtils(selectedOptions, recentlySelectedOptions);

	// Remove the dynamic resizing useEffect and replace with a simpler one
	useEffect(() => {
		const osscreen = osScreenRef.current;
		if (!osscreen) return;

		if (isFullScreen) {
			// Set to fullscreen mode
			osscreen.style.position = 'fixed';
			osscreen.style.top = '0';
			osscreen.style.left = '0';
			osscreen.style.width = '100vw';
			osscreen.style.height = '100vh';
			osscreen.style.zIndex = '9999';
			osscreen.style.margin = '0';
			osscreen.style.borderRadius = '0';
			// Add GPU acceleration for fullscreen mode
			osscreen.style.transform = 'translateZ(0)';
		} else {
			// Get viewport dimensions
			const viewportWidth = window.innerWidth;

			// Set to maximum size with fixed margins
			const horizontalMargin = 120; // pixels margin on each side
			const maxWidth = viewportWidth - horizontalMargin * 2;

			// Apply the maximum width and maintain aspect ratio
			osscreen.style.width = `${maxWidth}px`;
			osscreen.style.height = `${maxWidth * (9 / 16)}px`;

			// Center using relative positioning
			osscreen.style.position = 'relative';
			osscreen.style.left = `calc(50% - ${maxWidth / 2}px)`;
			osscreen.style.marginTop = '60px';
			osscreen.style.marginBottom = '60px';
			osscreen.style.zIndex = 'auto';
			osscreen.style.borderRadius = '1.5rem'; // 3xl in Tailwind
		}

		// Handle window resize
		const handleResize = () => {
			if (!isFullScreen) {
				const newViewportWidth = window.innerWidth;
				const horizontalMargin = 120;
				const newMaxWidth = newViewportWidth - horizontalMargin * 2;

				osscreen.style.width = `${newMaxWidth}px`;
				osscreen.style.height = `${newMaxWidth * (9 / 16)}px`;
				osscreen.style.left = `calc(50% - ${newMaxWidth / 2}px)`;
			}
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, [isFullScreen]);

	// Optimize the SelectionNotification component by memoizing it
	const SelectionNotification = useCallback(() => {
		if (!selectionNotification) return null;

		const { viewName, optionName, isAction, timestamp } = selectionNotification;
		const age = Date.now() - timestamp;
		const opacity = Math.max(0, 1 - age / 3000); // Fade out over 3 seconds

		return (
			<AnimatePresence>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50"
					style={{ opacity }}
				>
					<div
						className={`
						px-4 py-3 rounded-lg shadow-lg flex items-center gap-3
						${isAction ? 'bg-purple-600 text-white dark:bg-purple-700' : 'bg-blue-600 text-white dark:bg-blue-700'}
					`}
					>
						{isAction ? (
							<div className="h-8 w-8 rounded-full bg-purple-500/30 flex items-center justify-center">
								<Check className="h-5 w-5" />
							</div>
						) : (
							<div className="h-8 w-8 rounded-full bg-blue-500/30 flex items-center justify-center">
								<Link className="h-5 w-5" />
							</div>
						)}

						<div>
							<div className="text-sm font-medium">{isAction ? 'Action Triggered' : 'Link Selected'}</div>
							<div className="text-xs opacity-90">
								{optionName} in {viewName}
							</div>
						</div>
					</div>
				</motion.div>
			</AnimatePresence>
		);
	}, [selectionNotification]);

	// Create context values
	const desktopContextValue: DesktopContextType = {
		windows,
		windowStates,
		highestZIndex,
		minimizedWindows,
		maximizedWindows,
		windowPositionsBeforeMaximize,
		desktopRef,
		isFullScreen,
	};

	const desktopActionsContextValue: DesktopActionsContextType = {
		...windowManagementUtils,
		setWindowStates,
	};

	const selectionContextValue: SelectionContextType = {
		selectedOptions,
		selectedAction,
		actionParameters,
		recentlySelectedOptions,
		selectionNotification,
		...selectionUtils,
	};

	const style = {
		aspectRatio: isFullScreen ? 'auto' : '16/9',
		overflow: 'hidden',
		transform: 'translateZ(0)',
		backfaceVisibility: 'hidden' as 'hidden',
		willChange: 'transform, opacity',
	};

	return (
		<div
			ref={osScreenRef}
			className={`relative bg-gradient-to-br from-blue-200/90 via-indigo-200/80 to-purple-300/90 dark:from-blue-900/90 dark:via-indigo-900/80 dark:to-purple-800/90 p-6 backdrop-blur-md shadow-2xl mx-auto border border-white/30 dark:border-white/10 osscreen ${isFullScreen ? '' : 'rounded-3xl'}`}
			style={style}
		>
			<DesktopContext.Provider value={desktopContextValue}>
				<DesktopActionsContext.Provider value={desktopActionsContextValue}>
					<SelectionContext.Provider value={selectionContextValue}>
						<SelectionNotification />
						<DesktopFluff />
						<Views client={client} />
						<MinimizedWindowsTray />
						<Dock client={client} />
					</SelectionContext.Provider>
				</DesktopActionsContext.Provider>
			</DesktopContext.Provider>


			{/* <pre>
				{JSON.stringify(doc.agents, null, 2)}
			</pre> */}
		</div>
	);
};
