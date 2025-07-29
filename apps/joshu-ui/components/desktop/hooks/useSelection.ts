// import { useCallback, useState } from 'react';
// import { SelectedOption, SelectionNotificationData } from './useProcessUpdates';

// export interface SelectionContextType {
// 	selectedOptions: SelectedOption[];
// 	selectedAction: any | null;
// 	actionParameters: any[] | null;
// 	recentlySelectedOptions: string[];
// 	selectionNotification: SelectionNotificationData | null;
// 	setSelectedOptions: React.Dispatch<React.SetStateAction<SelectedOption[]>>;
// 	setRecentlySelectedOptions: React.Dispatch<React.SetStateAction<string[]>>;
// 	setSelectionNotification: React.Dispatch<React.SetStateAction<SelectionNotificationData | null>>;
// 	setActionParameters: React.Dispatch<React.SetStateAction<any[] | null>>;
// 	setSelectedAction: React.Dispatch<React.SetStateAction<any | null>>;
// 	isSelected: (path: string) => boolean;
// 	getSelectionScore: (path: string) => number;
// 	isRecentlySelected: (path: string, isAction?: boolean) => boolean;
// }

// export function useSelection(): SelectionContextType {
// 	const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
// 	const [recentlySelectedOptions, setRecentlySelectedOptions] = useState<string[]>([]);
// 	const [selectionNotification, setSelectionNotification] = useState<SelectionNotificationData | null>(null);
// 	const [actionParameters, setActionParameters] = useState<any[] | null>(null);
// 	const [selectedAction, setSelectedAction] = useState<any | null>(null);

// 	const isSelected = useCallback(
// 		(path: string): boolean => {
// 			try {
// 				if (!selectedOptions || selectedOptions.length === 0) return false;
// 				return selectedOptions.some((option) => {
// 					try {
// 						const matchingLink = option.serialized_view?.links?.some((link: any) => link.alias === option.token && link.name === path);
// 						const matchingAction = option.serialized_view?.actions?.some(
// 							(action: any) => action.alias === option.token && (action.label === path || action.name === path),
// 						);
// 						return matchingLink || matchingAction;
// 					} catch (error) {
// 						console.error('Error in isSelected option check:', error);
// 						return false;
// 					}
// 				});
// 			} catch (error) {
// 				console.error('Error in isSelected:', error);
// 				return false;
// 			}
// 		},
// 		[selectedOptions],
// 	);

// 	const getSelectionScore = useCallback(
// 		(path: string): number => {
// 			try {
// 				if (!selectedOptions || selectedOptions.length === 0) return 0;
// 				const option = selectedOptions.find((option) => {
// 					try {
// 						const matchingLink = option.serialized_view?.links?.some((link: any) => link.alias === option.token && link.name === path);
// 						const matchingAction = option.serialized_view?.actions?.some(
// 							(action: any) => action.alias === option.token && (action.label === path || action.name === path),
// 						);
// 						return matchingLink || matchingAction;
// 					} catch (error) {
// 						console.error('Error in getSelectionScore option check:', error);
// 						return false;
// 					}
// 				});
// 				return option?.score ?? 0;
// 			} catch (error) {
// 				console.error('Error in getSelectionScore:', error);
// 				return 0;
// 			}
// 		},
// 		[selectedOptions],
// 	);

// 	const isRecentlySelected = useCallback(
// 		(path: string, isAction: boolean = false): boolean => {
// 			try {
// 				if (!recentlySelectedOptions || recentlySelectedOptions.length === 0) return false;
// 				return selectedOptions.some((option) => {
// 					if (!recentlySelectedOptions.includes(option.token)) return false;
// 					try {
// 						if (isAction) {
// 							const matchingAction = option.serialized_view?.actions?.some(
// 								(action: { alias: string; label?: string; name?: string }) =>
// 									action.alias === option.token && (action.label === path || action.name === path),
// 							);
// 							return option.is_action && matchingAction;
// 						} else {
// 							const matchingLink = option.serialized_view?.links?.some(
// 								(link: { alias: string; name?: string; target_view?: string }) =>
// 									link.alias === option.token && (link.name === path || link.target_view === path),
// 							);
// 							return !option.is_action && matchingLink;
// 						}
// 					} catch (error) {
// 						console.error('Error in isRecentlySelected option check:', error);
// 						return false;
// 					}
// 				});
// 			} catch (error) {
// 				console.error('Error in isRecentlySelected:', error);
// 				return false;
// 			}
// 		},
// 		[recentlySelectedOptions, selectedOptions],
// 	);

// 	return {
// 		selectedOptions,
// 		setSelectedOptions,
// 		recentlySelectedOptions,
// 		setRecentlySelectedOptions,
// 		selectionNotification,
// 		setSelectionNotification,
// 		actionParameters,
// 		setActionParameters,
// 		selectedAction,
// 		setSelectedAction,
// 		isSelected,
// 		getSelectionScore,
// 		isRecentlySelected,
// 	};
// }
