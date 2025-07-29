import { OsDocument, RankedOption, SelectedOptionsEventContent, SerializedView } from '@joshu/os-types';
import { useEffect } from 'react';
import { WindowStates } from '../components/Views';

// Define proper types for selection notification
export interface SelectionNotificationData {
	viewName: string;
	optionName: string;
	isAction: boolean;
	timestamp: number;
}

export const useProcessUpdates = (
	doc: OsDocument,
	desktopRef: React.RefObject<HTMLDivElement>,
	windowStates: WindowStates,
	highestZIndex: number,
	selectedOptions: RankedOption[],
	selectedAction: any,
	setWindowStates: React.Dispatch<React.SetStateAction<WindowStates>>,
	// setViews: React.Dispatch<React.SetStateAction<{ id: string; view: SerializedView }[]>>,
	setWindows: React.Dispatch<React.SetStateAction<{ id: string; view: SerializedView }[]>>,
	setHighestZIndex: React.Dispatch<React.SetStateAction<number>>,
	// current_views: SerializedView[],
	current_windows: { id: string; view: SerializedView }[],
	setSelectedOptions: React.Dispatch<React.SetStateAction<RankedOption[]>>,
	setRecentlySelectedOptions: React.Dispatch<React.SetStateAction<string[]>>,
	setSelectionNotification: React.Dispatch<React.SetStateAction<SelectionNotificationData | null>>,
	setActionParameters: React.Dispatch<React.SetStateAction<any[] | null>>,
	setSelectedAction: React.Dispatch<React.SetStateAction<any | null>>,
) =>
	useEffect(() => {
		try {
			// const updates = chunks.flat();
			if (!doc) return; // No updates to process

			const loaded_windows = doc.windows.filter((window) => window.view.type !== 'desktop');

			const views_added = doc.windows.filter((window) => !windowStates[window.id]);

			// 	// Initialize window states for new views
			let newWindowStates = { ...windowStates };
			let shouldUpdateWindowStates = false;
			let newHighestZIndex = highestZIndex;

			views_added.forEach((window) => {
				if (window.view.type !== 'desktop' && !windowStates[window.id]) {
					// Generate a random position for new windows
					const desktopWidth = desktopRef.current?.clientWidth || 800;
					const desktopHeight = desktopRef.current?.clientHeight || 600;

					newWindowStates[window.id] = {
						width: 500,
						height: 400,
						x: Math.random() * (desktopWidth - 550),
						y: Math.random() * (desktopHeight - 450),
						zIndex: newHighestZIndex + 1,
					};

					newHighestZIndex += 1;
					shouldUpdateWindowStates = true;
				}
			});

			// 	// Only update state if necessary, and do it separately
			if (shouldUpdateWindowStates) {
				setWindowStates(newWindowStates);
				setHighestZIndex(newHighestZIndex);
			}

			// 	// Only call setViews if the views are actually different
			if (JSON.stringify(current_windows) !== JSON.stringify(loaded_windows)) {
				setWindows(loaded_windows);
			}
			// }

			// --- Process Selected Options ---
			const selectedOptionsUpdates = doc.logs.filter((update) => update.type === 'selected_options');

			if (selectedOptionsUpdates.length > 0) {
				const lastSelectedOptionsUpdate = selectedOptionsUpdates[selectedOptionsUpdates.length - 1];
				// Cast the options to ensure type compatibility
				const newSelectedOptions: RankedOption[] = ((lastSelectedOptionsUpdate.content as SelectedOptionsEventContent).options || []).map(
					(option) => ({
						...option,
						serialized_view: {
							...option.serialized_view,
							actions:
								option.serialized_view?.actions?.map((action) => ({
									...action,
									alias: action.label || '', // Use existing alias if available, fallback to label
								})) || [],
						},
					}),
					) as RankedOption[];

				// Track newly selected options for highlighting
				const newlySelectedTokens = newSelectedOptions
					.filter((option) => !selectedOptions.some((existing) => existing.token === option.token))
					.map((option) => option.token);

				if (newlySelectedTokens.length > 0) {
					// Add to recently selected options
					setRecentlySelectedOptions(newlySelectedTokens);

					// Clear the recently selected status after a short delay (2 seconds)
					setTimeout(() => {
						setRecentlySelectedOptions((prev) => prev.filter((token) => !newlySelectedTokens.includes(token)));
					}, 2000);

					// Show notification for the first newly selected option
					if (newlySelectedTokens.length > 0 && newSelectedOptions.length > 0) {
						const firstNewOption = newSelectedOptions.find((option) => newlySelectedTokens.includes(option.token));

						if (firstNewOption) {
							setSelectionNotification({
								viewName: firstNewOption.serialized_view?.name || 'Unknown',
								optionName: firstNewOption.type === 'action'
									? firstNewOption.serialized_view?.actions?.find((a) => a.alias === firstNewOption.token)?.label || firstNewOption.token
									: firstNewOption.serialized_view?.clickable_links?.find((l) => l.alias === firstNewOption.token)?.name || firstNewOption.token,
								isAction: firstNewOption.type === 'action' || firstNewOption.type === 'close_window',
								timestamp: Date.now(),
							});

							// Clear notification after 3 seconds
							setTimeout(() => {
								setSelectionNotification(null);
							}, 3000);
						}
					}
				}

				setSelectedOptions(newSelectedOptions);

				// Find the action in the *latest* selection update
				const lastActionOption = (lastSelectedOptionsUpdate.content as SelectedOptionsEventContent).options?.find((option) => option.type === "action" || option.type === "close_window");
				if (lastActionOption) {
					// Only update if the action is different from the current one
					if (selectedAction?.token !== lastActionOption.token || selectedAction?.serialized_view?.name !== lastActionOption.serialized_view?.name) {
						setSelectedAction(lastActionOption);
						setActionParameters(null); // Reset parameters when a new action is selected
					}
				} else {
					// If the latest update has no action selected, clear the global action state
					setSelectedAction(null);
					setActionParameters(null);
				}
			}

			// --- Process Action Parameters ---
			// Only process if an action is currently selected
			// if (selectedAction) {
			// 	const actionParametersUpdates = updates.filter((update) => update.type === 'action_parameters_filled') as ActionParametersFilledUpdate[];
			// 	if (actionParametersUpdates.length > 0) {
			// 		const lastActionParametersUpdate = actionParametersUpdates[actionParametersUpdates.length - 1];
			// 		setActionParameters(lastActionParametersUpdate.data.parameters || []);
			// 	}
			// }
		} catch (error) {
			console.error('Error processing updates:', error);
		}
	}, [doc]);
