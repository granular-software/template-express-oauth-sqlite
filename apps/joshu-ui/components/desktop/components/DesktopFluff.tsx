import { apps } from '../utils/apps';
import { useDesktop, useDesktopActions } from '../context';

export default function DesktopFluff() {
	const { windows, minimizedWindows, isFullScreen } = useDesktop();
	const { restoreWindow, bringToFront, toggleFullScreen } = useDesktopActions();

	return (
		<div>
			{/* Subtle animated gradient overlay - add GPU acceleration */}
			<div
				className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 dark:from-transparent dark:via-blue-500/5 dark:to-purple-500/10 animate-gradient-slow rounded-3xl overflow-hidden"
				style={{
					transform: 'translateZ(0)',
					willChange: 'transform, opacity',
				}}
			/>

			{/* Subtle grid pattern */}
			<div className="absolute inset-0 bg-grid-white/[0.03] dark:bg-grid-white/[0.02] [mask-image:linear-gradient(0deg,transparent,black)] rounded-3xl" />

			{/* Glass reflection effect */}
			<div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent h-1/3 rounded-t-3xl" />

			{/* Status bar at top */}
			<div className="absolute top-0 left-0 right-0 h-8 bg-white/20 dark:bg-black/20 backdrop-blur-md border-b border-white/10 dark:border-white/5 px-4 flex items-center justify-between z-10">
				<div className="flex items-center gap-3">
					<div className="text-neutral-800/90 dark:text-white/90 font-medium text-xs flex items-center gap-1.5">
						<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" fillOpacity="0.8" />
							<path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							<path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
						Joshu OS
					</div>
				</div>
				<div className="flex items-center gap-3">
					{/* Fullscreen toggle button - repositioned to status bar */}
					<button
						onClick={toggleFullScreen}
						className="bg-transparent hover:bg-white/20 dark:hover:bg-white/10 rounded-full p-1 transition-colors duration-200 flex items-center justify-center"
						title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
					>
						{isFullScreen ? (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								className="w-3.5 h-3.5 text-neutral-800 dark:text-white"
							>
								<path
									fillRule="evenodd"
									d="M5.25 2.25a3 3 0 0 0-3 3v13.5a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3V5.25a3 3 0 0 0-3-3H5.25ZM6.75 7.5a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0V9.81l1.72 1.72a.75.75 0 1 0 1.06-1.06L8.56 8.75h1.44a.75.75 0 0 0 0-1.5h-3a.75.75 0 0 0-.75.75Zm10.5 4.5a.75.75 0 0 0-.75.75v1.94l-1.72-1.72a.75.75 0 1 0-1.06 1.06l1.72 1.72h-1.44a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 .75-.75v-3a.75.75 0 0 0-.75-.75Z"
									clipRule="evenodd"
								/>
							</svg>
						) : (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								className="w-3.5 h-3.5 text-neutral-800 dark:text-white"
							>
								<path
									fillRule="evenodd"
									d="M15 3.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V5.56l-3.97 3.97a.75.75 0 1 1-1.06-1.06l3.97-3.97h-2.69a.75.75 0 0 1-.75-.75Zm-12 0A.75.75 0 0 1 3.75 3h4.5a.75.75 0 0 1 0 1.5H5.56l3.97 3.97a.75.75 0 0 1-1.06 1.06L4.5 5.56v2.69a.75.75 0 0 1-1.5 0v-4.5Zm11.47 11.78a.75.75 0 1 1 1.06-1.06l3.97 3.97v-2.69a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1 0-1.5h2.69l-3.97-3.97Zm-4.94-1.06a.75.75 0 0 1 0 1.06L5.56 19.5h2.69a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 1.5 0v2.69l3.97-3.97a.75.75 0 0 1 1.06 0Z"
									clipRule="evenodd"
								/>
							</svg>
						)}
					</button>
					<div className="text-neutral-700/90 dark:text-white/80 text-xs flex items-center gap-1.5">
						<div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
						Online
					</div>
					<div className="text-neutral-700/90 dark:text-white/80 text-xs">
						{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
					</div>
				</div>
			</div>

			{/* Desktop icons */}
			<div
				className="absolute top-12 left-6 grid grid-cols-1 gap-5"
				style={{
					transform: 'translateZ(0)',
					willChange: 'transform',
				}}
			>
				{apps.slice(0, 4).map((app, i) => (
					<div
						key={i}
						className="group flex flex-col items-center w-16 cursor-pointer"
						onClick={() => {
							// Find if this app is already open
							const appView = windows.find((window) => window.view.name === app.name);
							if (appView) {
								// If minimized, restore it
								if (minimizedWindows.has(appView.id)) {
									restoreWindow(appView.id);
								} else {
									// Otherwise bring to front
									bringToFront(appView.id);
								}
							}
							// In a real OS, this would launch the app if not open
						}}
					>
						<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-neutral-800/80 dark:to-neutral-700/60 flex items-center justify-center shadow-lg group-hover:scale-105 transition-all duration-200 border border-white/40 dark:border-white/10 group-hover:border-white/60 dark:group-hover:border-white/20">
							{<app.icon className={`h-6 w-6 ${app.color} dark:${app.color}`} />}
						</div>
						<span className="mt-1.5 text-xs font-medium text-neutral-800/90 dark:text-white/90 text-center px-1.5 py-0.5 rounded bg-white/30 dark:bg-black/30 backdrop-blur-sm shadow-sm">
							{app.name}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
