import React from 'react';
import { motion } from 'framer-motion';
import { TextInputViewComponent } from '../view-types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Type } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SerializedView } from '@joshu/os-types';
import { UseOsClient } from '@/hooks/useOsClient';
interface TextInputViewProps {
	view: SerializedView;
	isSelected: (path: string) => boolean;
	getSelectionScore: (path: string) => number;
	isRecentlySelected?: (path: string, isAction?: boolean) => boolean;
	osClient: UseOsClient;
	window_id: string;
}

export const TextInputView: React.FC<TextInputViewProps> = ({ 
	view, 
	isSelected, 
	getSelectionScore,
	isRecentlySelected = () => false,
	osClient,
	window_id
}) => {
	const selected = isSelected(view.router_path);
	const recentlySelected = isRecentlySelected(view.router_path, true); // Text inputs are usually actions
	const score = getSelectionScore(view.router_path);
	const scorePercentage = Math.round(score * 100);
	
	return (
		<motion.div
			animate={recentlySelected ? {
				scale: [1, 1.03, 1],
				boxShadow: [
					'0 0 0 rgba(14, 165, 233, 0)',
					'0 0 15px rgba(14, 165, 233, 0.5)',
					'0 0 0 rgba(14, 165, 233, 0)'
				]
			} : {}}
			transition={{ duration: 1.5 }}
		>
			<Card className={`
				shadow-sm border overflow-hidden transition-colors relative
				${recentlySelected ? 'border-cyan-400 dark:border-cyan-600 bg-cyan-50/80 dark:bg-cyan-900/30' : 
					selected ? 'border-cyan-300 dark:border-cyan-700 bg-cyan-50/50 dark:bg-cyan-900/10' : 
					'border-neutral-200 dark:border-neutral-800'}
			`}>
				{recentlySelected && (
					<motion.div 
						className="absolute inset-0 bg-cyan-400/20 dark:bg-cyan-600/30"
						initial={{ opacity: 0.8 }}
						animate={{ opacity: 0 }}
						transition={{ duration: 1.5 }}
					/>
				)}
				
				<CardContent className="p-3">
					<div className="flex items-center gap-3 mb-2">
						<div className={`
							h-8 w-8 rounded-full flex items-center justify-center
							${recentlySelected ? 'bg-cyan-200 dark:bg-cyan-800/70' :
								selected ? 'bg-cyan-100 dark:bg-cyan-900/50' : 
								'bg-neutral-100 dark:bg-neutral-800'}
						`}>
							{recentlySelected ? (
								<motion.div
									initial={{ rotate: -30, scale: 0.5 }}
									animate={{ rotate: 0, scale: 1 }}
									transition={{ type: "spring", stiffness: 500, damping: 15 }}
								>
									<Check className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
								</motion.div>
							) : (
								<Type className={`h-4 w-4 ${
									selected ? 'text-cyan-600 dark:text-cyan-400' : 
									'text-neutral-500'}`} 
								/>
							)}
						</div>
						
						<div className="flex-1 min-w-0">
							<div className={`font-medium text-sm ${recentlySelected ? 'text-cyan-700 dark:text-cyan-300' : ''}`}>
								{view.name}
							</div>
							<div className="text-xs text-neutral-500 dark:text-neutral-400">{view.description}</div>
						</div>
						
						{selected && (
							<Badge className={`
								text-white flex items-center gap-1.5
								${recentlySelected ? 'bg-cyan-600 dark:bg-cyan-700' : 'bg-cyan-500 dark:bg-cyan-600'}
							`}>
								<Check className="h-3 w-3" />
								<span>{scorePercentage}%</span>
							</Badge>
						)}
					</div>
					
					<div className="mt-3">
						<div className={`
							w-full h-10 px-3 py-2 rounded-md border text-sm
							${recentlySelected ? 'border-cyan-400 dark:border-cyan-600 bg-white dark:bg-neutral-800 shadow-sm' : 
								selected ? 'border-cyan-300 dark:border-cyan-700 bg-white dark:bg-neutral-800' : 
								'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900'}
						`}>
							{view.description}
						</div>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}; 