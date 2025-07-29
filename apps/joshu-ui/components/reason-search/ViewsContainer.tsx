import React from 'react';
import { ViewComponent, SelectedOption, SelectedOptionsUpdate } from './view-types';
import { ViewRenderer } from './ViewRenderer';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Search, ArrowRight } from 'lucide-react';
import { SerializedView } from '@joshu/os-types';
import { UseOsClient } from '@/hooks/useOsClient';

interface ViewsContainerProps {
	views: SerializedView[];
	selectedOptions?: SelectedOption[];
	isSelected: (path: string) => boolean;
	getSelectionScore: (path: string) => number;
	isRecentlySelected?: (path: string, isAction?: boolean) => boolean;

	osClient: UseOsClient;
	window_id: string;
}

export const ViewsContainer: React.FC<ViewsContainerProps> = ({
	views,
	selectedOptions = [],
	getSelectionScore,
	isSelected,
	osClient,
	window_id,
	isRecentlySelected,
}) => {
	if (!views || views.length === 0) {
		return (
			<Card className="shadow-sm border border-neutral-200 dark:border-neutral-800">
				<CardContent className="p-4 flex items-center justify-center">
					<div className="text-center py-6">
						<div className="mx-auto h-12 w-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
							<Search className="h-6 w-6 text-neutral-400" />
						</div>
						<h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">No views available</h3>
						<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Waiting for views to be loaded...</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
				<Layers className="h-4 w-4" />
				<span>Available Views</span>
				{selectedOptions && selectedOptions.length > 0 && (
					<span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
						{selectedOptions.length} selected
					</span>
				)}
			</div>

			{views.map((view, index) => (
				<ViewRenderer
					key={`view-${index}-${view.type}-${view.name}`}
					view={view}
					isRecentlySelected={isRecentlySelected}
					osClient={osClient}
					window_id={window_id}
					getSelectionScore={getSelectionScore}
					isSelected={isSelected}
				/>
			))}
		</div>
	);
};
