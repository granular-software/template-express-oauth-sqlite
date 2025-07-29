import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { InstancesListViewComponent } from '../view-types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, List, Plus, Grid, Table as TableIcon, File, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SerializedView } from '@joshu/os-types';
import { Toggle } from '@/components/ui/toggle';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { UseOsClient } from '@/hooks/useOsClient';
interface InstancesListViewProps {
	view: SerializedView;
	isSelected: (path: string) => boolean;
	getSelectionScore: (path: string) => number;
	isRecentlySelected?: (path: string) => boolean;
	osClient: UseOsClient;
	window_id: string;
}

export const InstancesListView: React.FC<InstancesListViewProps> = ({
	view,
	isSelected,
	getSelectionScore,
	isRecentlySelected = () => false,
	osClient,
	window_id,
}) => {
	const [displayMode, setDisplayMode] = useState<'grid' | 'table'>('grid');
	const selected = isSelected(view.router_path);
	const recentlySelected = isRecentlySelected(view.router_path);
	const score = getSelectionScore(view.router_path);
	const scorePercentage = Math.round(score * 100);

	return (
		<motion.div
			animate={
				recentlySelected
					? {
							scale: [1, 1.02, 1],
							boxShadow: ['0 0 0 rgba(245, 158, 11, 0)', '0 0 15px rgba(245, 158, 11, 0.5)', '0 0 0 rgba(245, 158, 11, 0)'],
						}
					: {}
			}
			transition={{ duration: 1.5 }}
		>
			<Card
				className={`
				shadow-sm border overflow-hidden transition-colors
				${
					recentlySelected
						? 'border-amber-400 dark:border-amber-600 bg-amber-50/80 dark:bg-amber-900/30'
						: selected
							? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
							: 'border-neutral-200 dark:border-neutral-800'
				}
			`}
			>
				<CardContent className="p-4">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<div
								className={`
								h-8 w-8 rounded-full flex items-center justify-center
								${recentlySelected ? 'bg-amber-200 dark:bg-amber-800/70 animate-pulse' : selected ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-neutral-100 dark:bg-neutral-800'}
							`}
							>
								<File
									className={`h-4 w-4 ${
										recentlySelected
											? 'text-amber-700 dark:text-amber-300'
											: selected
												? 'text-amber-600 dark:text-amber-400'
												: 'text-neutral-500'
									}`}
								/>
							</div>

							<div>
								<div className={`font-medium text-sm ${recentlySelected ? 'text-amber-700 dark:text-amber-300' : ''}`}>{view.name}</div>
								<div className="text-xs text-neutral-500 dark:text-neutral-400">{view.description}</div>
							</div>

							{selected && (
								<Badge
									className={`
									text-white flex items-center gap-1.5 ml-2
									${recentlySelected ? 'bg-amber-600 dark:bg-amber-700 animate-pulse' : 'bg-amber-500 dark:bg-amber-600'}
								`}
								>
									<Check className="h-3 w-3" />
									<span>{scorePercentage}%</span>
								</Badge>
							)}
						</div>

						<div className="flex items-center gap-2">
							<Button
								size="sm"
								variant="outline"
								className="text-xs flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-300 dark:border-green-800"
								onClick={() => osClient.start_action(window_id, view.router_path, '/create')}
							>
								<PlusCircle className="h-3.5 w-3.5" />
								Create
							</Button>

							{displayMode === 'table' && (
								<button
									onClick={() => setDisplayMode('grid')}
									className={`p-1.5 rounded-md ${'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
								>
									<Grid className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
								</button>
							)}
							{displayMode === 'grid' && (
								<button
									onClick={() => setDisplayMode('table')}
									className={`p-1.5 rounded-md ${'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
								>
									<TableIcon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
								</button>
							)}
						</div>
					</div>

					<div
						className={`
						border rounded-md p-3 bg-neutral-50 dark:bg-neutral-800/50
						${
							recentlySelected
								? 'border-amber-400 dark:border-amber-600'
								: selected
									? 'border-amber-300 dark:border-amber-700'
									: 'border-neutral-200 dark:border-neutral-700'
						}
					`}
					>
						{view.clickable_links && view.clickable_links.length > 0 ? (
							<>
								{displayMode === 'grid' ? (
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
										{view.clickable_links.map((link, index) => {
											const linkSelected = isSelected(link.router_path);
											const linkRecentlySelected = isRecentlySelected(link.router_path);

											return (
												<motion.div
													key={index}
													animate={
														linkRecentlySelected
															? {
																	scale: [1, 1.05, 1],
																}
															: {}
													}
													transition={{ duration: 1 }}
													className={`
														flex flex-col items-center p-3 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700/50 
														transition-colors cursor-pointer
														${linkRecentlySelected ? 'bg-amber-100/70 dark:bg-amber-800/40' : linkSelected ? 'bg-amber-50 dark:bg-amber-900/20' : ''}
													`}
												>
													<div
														onClick={() => osClient.click_link(window_id, link.router_path)}
														className={`
														h-12 w-12 rounded-md flex items-center justify-center mb-2
														${
															linkRecentlySelected
																? 'bg-amber-200 dark:bg-amber-800/70 animate-pulse'
																: linkSelected
																	? 'bg-amber-100 dark:bg-amber-900/30'
																	: 'bg-neutral-200 dark:bg-neutral-700'
														}
													`}
													>
														<File
															className={`h-6 w-6 ${
																linkRecentlySelected
																	? 'text-amber-700 dark:text-amber-300'
																	: linkSelected
																		? 'text-amber-600 dark:text-amber-400'
																		: 'text-neutral-500'
															}`}
														/>
													</div>
													<span
														className={`text-xs font-medium text-center truncate w-full ${
															linkRecentlySelected ? 'text-amber-700 dark:text-amber-300' : ''
														}`}
													>
														{link.name}
													</span>
												</motion.div>
											);
										})}
									</div>
								) : (
									<Table>
										<TableHeader>
											<TableRow className="hover:bg-transparent">
												<TableHead className="w-12"></TableHead>
												<TableHead>Name</TableHead>
												<TableHead>Path</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{view.clickable_links.map((link, index) => {
												const linkSelected = isSelected(link.router_path);
												const linkRecentlySelected = isRecentlySelected(link.router_path);

												return (
													<TableRow
														key={index}
														onClick={() => osClient.click_link(window_id, link.router_path)}
														className={`
															cursor-pointer
															${linkRecentlySelected ? 'bg-amber-100/70 dark:bg-amber-800/40' : linkSelected ? 'bg-amber-50 dark:bg-amber-900/20' : ''}
															${linkSelected ? 'hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/50'}
														`}
													>
														<TableCell className="p-2">
															<div
																className={`
																h-8 w-8 rounded-md flex items-center justify-center
																${selected ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-neutral-200 dark:bg-neutral-700'}
															`}
															>
																<File
																	className={`h-4 w-4 ${selected ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-500'}`}
																/>
															</div>
														</TableCell>
														<TableCell className="font-medium">{link.name}</TableCell>
														<TableCell className="text-neutral-500 dark:text-neutral-400 text-sm truncate max-w-[200px]">
															{link.router_path || '-'}
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								)}
							</>
						) : (
							<>
								<div className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-2">No items in list</div>

								<div className="mt-2 flex justify-center">
									<Button
										size="sm"
										variant="outline"
										className={`
											text-xs
											${selected ? 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20' : ''}
										`}
									>
										<Plus className="h-3.5 w-3.5 mr-1" />
										Add New
									</Button>
								</div>
							</>
						)}
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
};
