import { useDesktop, useDesktopActions } from '../context';
import { apps } from '../utils/apps';

export default function MinimizedWindowsTray() {
	const { minimizedWindows } = useDesktop();
	const { restoreWindow } = useDesktopActions();

	return (
		minimizedWindows.size > 0 && (
			<div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
				<div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl rounded-full px-4 py-1.5 border border-white/40 dark:border-white/10 shadow-lg flex items-center gap-1">
					<div className="mr-1 text-xs font-medium text-neutral-800/90 dark:text-white/90 px-1.5">Minimized</div>
					<div className="h-4 w-px bg-white/30 dark:bg-white/10 mx-1"></div>
					<div className="flex items-center gap-1">
						{Array.from(minimizedWindows).map((viewName) => {
							const appInfo = apps.find((app) => app.name === viewName) || apps[0];
							return (
								<button
									key={viewName}
									onClick={() => restoreWindow(viewName)}
									className="group flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-white/30 dark:hover:bg-white/10 transition-all duration-200"
								>
									<div className="relative">
										{appInfo.icon && <appInfo.icon className={`h-5 w-5 ${appInfo.color}`} />}
										<div className="absolute -right-1 -bottom-1 w-2.5 h-2.5 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="currentColor"
												className="w-2 h-2 text-neutral-600 dark:text-neutral-300"
											>
												<path d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
										</div>
									</div>
									<span className="text-xs font-medium text-neutral-800/90 dark:text-white/90 group-hover:opacity-100 opacity-80 transition-opacity duration-200">
										{viewName}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* Subtle glow effect */}
				<div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-md -z-10"></div>
			</div>
		)
	);
}
