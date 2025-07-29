import { UseOsClient } from '@/hooks/useOsClient';
import { useDesktop, useDesktopActions } from '../context';
import { apps } from '../utils/apps';

export default function Dock({ client }: { client: UseOsClient }) {
	const { windows, minimizedWindows } = useDesktop();
    const { restoreWindow, minimizeWindow } = useDesktopActions();

    
	return (
		<div
			className="absolute bottom-6 left-1/2 transform -translate-x-1/2"
			style={{
				transform: 'translate3d(-50%, 0, 0)',
				willChange: 'transform',
			}}
		>
			<div className="relative bg-white/30 dark:bg-black/40 backdrop-blur-xl rounded-full px-6 py-3 border border-white/30 dark:border-white/10 shadow-xl">
				<div className="flex items-center gap-5 justify-center">
					{apps.map((app, i) => {
						const isOpen = windows.some((window) => window.view.name === app.name);
						const isMinimized = minimizedWindows.has(app.name);

						return (
							<div key={i} className="group relative flex flex-col items-center">
								<div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-xs font-medium bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg">
									{app.name}
								</div>
								<div
									className={`relative w-12 h-12 rounded-full bg-gradient-to-br from-white/90 to-white/70 dark:from-neutral-800/90 dark:to-neutral-700/70 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-200 ${
										isOpen && !isMinimized
											? `border-2 ${app.color.replace('text-', 'border-')} ring-4 ring-${app.color.replace('text-', '')}/20`
											: isMinimized
												? 'border border-neutral-400/50 dark:border-neutral-500/50 opacity-70'
												: 'border border-white/40 dark:border-white/10 group-hover:border-white/60 dark:group-hover:border-white/20'
									}`}
									onClick={() => {
										if (isOpen && isMinimized) {
											restoreWindow(app.name);
										} else if (isOpen) {
											minimizeWindow(app.name);
										}
										// In a real implementation, this would launch the app if not open
										client.open_app(app.path);
									}}
								>
									{
										<app.icon
											className={`h-6 w-6 ${
												isOpen && !isMinimized
													? `${app.color} filter drop-shadow-md`
													: isMinimized
														? `${app.color} opacity-70`
														: app.color
											}`}
										/>
									}

									{/* Subtle glow effect for open apps */}
									{isOpen && !isMinimized && (
										<div
											className={`absolute inset-0 rounded-full ${app.color.replace('text-', 'bg-')}/10 animate-pulse-slow blur-sm -z-10`}
										></div>
									)}
								</div>
								{isOpen && !isMinimized ? (
									<div
										className={`absolute -bottom-1 w-2 h-2 rounded-full ${app.color.replace('text-', 'bg-')} shadow-lg shadow-${app.color.replace('text-', '')}/30`}
									></div>
								) : isMinimized ? (
									<div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500"></div>
								) : null}
							</div>
						);
					})}
				</div>
			</div>

			{/* Enhanced reflection effect */}
			<div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4/5 h-6 bg-gradient-to-t from-white/10 to-transparent blur-md rounded-full"></div>
		</div>
	);
}
