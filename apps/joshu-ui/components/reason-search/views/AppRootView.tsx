import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigation, Check } from 'lucide-react';
import { ViewRenderer } from '../ViewRenderer';
import { SerializedView } from '@joshu/os-types';
import { UseOsClient } from '@/hooks/useOsClient';
interface AppRootViewProps {
	view: SerializedView;
	isSelected: (path: string) => boolean;
	getSelectionScore: (path: string) => number;
	isRecentlySelected?: (path: string, isAction?: boolean) => boolean;

	osClient: UseOsClient;
	window_id: string;
}

export const AppRootView: React.FC<AppRootViewProps> = ({ view, isSelected, getSelectionScore, isRecentlySelected = () => false, osClient, window_id }) => {
	const defaultTab = '0';

	return (
		<Card className="shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
			<div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
				<div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
					<Navigation className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
				</div>
				<div>
					<h3 className="font-medium text-sm">{view.name}</h3>
					<p className="text-xs text-neutral-500 dark:text-neutral-400">{view.description}</p>
				</div>
			</div>

			<CardContent className="p-4">
				<Tabs defaultValue={defaultTab} className="w-full">
					<TabsList className="mb-4 bg-neutral-100 dark:bg-neutral-800/80">
						{view.components.map((tab, index) => {
							const selected = isSelected(tab.router_path);
							const recentlySelected = isRecentlySelected(tab.router_path, false);

							return (
								<motion.div
									key={index}
									animate={
										recentlySelected
											? {
													scale: [1, 1.05, 1],
												}
											: {}
									}
									transition={{ duration: 1 }}
								>
									<TabsTrigger
										value={String(index)}
										className={`
											relative
											${
												recentlySelected
													? 'data-[state=active]:bg-purple-200 data-[state=active]:text-purple-800 dark:data-[state=active]:bg-purple-800/40 dark:data-[state=active]:text-purple-200'
													: selected
														? 'data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 dark:data-[state=active]:bg-purple-900/30 dark:data-[state=active]:text-purple-300'
														: ''
											}
										`}
									>
										{recentlySelected && (
											<motion.span
												className="absolute inset-0 bg-purple-400/20 dark:bg-purple-600/30 rounded-md"
												initial={{ opacity: 0.8 }}
												animate={{ opacity: 0 }}
												transition={{ duration: 1.5 }}
											/>
										)}

										<span className="flex items-center gap-1">
											{recentlySelected && (
												<motion.span
													initial={{ scale: 0 }}
													animate={{ scale: 1 }}
													transition={{ type: 'spring', stiffness: 500, damping: 15 }}
												>
													<Check className="h-3 w-3 text-purple-600 dark:text-purple-300 mr-1" />
												</motion.span>
											)}
											{tab.name}
										</span>

										{(selected || recentlySelected) && (
											<span
												className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
													recentlySelected
														? 'bg-purple-300 text-purple-800 dark:bg-purple-800 dark:text-purple-200'
														: 'bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-300'
												}`}
											>
												{Math.round(getSelectionScore(tab.router_path) * 100)}%
											</span>
										)}
									</TabsTrigger>
								</motion.div>
							);
						})}
					</TabsList>

					{view.components.map((tab, index) => (
						<TabsContent key={index} value={String(index)}>
							<ViewRenderer
								window_id={window_id}
								view={tab}
								isSelected={isSelected}
								getSelectionScore={getSelectionScore}
								isRecentlySelected={isRecentlySelected}
								osClient={osClient}
							/>
						</TabsContent>
					))}
				</Tabs>
			</CardContent>
		</Card>
	);
};
