import { Rnd } from 'react-rnd';
import { apps } from '../utils/apps';
import { ViewRenderer } from '@/components/reason-search/ViewRenderer';
import { Search } from 'lucide-react';
import { useDesktop, useDesktopActions, useSelection } from '../context';
import { UseOsClient } from '@/hooks/useOsClient';

// Window position and size tracking interface
export interface WindowState {
	width: number;
	height: number;
	x: number;
	y: number;
	zIndex: number;
}

export interface WindowStates {
	[key: string]: WindowState;
}

export default function Views({ client }: { client: UseOsClient }) {
	const { windows, windowStates, minimizedWindows, maximizedWindows, desktopRef } = useDesktop();

	const { bringToFront, ensureWindowInBounds, maximizeWindow, minimizeWindow, setWindowStates } = useDesktopActions();

	const { selectedAction, isSelected, getSelectionScore, isRecentlySelected } = useSelection();

	return (
		<div
			className="relative h-full backdrop-filter backdrop-blur-sm"
			style={{
				transform: 'translateZ(0)',
				willChange: 'transform',
			}}
		>
			{/* Display the actual views/windows */}
			<div className="h-full" ref={desktopRef}>
				{/* {views.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full w-full">
						<div className="relative w-16 h-16 mb-6 backdrop-blur-sm">
							<div className="absolute inset-0 rounded-full border-4 border-white/40 dark:border-neutral-800/60"></div>
							<div className="absolute inset-0 rounded-full border-4 border-t-blue-500/90 border-r-transparent border-b-transparent border-l-transparent animate-spin duration-1500"></div>
						</div>
						<h3 className="text-lg font-medium text-neutral-800/90 dark:text-white/90 mb-2 backdrop-blur-sm">Initializing the OS</h3>
						<p className="text-sm text-neutral-700/80 dark:text-white/70 text-center max-w-md backdrop-blur-sm">
							Preparing your desktop environment...
						</p>
						<div className="mt-6 flex gap-2">
							<div className="w-2.5 h-2.5 rounded-full bg-blue-500/80 dark:bg-blue-400/80 animate-pulse shadow-lg shadow-blue-500/20"></div>
							<div className="w-2.5 h-2.5 rounded-full bg-blue-500/80 dark:bg-blue-400/80 animate-pulse delay-150 shadow-lg shadow-blue-500/20"></div>
							<div className="w-2.5 h-2.5 rounded-full bg-blue-500/80 dark:bg-blue-400/80 animate-pulse delay-300 shadow-lg shadow-blue-500/20"></div>
						</div>
					</div>
				) : (
					<></>
				)} */}

				{windows && windows.length > 0 ? (
					windows
						.filter((window) => window.view.type !== 'desktop' && !minimizedWindows.has(window.id))
						.map((window, i) => {
							// Determine if the currently selected action belongs to this view
							const isActionView = selectedAction && selectedAction.serialized_view?.name === window.view.name;
							// Find the specific action definition within the view's data
							const actionDefinition = isActionView ? window.view.actions?.find((a: any) => a.alias === selectedAction.token) : null;

							// Get window state or use default
							const windowState = windowStates[window.id] || {
								width: 500,
								height: 400,
								x: i * 20,
								y: i * 20,
								zIndex: 100 + i,
							};

							// Check if window is maximized
							const isMaximized = maximizedWindows.has(window.id);

							// Find app icon for this view
							const appInfo = apps.find((app) => app.name === window.view.name) || apps[0];

							return (
								<Rnd
									key={window.id || i}
									data-view-name={window.id}
									size={{
										width: isMaximized ? (desktopRef.current?.clientWidth ?? windowState.width) - 20 : windowState.width,
										height: isMaximized ? (desktopRef.current?.clientHeight ?? windowState.height) - 20 : windowState.height,
									}}
									position={{
										x: isMaximized ? 10 : windowState.x,
										y: isMaximized ? 10 : windowState.y,
									}}
									style={{
										zIndex: windowState.zIndex,
										transition: isMaximized ? 'width 0.2s, height 0.2s, transform 0.2s' : undefined,
									}}
									bounds="parent"
									onDragStart={() => bringToFront(window.id)}
									onResizeStart={() => bringToFront(window.id)}
									onDragStop={(e, d) => {
										if (!isMaximized) {
											// Ensure window stays within bounds
											const { x, y } = ensureWindowInBounds(window.id, d.x, d.y, windowState.width, windowState.height);

											setWindowStates((prev) => ({
												...prev,
												[window.id]: {
													...prev[window.id],
													x,
													y,
												},
											}));
										}
									}}
									onResizeStop={(e, direction, ref, delta, position) => {
										if (!isMaximized) {
											const width = parseInt(ref.style.width);
											const height = parseInt(ref.style.height);

											// Ensure window stays within bounds after resize
											const { x, y } = ensureWindowInBounds(window.id, position.x, position.y, width, height);

											setWindowStates((prev) => ({
												...prev,
												[window.id]: {
													...prev[window.id],
													width,
													height,
													x,
													y,
												},
											}));
										}
									}}
									minWidth={300}
									minHeight={200}
									dragHandleClassName="window-header"
									disableDragging={isMaximized}
									enableResizing={!isMaximized}
								>
									<div className="bg-white/95 dark:bg-neutral-900/95 rounded-lg shadow-xl border border-neutral-200/30 dark:border-neutral-700/40 backdrop-blur-md overflow-hidden flex flex-col h-full transition-shadow duration-200 hover:shadow-2xl">
										{/* Window Header */}
										<div
											className="window-header bg-gradient-to-r from-neutral-100/90 to-neutral-50/90 dark:from-neutral-800/90 dark:to-neutral-850/90 px-3 py-2 border-b border-neutral-200/30 dark:border-neutral-700/50 cursor-move flex items-center justify-between"
											onDoubleClick={() => maximizeWindow(window.id)}
										>
											<div className="flex items-center gap-2">
												<div className="flex gap-1.5">
													<button
														onClick={(e) => {
															e.stopPropagation();
															// closeWindow(window.id);
															client.close_window(window.id);
														}}
														className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 shadow-inner shadow-red-700/20 transition-colors duration-150"
													></button>
													<button
														onClick={(e) => {
															e.stopPropagation();
															minimizeWindow(window.id);
														}}
														className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 shadow-inner shadow-yellow-700/20 transition-colors duration-150"
													></button>
													<button
														onClick={(e) => {
															e.stopPropagation();
															maximizeWindow(window.id);
														}}
														className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 shadow-inner shadow-green-700/20 transition-colors duration-150"
													></button>
												</div>
												<div className="flex items-center gap-2 ml-2">
													{appInfo.icon && <appInfo.icon className={`h-4 w-4 ${appInfo.color}`} />}
													<div className="text-sm font-medium truncate">{window.view.name}</div>
												</div>
											</div>
											<div className="flex items-center gap-1.5">
												{/* Window controls */}
												<button className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 p-0.5 rounded">
													<Search className="h-3.5 w-3.5" />
												</button>
											</div>
										</div>
										{/* Window Content */}
										<div className="window-content p-4 flex-grow overflow-auto">
											<ViewRenderer
												view={window.view}
												window_id={window.id}
												osClient={client}
												isSelected={isSelected}
												getSelectionScore={getSelectionScore}
												isRecentlySelected={isRecentlySelected}
											/>
										</div>
										{/* Window Status Bar */}
										<div className="bg-neutral-100/80 dark:bg-neutral-800/80 border-t border-neutral-200/30 dark:border-neutral-700/30 px-3 py-1 text-xs text-neutral-500 dark:text-neutral-400 flex justify-between items-center">
											<div>
												{window.view.name} {window.view.type !== 'desktop' ? '• Active' : ''}
											</div>
											<div className="flex items-center gap-2">
												{isActionView && (
													<span className="px-1.5 py-0.5 bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
														Action in progress
													</span>
												)}
											</div>
										</div>
									</div>
								</Rnd>
							);
						})
				) : (
					<></>
				)}
			</div>
		</div>
	);
}
