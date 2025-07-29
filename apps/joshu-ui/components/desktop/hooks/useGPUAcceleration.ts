import { useEffect } from "react";

export const useGPUAcceleration = (osScreenRef: React.RefObject<HTMLDivElement>, desktopRef: React.RefObject<HTMLDivElement>) =>
	useEffect(() => {
		const osscreen = osScreenRef.current;
		if (!osscreen) return;

		// Apply hardware acceleration
		osscreen.style.transform = 'translateZ(0)';
		osscreen.style.backfaceVisibility = 'hidden';
		osscreen.style.perspective = '1000px';

		// Apply to desktop container as well
		if (desktopRef.current) {
			desktopRef.current.style.transform = 'translateZ(0)';
			desktopRef.current.style.backfaceVisibility = 'hidden';
			desktopRef.current.style.perspective = '1000px';
		}
	}, []);
