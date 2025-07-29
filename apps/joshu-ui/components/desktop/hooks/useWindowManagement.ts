// import { useCallback, useState } from "react";
// import { WindowStates } from "../components/Views";

// export interface WindowManager {
// 	windowStates: WindowStates;
// 	highestZIndex: number;
// 	minimizedWindows: Set<string>;
// 	maximizedWindows: Set<string>;
// 	windowPositionsBeforeMaximize: {    
// 		[key: string]: { x: number; y: number; width: number; height: number };
// 	};
// }

// export interface WindowManagerActions {
// 	bringToFront: (viewName: string) => void;
// 	minimizeWindow: (viewName: string) => void;
// 	maximizeWindow: (viewName: string) => void;
// 	closeWindow: (viewName: string) => void;
// 	restoreWindow: (viewName: string) => void;
// }

// export interface WindowManagerContextType extends WindowManager, WindowManagerActions {
//     desktopRef: React.RefObject<HTMLDivElement>;
//     setWindowStates: React.Dispatch<React.SetStateAction<WindowStates>>;
//     setHighestZIndex: React.Dispatch<React.SetStateAction<number>>;
//     setMinimizedWindows: React.Dispatch<React.SetStateAction<Set<string>>>;
//     setMaximizedWindows: React.Dispatch<React.SetStateAction<Set<string>>>;
//     setWindowPositionsBeforeMaximize: React.Dispatch<React.SetStateAction<{
//         [key: string]: { x: number; y: number; width: number; height: number };
//     }>>;
// }

// export function useWindowManagement(desktopRef: React.RefObject<HTMLDivElement>): WindowManagerContextType {
// 	const [windowStates, setWindowStates] = useState<WindowStates>({});
// 	const [highestZIndex, setHighestZIndex] = useState(100);
// 	const [minimizedWindows, setMinimizedWindows] = useState<Set<string>>(new Set());
// 	const [maximizedWindows, setMaximizedWindows] = useState<Set<string>>(new Set());
// 	const [windowPositionsBeforeMaximize, setWindowPositionsBeforeMaximize] = useState<{
// 		[key: string]: { x: number; y: number; width: number; height: number };
// 	}>({});

// 	// Bring a window to the front
// 	const bringToFront = useCallback(
// 		(viewName: string) => {
// 			setHighestZIndex((prev) => prev + 1);
// 			setWindowStates((prev) => ({
// 				...prev,
// 				[viewName]: {
// 					...prev[viewName],
// 					zIndex: highestZIndex + 1,
// 				},
// 			}));
// 		},
// 		[highestZIndex],
// 	);

// 	// Function to ensure window stays within bounds
// 	const ensureWindowInBounds = useCallback(
// 		(viewName: string, x: number, y: number, width: number, height: number) => {
// 			if (!desktopRef.current) return { x, y };
// 			const desktopWidth = desktopRef.current.clientWidth;
// 			const desktopHeight = desktopRef.current.clientHeight;
// 			const minVisibleHeight = 40;
// 			const boundedX = Math.min(Math.max(0, x), desktopWidth - Math.min(width, 100));
// 			const boundedY = Math.min(Math.max(0, y), desktopHeight - minVisibleHeight);
// 			return { x: boundedX, y: boundedY };
// 		},
// 		[desktopRef],
// 	);

// 	// Window control functions
// 	const minimizeWindow = useCallback((viewName: string) => {
// 		setMinimizedWindows((prev) => {
// 			const newSet = new Set(prev);
// 			newSet.add(viewName);
// 			return newSet;
// 		});
// 	}, []);

// 	const maximizeWindow = useCallback(
// 		(viewName: string) => {
// 			if (maximizedWindows.has(viewName)) {
// 				// Restore window
// 				setMaximizedWindows((prev) => {
// 					const newSet = new Set(prev);
// 					newSet.delete(viewName);
// 					return newSet;
// 				});
// 				if (windowPositionsBeforeMaximize[viewName]) {
// 					setWindowStates((prev) => ({
// 						...prev,
// 						[viewName]: {
// 							...prev[viewName],
// 							...windowPositionsBeforeMaximize[viewName],
// 						},
// 					}));
// 				}
// 			} else {
// 				// Save current position and size
// 				setWindowPositionsBeforeMaximize((prev) => ({
// 					...prev,
// 					[viewName]: {
// 						x: windowStates[viewName]?.x || 0,
// 						y: windowStates[viewName]?.y || 0,
// 						width: windowStates[viewName]?.width || 500,
// 						height: windowStates[viewName]?.height || 400,
// 					},
// 				}));
// 				// Maximize window
// 				setMaximizedWindows((prev) => {
// 					const newSet = new Set(prev);
// 					newSet.add(viewName);
// 					return newSet;
// 				});
// 			}
// 		},
// 		[maximizedWindows, windowPositionsBeforeMaximize, windowStates],
// 	);

// 	const closeWindow = useCallback(
// 		(viewName: string) => {
// 			minimizeWindow(viewName);
// 		},
// 		[minimizeWindow],
// 	);

// 	const restoreWindow = useCallback(
// 		(viewName: string) => {
// 			setMinimizedWindows((prev) => {
// 				const newSet = new Set(prev);
// 				newSet.delete(viewName);
// 				return newSet;
// 			});
// 			bringToFront(viewName);
// 		},
// 		[bringToFront],
// 	);

// 	return {
// 		windowStates,
// 		setWindowStates,
// 		highestZIndex,
// 		setHighestZIndex,
// 		minimizedWindows,
// 		maximizedWindows,
// 		windowPositionsBeforeMaximize,
// 		desktopRef,
// 		setMinimizedWindows,
// 		setMaximizedWindows,
// 		setWindowPositionsBeforeMaximize,
// 		bringToFront,
// 		minimizeWindow,
// 		maximizeWindow,
// 		closeWindow,
// 		restoreWindow,
// 	};
// }
