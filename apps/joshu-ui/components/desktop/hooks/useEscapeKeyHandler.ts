import { useEffect } from "react";

export const useEscapeKeyHandler = (isFullScreen: boolean, setIsFullScreen: (isFullScreen: boolean) => void) => {
	useEffect(() => {
		const handleEscapeKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isFullScreen) {
				setIsFullScreen(false);
			}
		};
		window.addEventListener('keydown', handleEscapeKey);
		return () => {
			window.removeEventListener('keydown', handleEscapeKey);
		};
	}, [isFullScreen, setIsFullScreen]);
};
