import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { SerializedView } from '@joshu/os-types';
import { UseOsClient } from '@/hooks/useOsClient';	
interface ButtonViewProps {
	view: SerializedView;
	isSelected: (path: string) => boolean;
	getSelectionScore: (path: string) => number;
	isRecentlySelected?: (path: string, isAction?: boolean) => boolean;
	osClient: UseOsClient;
	window_id: string;
}

export const ButtonView: React.FC<ButtonViewProps> = ({ 
	view, 
	isSelected, 
	getSelectionScore,
	isRecentlySelected = () => false,
	osClient,
	window_id
}) => {
	const selected = isSelected(view.name);
	const recentlySelected = isRecentlySelected(view.name, true);
	const score = getSelectionScore(view.name);
	
	return (
		<motion.div
			animate={recentlySelected ? {
				scale: [1, 1.05, 1],
				boxShadow: [
					'0 0 0 rgba(147, 51, 234, 0)',
					'0 0 15px rgba(147, 51, 234, 0.5)',
					'0 0 0 rgba(147, 51, 234, 0)'
				]
			} : {}}
			transition={{ duration: 1.5 }}
		>
			<Button 
				className={`
					relative
					${recentlySelected ? 'ring-2 ring-purple-500 dark:ring-purple-400' : 
						selected ? 'ring-2 ring-purple-400 dark:ring-purple-500' : ''}
				`}
				variant={selected || recentlySelected ? "default" : "outline"}
			>
				{recentlySelected && (
					<motion.span 
						className="absolute inset-0 bg-purple-400/20 dark:bg-purple-600/30 rounded-md"
						initial={{ opacity: 0.8 }}
						animate={{ opacity: 0 }}
						transition={{ duration: 1.5 }}
					/>
				)}
				
				<span className="flex items-center gap-1.5">
					{recentlySelected && (
						<motion.span
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ type: "spring", stiffness: 500, damping: 15 }}
						>
							<Check className="h-3.5 w-3.5 text-purple-600 dark:text-purple-300" />
						</motion.span>
					)}
					{view.name}
				</span>
				
				{(selected || recentlySelected) && score > 0 && (
					<span className={`
						ml-2 text-xs px-1 rounded
						${recentlySelected ? 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200' : 
							'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'}
					`}>
						{(score * 100).toFixed(0)}%
					</span>
				)}
			</Button>
		</motion.div>
	);
}; 