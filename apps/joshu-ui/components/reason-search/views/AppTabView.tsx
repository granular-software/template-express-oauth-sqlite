import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Navigation, LayoutGrid, Check } from 'lucide-react';
import { ViewRenderer } from '../ViewRenderer';
import { SerializedView } from '@joshu/os-types';
import { UseOsClient } from '@/hooks/useOsClient';

interface AppTabViewProps {
	view: SerializedView;
	isSelected: (path: string) => boolean;
	getSelectionScore: (path: string) => number;
	isRecentlySelected?: (path: string, isAction?: boolean) => boolean;

	osClient: UseOsClient;	
	window_id: string;
}

export const AppTabView: React.FC<AppTabViewProps> = ({ 
	view, 
	isSelected, 
	getSelectionScore,
	isRecentlySelected = () => false,
	osClient,
	window_id
}) => {
	const selected = isSelected(view.router_path);
	const recentlySelected = isRecentlySelected(view.router_path, false);
	
	return (
		<motion.div
			animate={recentlySelected ? {
				scale: [1, 1.02, 1],
				boxShadow: [
					'0 0 0 rgba(124, 58, 237, 0)',
					'0 0 15px rgba(124, 58, 237, 0.5)',
					'0 0 0 rgba(124, 58, 237, 0)'
				]
			} : {}}
			transition={{ duration: 1.5 }}
		>
			<Card className={`
				shadow-sm overflow-hidden relative
				${recentlySelected ? 'border-2 border-indigo-400 dark:border-indigo-600' : 
					selected ? 'border border-indigo-300 dark:border-indigo-700' : 
					'border border-neutral-200 dark:border-neutral-800'}
			`}>
				{recentlySelected && (
					<motion.div 
						className="absolute inset-0 bg-indigo-400/20 dark:bg-indigo-600/30"
						initial={{ opacity: 0.8 }}
						animate={{ opacity: 0 }}
						transition={{ duration: 1.5 }}
					/>
				)}
				
				<div className={`
					p-3 border-b flex items-center gap-3
					${recentlySelected ? 'bg-indigo-50/80 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800' : 
						selected ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200/70 dark:border-indigo-800/70' : 
						'bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-900/50 dark:to-neutral-800/50 border-neutral-200 dark:border-neutral-800'}
				`}>
					<div className={`
						h-8 w-8 rounded-full flex items-center justify-center
						${recentlySelected ? 'bg-indigo-200 dark:bg-indigo-800/70' :
							selected ? 'bg-indigo-100 dark:bg-indigo-900/50' : 
							'bg-neutral-100 dark:bg-neutral-800/70'}
					`}>
						{recentlySelected ? (
							<motion.div
								initial={{ rotate: -30, scale: 0.5 }}
								animate={{ rotate: 0, scale: 1 }}
								transition={{ type: "spring", stiffness: 500, damping: 15 }}
							>
								<Check className="h-4 w-4 text-indigo-700 dark:text-indigo-300" />
							</motion.div>
						) : (
							<Navigation className={`h-4 w-4 ${
								selected ? 'text-indigo-600 dark:text-indigo-400' : 
								'text-neutral-500 dark:text-neutral-400'
							}`} />
						)}
					</div>
					<div>
						<h3 className={`font-medium text-sm ${
							recentlySelected ? 'text-indigo-700 dark:text-indigo-300' : 
							selected ? 'text-indigo-600 dark:text-indigo-400' : ''
						}`}>
							Tab: {view.name}
						</h3>
						<p className="text-xs text-neutral-500 dark:text-neutral-400">{view.description}</p>
					</div>
				</div>

				<CardContent className="p-4">
					<div className={`
						mb-3 text-xs font-medium uppercase tracking-wide flex items-center gap-2
						${recentlySelected ? 'text-indigo-600 dark:text-indigo-400' : 
							selected ? 'text-indigo-500 dark:text-indigo-400' : 
							'text-neutral-500 dark:text-neutral-400'}
					`}>
						<LayoutGrid className="h-3.5 w-3.5" />
						Components
					</div>

					<div className="space-y-3">
						{view.components.map((component, i) => (
							<ViewRenderer 
								key={i} 
								view={component} 
								isSelected={isSelected} 
								getSelectionScore={getSelectionScore}
								isRecentlySelected={isRecentlySelected}
								osClient={osClient}
								window_id={window_id}
							/>
						))}
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
};
