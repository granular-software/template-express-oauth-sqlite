import React from 'react';
import { ViewComponent } from './view-types';
import { DesktopView } from './views/DesktopView';
import { AppRootView } from './views/AppRootView';
import { AppTabView } from './views/AppTabView';
import { ButtonView } from './views/ButtonView';
import { TextInputView } from './views/TextInputView';
import { InstancesListView } from './views/InstancesListView';
import { LinkView } from './views/LinkView';
import { ModelDisplayView } from './views/ModelDisplayView';
import { SelectedOption } from './view-types';
import { SerializedView } from '@joshu/os-types';
import { UseOsClient } from '@/hooks/useOsClient';

interface ViewRendererProps {
	view: SerializedView;
	isSelected?: (path: string) => boolean;
	getSelectionScore?: (path: string) => number;
	isRecentlySelected?: (path: string) => boolean;

	osClient: UseOsClient;
	window_id: string;
}

export const ViewRenderer: React.FC<ViewRendererProps> = ({ 
	view, 
	isSelected = () => false,
	getSelectionScore = () => 0,
	isRecentlySelected = () => false,
	osClient,
	window_id
}) => {
	if (!view) return null;

	switch (view.type) {
		case 'desktop':
			return <DesktopView view={view} window_id={window_id} osClient={osClient} isSelected={isSelected} getSelectionScore={getSelectionScore} isRecentlySelected={isRecentlySelected} />;
		case 'app_root':
			return <AppRootView view={view} window_id={window_id} osClient={osClient} isSelected={isSelected} getSelectionScore={getSelectionScore} isRecentlySelected={isRecentlySelected} />;
		case 'app_tab':
			return <AppTabView view={view} window_id={window_id} osClient={osClient} isSelected={isSelected} getSelectionScore={getSelectionScore} isRecentlySelected={isRecentlySelected} />;
		case 'button':
			return <ButtonView view={view} window_id={window_id} osClient={osClient} isSelected={isSelected} getSelectionScore={getSelectionScore} isRecentlySelected={isRecentlySelected} />;
		case 'text_input':
			return <TextInputView view={view} window_id={window_id} osClient={osClient} isSelected={isSelected} getSelectionScore={getSelectionScore} isRecentlySelected={isRecentlySelected} />;
		case 'instances_list':
			return <InstancesListView view={view} window_id={window_id} osClient={osClient} isSelected={isSelected} getSelectionScore={getSelectionScore} isRecentlySelected={isRecentlySelected} />;
		case 'link':
			return <LinkView view={view} window_id={window_id} osClient={osClient} isSelected={isSelected} getSelectionScore={getSelectionScore} isRecentlySelected={isRecentlySelected} />;
		case 'model_display':
			return <ModelDisplayView view={view} window_id={window_id} osClient={osClient} isSelected={isSelected} getSelectionScore={getSelectionScore} isRecentlySelected={isRecentlySelected} />;
		default:
			return <div>Unknown view type: {view.type}</div>;
	}
};
