import React from 'react';
import { motion } from 'framer-motion';
import { LinkViewComponent } from '../view-types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Link, ExternalLink } from 'lucide-react';
import { SerializedView } from '@joshu/os-types';
import { UseOsClient } from '@/hooks/useOsClient';
interface LinkViewProps {
	view: SerializedView;
	isSelected: (path: string) => boolean;
	getSelectionScore: (path: string) => number;
	isRecentlySelected?: (path: string, isAction?: boolean) => boolean;
	osClient: UseOsClient;
	window_id: string;
}

export const LinkView: React.FC<LinkViewProps> = ({ view, isSelected, getSelectionScore, isRecentlySelected = () => false, osClient, window_id }) => {
	const selected = isSelected(view.router_path);
	const recentlySelected = isRecentlySelected(view.router_path, false);
	const score = getSelectionScore(view.router_path);
	const scorePercentage = Math.round(score * 100);

	return (
		<motion.div
			animate={recentlySelected ? {
				scale: [1, 1.03, 1],
				boxShadow: [
					'0 0 0 rgba(59, 130, 246, 0)',
					'0 0 15px rgba(59, 130, 246, 0.5)',
					'0 0 0 rgba(59, 130, 246, 0)'
				]
			} : {}}
			transition={{ duration: 1.5 }}
		>
			<Card
				className={`
          shadow-sm border overflow-hidden transition-colors relative
          ${recentlySelected ? 'border-blue-400 dark:border-blue-600 bg-blue-50/80 dark:bg-blue-900/30' : 
            selected ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10' : 
            'border-neutral-200 dark:border-neutral-800'}
        `}
			>
				{recentlySelected && (
					<motion.div 
						className="absolute inset-0 bg-blue-400/20 dark:bg-blue-600/30"
						initial={{ opacity: 0.8 }}
						animate={{ opacity: 0 }}
						transition={{ duration: 1.5 }}
					/>
				)}
				
				<CardContent className="p-3 flex items-center gap-3">
					<div
						className={`
            h-8 w-8 rounded-full flex items-center justify-center
            ${recentlySelected ? 'bg-blue-200 dark:bg-blue-800/70' :
							selected ? 'bg-blue-100 dark:bg-blue-900/50' : 
							'bg-neutral-100 dark:bg-neutral-800'}
          `}
					>
						{recentlySelected ? (
							<motion.div
								initial={{ rotate: -30, scale: 0.5 }}
								animate={{ rotate: 0, scale: 1 }}
								transition={{ type: "spring", stiffness: 500, damping: 15 }}
							>
								<Check className="h-4 w-4 text-blue-700 dark:text-blue-300" />
							</motion.div>
						) : (
							<Link className={`h-4 w-4 ${
								selected ? 'text-blue-600 dark:text-blue-400' : 
								'text-neutral-500'}`} 
							/>
						)}
					</div>

					<div className="flex-1 min-w-0">
						<div className={`font-medium text-sm ${recentlySelected ? 'text-blue-700 dark:text-blue-300' : ''}`}>
							{view.name}
						</div>
						<div className="text-xs text-neutral-500 dark:text-neutral-400">{view.description}</div>
						<div className="mt-1 text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1">
							<ExternalLink className="h-3 w-3" />
							Links to: {view.router_path}
						</div>
					</div>

					{selected && (
						<Badge className={`
							text-white flex items-center gap-1.5
							${recentlySelected ? 'bg-blue-600 dark:bg-blue-700' : 'bg-blue-500 dark:bg-blue-600'}
						`}>
							<Check className="h-3 w-3" />
							<span>{scorePercentage}%</span>
						</Badge>
					)}
				</CardContent>
			</Card>
		</motion.div>
	);
};
