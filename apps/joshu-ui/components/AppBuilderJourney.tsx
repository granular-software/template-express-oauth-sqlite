'use client';
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Check,
	ChevronDown,
	Code,
	Palette,
	Database,
	GitBranch,
	Zap,
	Navigation,
	Layout,
	FileText,
	ListChecks,
	FileCode,
	Moon,
	Sun,
	Link2,
	Hash,
	AlignJustify,
	NetworkIcon,
	CircleDotDashed,
	Plus,
	X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

import {
	ColorPalette,

	IterativeAppBuilderState,
	NavigationDefinition,
	PageDefinition,
	StateDefinition,
	TransitionDefinition,
	ActionDefinition,
	EntityStateMachine,
	AstNodeDefinition,
	ViewDefinition,
	Agent,
	AgentFieldDefinition,
	AgentViewComponent,
} from '@joshu/os-types';

interface AppBuilderJourneyProps {
	agents: Agent[] | null | undefined;
}

interface EntityDefinition {
	name: string;
	label?: string;
	description: string;
	emoji: string;
	fields: AgentFieldDefinition[];
	isSystemEntity?: boolean;
}

const ProgressStep = ({
	step,
	title,
	isActive,
	isComplete,
	icon: Icon,
}: {
	step: number;
	title: string;
	isActive: boolean;
	isComplete: boolean;
	icon: React.ElementType;
}) => {
	return (
		<div
			className={cn(
				'flex items-center gap-2 px-3 py-2 rounded-md transition-all',
				isActive && 'bg-primary/10',
				isComplete ? 'text-primary' : 'text-muted-foreground',
			)}
		>
			<div
				className={cn(
					'flex h-8 w-8 items-center justify-center rounded-full border',
					isComplete ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground',
				)}
			>
				{isComplete ? <Check className="h-4 w-4" /> : <span>{step}</span>}
			</div>
			<div className="flex items-center gap-2">
				<Icon className="h-4 w-4" />
				<span className="font-medium">{title}</span>
			</div>
		</div>
	);
};

const MarkdownCheckbox = ({ checked }: { checked: boolean }) => (
	<span
		className={cn(
			'inline-flex h-4 w-4 items-center justify-center rounded border text-xs mr-2',
			checked ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground',
		)}
	>
		{checked && <Check className="h-3 w-3" />}
	</span>
);

const ColorPaletteDisplay = ({ colorPalette, isDarkMode = false }: { colorPalette: ColorPalette; isDarkMode?: boolean }) => {
	if (!colorPalette) return null;

	const { primary, secondary, accent, entity_colors = [] } = colorPalette;

	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Primary Colors</h4>
				<div className="flex space-x-3">
					<div className="flex flex-col items-center">
						<div
							className="h-12 w-12 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-800"
							style={{ backgroundColor: primary.base }}
						/>
						<span className="text-xs mt-1 font-mono">{primary.base}</span>
						<span className="text-[10px] text-neutral-500">Base</span>
					</div>
					<div className="flex flex-col items-center">
						<div
							className="h-12 w-12 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-800"
							style={{ backgroundColor: primary.hover }}
						/>
						<span className="text-xs mt-1 font-mono">{primary.hover}</span>
						<span className="text-[10px] text-neutral-500">Hover</span>
					</div>
					<div className="flex flex-col items-center">
						<div
							className="h-12 w-12 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-800 flex items-center justify-center"
							style={{ backgroundColor: primary.base }}
						>
							<span style={{ color: primary.text }}>T</span>
						</div>
						<span className="text-xs mt-1 font-mono">{primary.text}</span>
						<span className="text-[10px] text-neutral-500">Text</span>
					</div>
				</div>
			</div>

			<div className="space-y-3">
				<h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Secondary Colors</h4>
				<div className="flex space-x-3">
					<div className="flex flex-col items-center">
						<div
							className="h-12 w-12 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-800"
							style={{ backgroundColor: secondary.base }}
						/>
						<span className="text-xs mt-1 font-mono">{secondary.base}</span>
						<span className="text-[10px] text-neutral-500">Base</span>
					</div>
					<div className="flex flex-col items-center">
						<div
							className="h-12 w-12 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-800"
							style={{ backgroundColor: secondary.hover }}
						/>
						<span className="text-xs mt-1 font-mono">{secondary.hover}</span>
						<span className="text-[10px] text-neutral-500">Hover</span>
					</div>
					<div className="flex flex-col items-center">
						<div
							className="h-12 w-12 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-800 flex items-center justify-center"
							style={{ backgroundColor: secondary.base }}
						>
							<span style={{ color: secondary.text }}>T</span>
						</div>
						<span className="text-xs mt-1 font-mono">{secondary.text}</span>
						<span className="text-[10px] text-neutral-500">Text</span>
					</div>
				</div>
			</div>

			<div className="space-y-3">
				<h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Accent Colors</h4>
				<div className="flex space-x-3">
					<div className="flex flex-col items-center">
						<div
							className="h-12 w-12 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-800"
							style={{ backgroundColor: accent.base }}
						/>
						<span className="text-xs mt-1 font-mono">{accent.base}</span>
						<span className="text-[10px] text-neutral-500">Base</span>
					</div>
					<div className="flex flex-col items-center">
						<div
							className="h-12 w-12 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-800"
							style={{ backgroundColor: accent.hover }}
						/>
						<span className="text-xs mt-1 font-mono">{accent.hover}</span>
						<span className="text-[10px] text-neutral-500">Hover</span>
					</div>
					<div className="flex flex-col items-center">
						<div
							className="h-12 w-12 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-800 flex items-center justify-center"
							style={{ backgroundColor: accent.base }}
						>
							<span style={{ color: accent.text }}>T</span>
						</div>
						<span className="text-xs mt-1 font-mono">{accent.text}</span>
						<span className="text-[10px] text-neutral-500">Text</span>
					</div>
				</div>
			</div>

			{entity_colors.length > 0 && (
				<div className="space-y-3">
					<h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Entity Colors</h4>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
						{entity_colors.map((color: ColorPalette['entity_colors'][0], index: number) => (
							<div
								key={index}
								className="space-y-2 bg-white dark:bg-neutral-900 p-3 rounded-md border border-neutral-200 dark:border-neutral-800"
							>
								<div className="flex space-x-2">
									<div
										className="h-10 w-10 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-800"
										style={{
											backgroundColor: isDarkMode ? color.darkBackground : color.background,
											borderColor: isDarkMode ? color.darkBorder : color.border,
										}}
									/>
									<div className="flex flex-col justify-center">
										<span className="text-sm font-medium" style={{ color: isDarkMode ? color.darkText : color.text }}>
											Entity {index + 1}
										</span>
										<span className="text-[10px] text-neutral-500">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
									</div>
								</div>
								<div className="flex flex-wrap gap-2 text-xs">
									<span className="font-mono px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">
										{isDarkMode ? color.darkBackground : color.background}
									</span>
									<span className="font-mono px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">
										{isDarkMode ? color.darkText : color.text}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

const UIThemeSection = ({ state }: { state: IterativeAppBuilderState }) => {
	const [isDarkMode, setIsDarkMode] = useState(false);
	const colorPalette = state.colorPalette;

	const toggleColorMode = () => {
		setIsDarkMode(!isDarkMode);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">UI Theme</h3>
				<Button variant="outline" size="sm" onClick={toggleColorMode} className="flex items-center gap-2">
					{isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
					<span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
				</Button>
			</div>

			{colorPalette ? (
				<div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
					<div className="mb-6">
						<h3 className="text-base font-semibold mb-2">Color Palette</h3>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">A tailored color palette for your application&apos;s visual identity.</p>
					</div>

					<ColorPaletteDisplay colorPalette={colorPalette} isDarkMode={isDarkMode} />

					<div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
						<h4 className="text-sm font-medium mb-2">Preview</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Button examples */}
							<div className="space-y-2 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
								<h5 className="text-xs uppercase text-neutral-500 dark:text-neutral-400 font-medium">Buttons</h5>
								<div className="flex flex-wrap gap-2">
									<button
										style={{
											backgroundColor: colorPalette.primary.base,
											color: colorPalette.primary.text,
											borderRadius: '0.375rem',
											padding: '0.5rem 1rem',
											fontSize: '0.875rem',
											fontWeight: 500,
											border: 'none',
											boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
										}}
									>
										Primary
									</button>
									<button
										style={{
											backgroundColor: colorPalette.secondary.base,
											color: colorPalette.secondary.text,
											borderRadius: '0.375rem',
											padding: '0.5rem 1rem',
											fontSize: '0.875rem',
											fontWeight: 500,
											border: 'none',
											boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
										}}
									>
										Secondary
									</button>
									<button
										style={{
											backgroundColor: colorPalette.accent.base,
											color: colorPalette.accent.text,
											borderRadius: '0.375rem',
											padding: '0.5rem 1rem',
											fontSize: '0.875rem',
											fontWeight: 500,
											border: 'none',
											boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
										}}
									>
										Accent
									</button>
								</div>
							</div>

							{/* Entity tag examples */}
							<div className="space-y-2 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
								<h5 className="text-xs uppercase text-neutral-500 dark:text-neutral-400 font-medium">Entity Tags</h5>
								<div className="flex flex-wrap gap-2">
									{colorPalette.entity_colors.slice(0, 4).map((color: any, index: number) => (
										<span
											key={index}
											style={{
												backgroundColor: isDarkMode ? color.darkBackground : color.background,
												color: isDarkMode ? color.darkText : color.text,
												borderRadius: '0.375rem',
												padding: '0.25rem 0.5rem',
												fontSize: '0.75rem',
												fontWeight: 500,
												border: `1px solid ${isDarkMode ? color.darkBorder : color.border}`,
											}}
										>
											Entity {index + 1}
										</span>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			) : (
				<div className="flex items-center justify-center p-12 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900/50">
					<div className="text-center">
						<Palette className="mx-auto h-10 w-10 text-neutral-400 mb-3" />
						<p className="text-sm text-neutral-500 dark:text-neutral-400">Color palette not generated yet.</p>
					</div>
				</div>
			)}
		</div>
	);
};

const CustomMarkdown = ({ children }: { children: string }) => {
	return (
        <ReactMarkdown
			components={{
				p: ({ node, ...props }) => <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4" {...props} />,
				h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-3" {...props} />,
				h2: ({ node, ...props }) => <h2 className="text-lg font-semibold mb-3" {...props} />,
				h3: ({ node, ...props }) => <h3 className="text-md font-semibold mb-2" {...props} />,
				ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
				ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
				li: ({ node, children, ...props }) => {
					const firstChild = (node?.children[0] as any)?.children?.[0];
					const isCheckbox = firstChild?.type === 'text' && firstChild?.value.startsWith('[ ]');
					const isCheckedBox = firstChild?.type === 'text' && firstChild?.value.startsWith('[x]');

					if (isCheckbox || isCheckedBox) {
						return (
                            <li className="flex items-start" {...props}>
                                <MarkdownCheckbox checked={isCheckedBox} />
                                <span>
									{isCheckbox ? children?.toString().replace(/^\[ \]\s*/, '') || '' : children?.toString().replace(/^\[x\]\s*/, '') || ''}
								</span>
                            </li>
                        );
					}
					return (
						<li className="text-sm" {...props}>
							{children}
						</li>
					);
				},
				code: ({ node, className, children, ...props }) => (
					<code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono text-sm" {...props}>
						{children}
					</code>
				),
				pre: ({ node, children, ...props }) => (
					<pre className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-md overflow-auto mb-4 font-mono text-sm" {...props}>
						{children}
					</pre>
				),
			}}
		>
            {children || ''}
        </ReactMarkdown>
    );
};

const ApplicationBriefSection = ({ state }: { state: IterativeAppBuilderState }) => {
	const [openSection, setOpenSection] = useState<string | null>('projectBrief');

	const projectBrief = state.projectBrief || 'Not generated yet';
	const requirements = state.requirements || [];
	const appDescription = state.appDescription || 'Not generated yet';

	const hasRequirements = requirements.length > 0;

	return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Application Brief</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Collapsible
					className="col-span-1 md:col-span-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden"
					open={openSection === 'projectBrief'}
					onOpenChange={() => setOpenSection(openSection === 'projectBrief' ? null : 'projectBrief')}
				>
					<CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left">
						<div className="flex items-center gap-2">
							<FileText className="h-5 w-5 text-blue-500" />
							<span className="font-medium">Project Brief</span>
						</div>
						<ChevronDown
							className={cn('h-4 w-4 transition-transform duration-200', openSection === 'projectBrief' ? 'transform rotate-180' : '')}
						/>
					</CollapsibleTrigger>
					<CollapsibleContent className="p-4 pt-0 border-t border-neutral-200 dark:border-neutral-800">
						<div className="prose prose-sm max-w-none dark:prose-invert">
							<CustomMarkdown>{projectBrief}</CustomMarkdown>
						</div>
					</CollapsibleContent>
				</Collapsible>

				<Collapsible
					className="col-span-1 md:col-span-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden"
					open={openSection === 'requirements'}
					onOpenChange={() => setOpenSection(openSection === 'requirements' ? null : 'requirements')}
				>
					<CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left">
						<div className="flex items-center gap-2">
							<ListChecks className="h-5 w-5 text-green-500" />
							<span className="font-medium">Requirements</span>
							{hasRequirements && (
								<Badge
									variant="outline"
									className="ml-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800"
								>
									{requirements.length} items
								</Badge>
							)}
						</div>
						<ChevronDown
							className={cn('h-4 w-4 transition-transform duration-200', openSection === 'requirements' ? 'transform rotate-180' : '')}
						/>
					</CollapsibleTrigger>
					<CollapsibleContent className="p-4 pt-0 border-t border-neutral-200 dark:border-neutral-800">
						{hasRequirements ? (
							<ul className="space-y-1">
								{requirements.map((req: string, index: number) => (
									<li key={index} className="flex items-start">
										<MarkdownCheckbox checked={false} />
										<span className="text-sm">{req.replace(/^-\s*\[\s?\]\s*/, '')}</span>
									</li>
								))}
							</ul>
						) : (
							<p className="text-sm text-neutral-500 dark:text-neutral-400">No requirements specified yet.</p>
						)}
					</CollapsibleContent>
				</Collapsible>

				<Collapsible
					className="col-span-1 md:col-span-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden"
					open={openSection === 'appDescription'}
					onOpenChange={() => setOpenSection(openSection === 'appDescription' ? null : 'appDescription')}
				>
					<CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left">
						<div className="flex items-center gap-2">
							<FileCode className="h-5 w-5 text-purple-500" />
							<span className="font-medium">Application Description</span>
						</div>
						<ChevronDown
							className={cn('h-4 w-4 transition-transform duration-200', openSection === 'appDescription' ? 'transform rotate-180' : '')}
						/>
					</CollapsibleTrigger>
					<CollapsibleContent className="p-4 pt-0 border-t border-neutral-200 dark:border-neutral-800">
						<div className="prose prose-sm max-w-none dark:prose-invert">
							<CustomMarkdown>{appDescription}</CustomMarkdown>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</div>
        </div>
    );
};

const DataModelSection = ({ state }: { state: IterativeAppBuilderState }) => {
	const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
	const entities = state.entities || [];
	const importedEntities = state.importedEntities || [];
	const entityColorMap = state.entity_color_map || {};

	const allEntities = [...entities];

	useEffect(() => {
		if (allEntities.length > 0 && !selectedEntity) {
			setSelectedEntity(allEntities[0].name);
		}
	}, [allEntities, selectedEntity]);

	const systemEntities = allEntities.filter((e) => e.isSystemEntity);
	const domainEntities = allEntities.filter((e) => !e.isSystemEntity);

	const getEntityById = (entityName: string): EntityDefinition | undefined => {
		return allEntities.find((e: EntityDefinition) => e.name === entityName);
	};

	const selectedEntityData = selectedEntity ? getEntityById(selectedEntity) : null;

	const getEntityColor = (entityName: string) => {
		if (entityColorMap && entityColorMap[entityName]) {
			return entityColorMap[entityName];
		}
		return null;
	};

	const getColorStyle = (entityName: string) => {
		const color = getEntityColor(entityName);
		if (!color) return {};

		return {
			backgroundColor: color.background,
			color: color.text,
			borderColor: color.border,
		};
	};

	const getFieldTypeLabel = (field: AgentFieldDefinition) => {
		if (field.is_relation) {
			return field.is_list ? `${field.type}[]` : field.type;
		}
		return field.type;
	};

	const getFieldTypeIcon = (field: AgentFieldDefinition) => {
		if (field.is_relation) {
			return field.is_list ? <NetworkIcon className="h-4 w-4" /> : <Link2 className="h-4 w-4" />;
		}

		switch (field.type) {
			case 'string':
				return <AlignJustify className="h-4 w-4" />;
			case 'number':
				return <Hash className="h-4 w-4" />;
			case 'boolean':
				return <Check className="h-4 w-4" />;
			case 'date':
				return <FileText className="h-4 w-4" />;
			default:
				return <AlignJustify className="h-4 w-4" />;
		}
	};

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold">Data Model</h3>

			{allEntities.length > 0 ? (
				<div className="space-y-6">
					{/* Horizontal scrollable entity selector */}
					{domainEntities.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Domain Entities</h4>
							<div className="flex overflow-x-auto pb-2 -mx-2 px-2 gap-2 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
								{domainEntities.map((entity) => (
									<button
										key={entity.name}
										className={cn(
											'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-md',
											selectedEntity === entity.name
												? 'bg-primary/10 text-primary border border-primary/20'
												: 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800',
										)}
										onClick={() => setSelectedEntity(entity.name)}
									>
										<span className="text-lg">{entity.emoji}</span>
										<span className="font-medium whitespace-nowrap">{entity.label || entity.name}</span>
									</button>
								))}
							</div>
						</div>
					)}

					{systemEntities.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">System Entities</h4>
							<div className="flex overflow-x-auto pb-2 -mx-2 px-2 gap-2 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
								{systemEntities.map((entity) => (
									<button
										key={entity.name}
										className={cn(
											'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-md text-xs',
											selectedEntity === entity.name
												? 'bg-primary/10 text-primary border border-primary/20'
												: 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800',
										)}
										onClick={() => setSelectedEntity(entity.name)}
									>
										<span className="text-lg">{entity.emoji}</span>
										<span className="font-medium whitespace-nowrap">{entity.label || entity.name}</span>
									</button>
								))}
							</div>
						</div>
					)}

					{/* Entity details */}
					<div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
						{selectedEntityData ? (
							<>
								<div className="p-6 border-b border-neutral-200 dark:border-neutral-800" style={getColorStyle(selectedEntity || '')}>
									<div className="flex items-center gap-3">
										<span className="text-2xl">{selectedEntityData.emoji}</span>
										<div>
											<h3 className="text-xl font-bold">{selectedEntityData.label || selectedEntityData.name}</h3>
											<p className="text-sm opacity-80">{selectedEntityData.description}</p>
										</div>
									</div>
									{selectedEntityData.isSystemEntity && (
										<Badge className="mt-2 bg-neutral-100 text-neutral-800 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
											System Entity
										</Badge>
									)}
								</div>

								<div className="p-4 sm:p-6">
									<h4 className="text-base font-semibold mb-4">Fields</h4>

									{selectedEntityData && selectedEntityData.fields && selectedEntityData.fields.length > 0 ? (
										<div className="border border-neutral-200 dark:border-neutral-800 rounded-md overflow-x-auto">
											<table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
												<thead className="bg-neutral-50 dark:bg-neutral-800">
													<tr>
														<th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
															Name
														</th>
														<th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
															Type
														</th>
														<th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
															Required
														</th>
														<th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
															Description
														</th>
													</tr>
												</thead>
												<tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800">
													{selectedEntityData.fields.map((field, index) => (
														<tr key={index} className={index % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-800/20' : ''}>
															<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-800 dark:text-neutral-200">
																{field.label || field.name}
															</td>
															<td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">
																<div className="flex items-center gap-1">
																	{getFieldTypeIcon(field)}
																	<span
																		className={cn(
																			'px-2 py-1 rounded text-xs font-mono',
																			field.is_relation
																				? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
																				: 'bg-neutral-100 dark:bg-neutral-800'
																		)}
																	>
																		{getFieldTypeLabel(field)}
																	</span>
																</div>
															</td>
															<td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">
																{field.required ? (
																	<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
																		Required
																	</Badge>
																) : (
																	<Badge variant="outline" className="text-neutral-500 dark:text-neutral-400">
																		Optional
																	</Badge>
																)}
															</td>
															<td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300">
																{field.description || '-'}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									) : (
										<div className="text-center p-8 text-neutral-500 dark:text-neutral-400 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg">
											No fields defined for this entity.
										</div>
									)}
								</div>
							</>
						) : (
							<div className="flex items-center justify-center p-12">
								<div className="text-center">
									<Database className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-700 mb-4" />
									<h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-2">No Entity Selected</h3>
									<p className="text-neutral-500 dark:text-neutral-400">Select an entity from the list to see its details.</p>
								</div>
							</div>
						)}
					</div>
				</div>
			) : (
				<div className="flex items-center justify-center p-12 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900/50">
					<div className="text-center">
						<Database className="mx-auto h-10 w-10 text-neutral-400 mb-3" />
						<p className="text-sm text-neutral-500 dark:text-neutral-400">No entities defined yet.</p>
					</div>
				</div>
			)}
		</div>
	);
};

// State Machine Section for App Builder Journey
const StateMachineSection = ({ state }: { state: IterativeAppBuilderState }) => {
	const [selectedStateMachine, setSelectedStateMachine] = useState<number | null>(null);
	const stateMachines = state.stateMachines || [];
	const entities = state.entities || [];

	// If no state machine is selected, select the first one if available
	useEffect(() => {
		if (stateMachines.length > 0 && selectedStateMachine === null) {
			setSelectedStateMachine(0);
		}
	}, [stateMachines, selectedStateMachine]);

	// Helper function to get entity name based on entity ID
	const getEntityName = (entityName: string): string => {
		const entity = entities.find((e: EntityDefinition) => e.name === entityName);
		return entity ? entity.label || entity.name : entityName;
	};

	// Get the currently selected state machine
	const selectedMachine = selectedStateMachine !== null ? stateMachines[selectedStateMachine] : null;

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold">State Machines</h3>

			{stateMachines.length > 0 ? (
				<div className="space-y-6">
					{/* Horizontal scrollable state machine selector */}
					<div className="space-y-2">
						<h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Entities with State Machines</h4>
						<div className="flex overflow-x-auto pb-2 -mx-2 px-2 gap-2 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
							{stateMachines.map((machine: EntityStateMachine, index: number) => (
								<button
									key={index}
									className={cn(
										'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-md',
										selectedStateMachine === index
											? 'bg-primary/10 text-primary border border-primary/20'
											: 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800',
									)}
									onClick={() => setSelectedStateMachine(index)}
								>
									<GitBranch className="h-5 w-5" />
									<span className="font-medium whitespace-nowrap">{getEntityName(machine.entityName)}</span>
								</button>
							))}
						</div>
					</div>

					{/* State machine details */}
					<div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
						{selectedMachine ? (
							<>
								{/* StateMachine header */}
								<div className="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
									<div>
										<h3 className="text-xl font-bold flex items-center gap-2">
											<GitBranch className="h-5 w-5 text-purple-600 dark:text-purple-400" />
											{getEntityName(selectedMachine.entityName)} State Machine
										</h3>
										<p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
											Lifecycle states and transitions for {getEntityName(selectedMachine.entityName)} entity
										</p>
									</div>
								</div>

								{/* StateMachine visualization */}
								<div className="p-4 sm:p-6">
									<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
										{/* States */}
										<div>
											<h4 className="text-base font-semibold mb-4 flex items-center gap-2">
												<CircleDotDashed className="h-4 w-4 text-purple-600 dark:text-purple-400" />
												States
											</h4>

											<div className="space-y-3">
												{selectedMachine.states.map((state: StateDefinition, index: number) => (
													<div
														key={index}
														className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md p-4 shadow-sm"
													>
														<div className="flex justify-between flex-wrap gap-2">
															<h5 className="font-medium text-neutral-800 dark:text-neutral-200">{state.label || state.name}</h5>
															<div className="flex gap-2">
																{state.isInitial && (
																	<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
																		Initial
																	</Badge>
																)}
																{state.isFinal && (
																	<Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
																		Final
																	</Badge>
																)}
															</div>
														</div>
														{state.description && (
															<p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">{state.description}</p>
														)}
													</div>
												))}
											</div>
										</div>

										{/* Transitions */}
										<div>
											<h4 className="text-base font-semibold mb-4 flex items-center gap-2 mt-6 md:mt-0">
												<Zap className="h-4 w-4 text-amber-500 dark:text-amber-400" />
												Transitions
											</h4>

											<div className="space-y-3">
												{selectedMachine.transitions.map((transition: TransitionDefinition, index: number) => (
													<div
														key={index}
														className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md p-4 shadow-sm"
													>
														<div className="flex justify-between flex-wrap gap-2">
															<h5 className="font-medium text-neutral-800 dark:text-neutral-200">{transition.name}</h5>
														</div>
														<div className="flex items-center gap-2 mt-2 text-sm flex-wrap">
															<Badge variant="outline" className="bg-neutral-100 dark:bg-neutral-900">
																{transition.from}
															</Badge>
															<svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M14 5l7 7m0 0l-7 7m7-7H3"
																/>
															</svg>
															<Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
																{transition.to}
															</Badge>
														</div>
														{transition.description && (
															<p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">{transition.description}</p>
														)}
														{transition.guardCondition && (
															<div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/20 rounded text-sm text-amber-700 dark:text-amber-300">
																<span className="font-medium">Guard: </span>
																{transition.guardCondition}
															</div>
														)}
													</div>
												))}
											</div>
										</div>
									</div>
								</div>
							</>
						) : (
							<div className="flex items-center justify-center p-12">
								<div className="text-center">
									<GitBranch className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-700 mb-4" />
									<h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-2">No State Machine Selected</h3>
									<p className="text-neutral-500 dark:text-neutral-400">Select a state machine from the list to see its details.</p>
								</div>
							</div>
						)}
					</div>
				</div>
			) : (
				<div className="flex items-center justify-center p-12 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900/50">
					<div className="text-center">
						<GitBranch className="mx-auto h-10 w-10 text-neutral-400 mb-3" />
						<p className="text-sm text-neutral-500 dark:text-neutral-400">No state machines defined yet.</p>
					</div>
				</div>
			)}
		</div>
	);
};

// Actions Section for App Builder Journey
const ActionsSection = ({ state }: { state: IterativeAppBuilderState }) => {
	const [actionTypeFilter, setActionTypeFilter] = useState<string | null>(null);
	const [entityFilter, setEntityFilter] = useState<string | null>(null);

	const actions = state.actions || [];
	const entities = state.entities || [];

	// Group actions by entity and type
	const actionTypes = ['create', 'read', 'update', 'delete', 'reach_state', 'on_state_change'];

	// Get unique entity names from actions
	const entityNames = Array.from(new Set(actions.map((action: ActionDefinition) => action.entityName)));

	// Helper function to get entity name by ID
	const getEntityName = (entityName: string): string => {
		const entity = entities.find((e: EntityDefinition) => e.name === entityName);
		return entity ? entity.label || entity.name : entityName;
	};

	// Filter actions based on selected filters
	const filteredActions = actions.filter((action: ActionDefinition) => {
		if (actionTypeFilter && action.type !== actionTypeFilter) return false;
		if (entityFilter && action.entityName !== entityFilter) return false;
		return true;
	});

	// Group actions by type
	const actionsByType: Record<string, ActionDefinition[]> = {};
	actionTypes.forEach((type) => {
		actionsByType[type] = filteredActions.filter((action: ActionDefinition) => action.type === type);
	});

	// Get appropriate icon for action type
	const getActionTypeIcon = (type: string) => {
		switch (type) {
			case 'create':
				return <Plus className="h-4 w-4 text-green-500" />;
			case 'read':
				return <FileText className="h-4 w-4 text-blue-500" />;
			case 'update':
				return <Check className="h-4 w-4 text-amber-500" />;
			case 'delete':
				return <X className="h-4 w-4 text-red-500" />;
			case 'reach_state':
				return <GitBranch className="h-4 w-4 text-purple-500" />;
			case 'on_state_change':
				return <Zap className="h-4 w-4 text-indigo-500" />;
			default:
				return <FileText className="h-4 w-4" />;
		}
	};

	// Get color for action type badge
	const getActionTypeColor = (type: string) => {
		switch (type) {
			case 'create':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
			case 'read':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
			case 'update':
				return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
			case 'delete':
				return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
			case 'reach_state':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
			case 'on_state_change':
				return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
			default:
				return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200';
		}
	};

	// Format action type name for display
	const formatActionType = (type: string) => {
		switch (type) {
			case 'create':
				return 'Create';
			case 'read':
				return 'Read';
			case 'update':
				return 'Update';
			case 'delete':
				return 'Delete';
			case 'reach_state':
				return 'Reach State';
			case 'on_state_change':
				return 'On State Change';
			default:
				return type;
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<h3 className="text-lg font-semibold">Actions</h3>

				{/* Filters */}
				<div className="flex flex-wrap gap-2">
					<div className="flex-shrink-0">
						<select
							value={actionTypeFilter || ''}
							onChange={(e) => setActionTypeFilter(e.target.value || null)}
							className="h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:ring-1 focus:ring-primary"
						>
							<option value="">All action types</option>
							{actionTypes.map((type) => (
								<option key={type} value={type}>
									{formatActionType(type)}
								</option>
							))}
						</select>
					</div>

					<div className="flex-shrink-0">
						<select
							value={entityFilter || ''}
							onChange={(e) => setEntityFilter(e.target.value || null)}
							className="h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:ring-1 focus:ring-primary"
						>
							<option value="">All entities</option>
							{entityNames.map((name) => (
								<option key={name} value={name}>
									{getEntityName(name)}
								</option>
							))}
						</select>
					</div>

					{(actionTypeFilter || entityFilter) && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setActionTypeFilter(null);
								setEntityFilter(null);
							}}
							className="h-9 px-2"
						>
							<X className="h-4 w-4 mr-1" />
							Clear filters
						</Button>
					)}
				</div>
			</div>

			{filteredActions.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Display actions grouped by type */}
					{actionTypes.map(
						(type) =>
							actionsByType[type]?.length > 0 && (
								<div key={type} className="space-y-3">
									<h4 className="text-sm font-medium flex items-center gap-2">
										{getActionTypeIcon(type)}
										<span>{formatActionType(type)} Actions</span>
										<Badge className={getActionTypeColor(type)}>{actionsByType[type].length}</Badge>
									</h4>

									<div className="space-y-2">
										{actionsByType[type].map((action: ActionDefinition, index: number) => (
											<Collapsible key={index} className="border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden">
												<CollapsibleTrigger className="w-full flex justify-between items-center p-3 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-left">
													<div className="flex items-center gap-2">
														<span className="font-mono text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
															{action.name}
														</span>
														<span className="text-sm text-neutral-500 dark:text-neutral-400">
															({getEntityName(action.entityName)})
														</span>
													</div>
													<ChevronDown className="h-4 w-4 text-neutral-400 transition-transform ui-open:rotate-180" />
												</CollapsibleTrigger>
												<CollapsibleContent className="border-t border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50 dark:bg-neutral-900/50">
													<div className="space-y-2 text-sm">
														<p className="text-neutral-700 dark:text-neutral-300">
															{action.description || 'No description available'}
														</p>

														{type === 'reach_state' && action.targetState && (
															<div className="flex items-center gap-2 mt-2">
																<Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
																	Target State: {action.targetState}
																</Badge>
															</div>
														)}

														{type === 'on_state_change' && action.sourceState && (
															<div className="flex items-center gap-2 mt-2">
																<Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
																	Source State: {action.sourceState}
																</Badge>
															</div>
														)}

														{action.parameters && Array.isArray(action.parameters) && action.parameters.length > 0 && (
															<div className="mt-3">
																<h5 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-2">
																	Parameters
																</h5>
																<div className="border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden">
																	<table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
																		<thead className="bg-white dark:bg-neutral-900">
																			<tr>
																				<th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">
																					Name
																				</th>
																				<th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">
																					Type
																				</th>
																				<th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">
																					Required
																				</th>
																			</tr>
																		</thead>
																		<tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
																			{action.parameters.map((param, paramIndex) => (
																				<tr
																					key={paramIndex}
																					className={
																						paramIndex % 2 === 0
																							? 'bg-neutral-50 dark:bg-neutral-800/20'
																							: 'bg-white dark:bg-neutral-900'
																					}
																				>
																					<td className="px-3 py-2 text-xs font-medium">{param.name}</td>
																					<td className="px-3 py-2 text-xs">
																						<span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded font-mono text-xs">
																							{param.type}
																						</span>
																					</td>
																					<td className="px-3 py-2 text-xs">
																						{param.required ? (
																							<Badge
																								variant="outline"
																								className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800"
																							>
																								Required
																							</Badge>
																						) : (
																							<Badge
																								variant="outline"
																								className="text-neutral-500 dark:text-neutral-400"
																							>
																								Optional
																							</Badge>
																						)}
																					</td>
																				</tr>
																			))}
																		</tbody>
																	</table>
																</div>
															</div>
														)}
													</div>
												</CollapsibleContent>
											</Collapsible>
										))}
									</div>
								</div>
							),
					)}
				</div>
			) : (
				<div className="flex items-center justify-center p-12 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900/50">
					<div className="text-center">
						<Zap className="mx-auto h-10 w-10 text-neutral-400 mb-3" />
						<p className="text-sm text-neutral-500 dark:text-neutral-400">
							{actions.length === 0 ? 'No actions defined yet.' : 'No actions match the selected filters.'}
						</p>
						{actions.length > 0 && (entityFilter || actionTypeFilter) && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setActionTypeFilter(null);
									setEntityFilter(null);
								}}
								className="mt-3"
							>
								Clear filters
							</Button>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

// Navigation Section for App Builder Journey
const NavigationSection = ({ state }: { state: IterativeAppBuilderState }) => {
	const navigation: NavigationDefinition = state.navigation || { type: 'sidebar', items: [] };
	const pages = state.pages || [];

	// Organize pages by parent-child relationship
	const pagesByParent: Record<string, PageDefinition[]> = {};
	const topLevelPages: PageDefinition[] = [];

	pages.forEach((page: PageDefinition) => {
		if (page.parentPage) {
			if (!pagesByParent[page.parentPage]) {
				pagesByParent[page.parentPage] = [];
			}
			pagesByParent[page.parentPage].push(page);
		} else {
			topLevelPages.push(page);
		}
	});

	// Get icon for a page
	const getPageIcon = (page: PageDefinition) => {
		const navItem = navigation.items?.find((item) => item.pageName === page.name);
		return navItem?.icon || '📄';
	};

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold">Navigation & Routes</h3>

			{navigation && pages.length > 0 ? (
				<div className="space-y-6">
					{/* Pages */}
					<div className="space-y-4">
						<h4 className="text-base font-semibold flex items-center gap-2">
							<Navigation className="h-4 w-4 text-blue-500" />
							Pages
						</h4>

						<div className="border border-neutral-200 dark:border-neutral-800 rounded-lg">
							<div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
								<p className="text-sm text-neutral-600 dark:text-neutral-400">
									The application contains {pages.length} pages, organized into a hierarchy.
								</p>
							</div>

							<div className="p-4">
								<div className="space-y-3">
									{topLevelPages.map((page: PageDefinition, index: number) => (
										<div key={index} className="space-y-2">
											<div className="flex items-center gap-2 bg-white dark:bg-neutral-900 p-3 rounded-md border border-neutral-200 dark:border-neutral-800">
												<span className="text-lg">{getPageIcon(page)}</span>
												<div className="min-w-0 flex-1">
													<h5 className="font-medium text-sm">{page.title}</h5>
													<div className="flex items-center gap-1.5 flex-wrap">
														<span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate">{page.path}</span>
														{navigation.items?.some((item: any) => item.pageName === page.name) && (
															<Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[10px]">
																Nav Link
															</Badge>
														)}
													</div>
												</div>
											</div>

											{/* Child pages */}
											{pagesByParent[page.name] && (
												<div className="pl-4 sm:pl-6 border-l-2 border-neutral-200 dark:border-neutral-800 space-y-2">
													{pagesByParent[page.name].map((childPage: PageDefinition, childIndex: number) => (
														<div
															key={childIndex}
															className="flex items-center gap-2 bg-white dark:bg-neutral-900 p-3 rounded-md border border-neutral-200 dark:border-neutral-800"
														>
															<span className="text-lg">{getPageIcon(childPage)}</span>
															<div className="min-w-0 flex-1">
																<h5 className="font-medium text-sm">{childPage.title}</h5>
																<div className="flex items-center gap-1.5">
																	<span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate">
																		{childPage.path}
																	</span>
																</div>
															</div>
														</div>
													))}
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Navigation Structure */}
					<div className="space-y-4">
						<h4 className="text-base font-semibold flex items-center gap-2">
							<Layout className="h-4 w-4 text-indigo-500" />
							Navigation Structure
						</h4>

						<div className="border border-neutral-200 dark:border-neutral-800 rounded-lg">
							<div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
								<div className="flex justify-between items-center">
									<h5 className="font-medium">
										{navigation.type === 'sidebar'
											? 'Sidebar Navigation'
											: navigation.type === 'topbar'
												? 'Top Bar Navigation'
												: 'Navigation'}
									</h5>
									<Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
										{navigation.type || 'Unknown Type'}
									</Badge>
								</div>
							</div>

							{navigation.items && navigation.items.length > 0 ? (
								<div className="p-4">
									<div className="border border-neutral-200 dark:border-neutral-800 rounded-lg">
										{/* Navigation preview */}
										<div className="p-4 bg-white dark:bg-neutral-900">
											{navigation.type === 'sidebar' && (
												<div className="w-full max-w-[240px] mx-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm">
													<div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
														<div className="h-8 bg-neutral-100 dark:bg-neutral-800 rounded-md w-full"></div>
													</div>
													<div className="p-2 space-y-1">
														{navigation.items.map((item: NavigationDefinition['items'][0], i: number) => (
															<div
																key={i}
																className={cn(
																	'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
																	i === 0 ? 'bg-primary/10 text-primary' : 'text-neutral-700 dark:text-neutral-300',
																)}
															>
																<span>{item.icon || '📄'}</span>
																<span className="font-medium">
																	{pages.find((p: PageDefinition) => p.name === item.pageName)?.title || item.pageName}
																</span>
															</div>
														))}
													</div>
												</div>
											)}
										</div>

										{/* Navigation items list */}
										<div className="border-t border-neutral-200 dark:border-neutral-800 overflow-x-auto">
											<table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
												<thead className="bg-neutral-50 dark:bg-neutral-900/50">
													<tr>
														<th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">Icon</th>
														<th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">Page</th>
														<th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">Path</th>
													</tr>
												</thead>
												<tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800">
													{navigation.items.map((item: NavigationDefinition['items'][0], i: number) => {
														const page = pages.find((p: PageDefinition) => p.name === item.pageName);
														return (
															<tr key={i}>
																<td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-neutral-800 dark:text-neutral-200">
																	{item.icon || '📄'}
																</td>
																<td className="px-4 py-2 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">
																	{page?.title || item.pageName}
																</td>
																<td className="px-4 py-2 whitespace-nowrap text-xs font-mono text-neutral-500 dark:text-neutral-400">
																	{page?.path || '-'}
																</td>
															</tr>
														);
													})}
												</tbody>
											</table>
										</div>
									</div>
								</div>
							) : (
								<div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
									<p>No navigation items defined yet.</p>
								</div>
							)}
						</div>
					</div>
				</div>
			) : (
				<div className="flex items-center justify-center p-12 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900/50">
					<div className="text-center">
						<Navigation className="mx-auto h-10 w-10 text-neutral-400 mb-3" />
						<p className="text-sm text-neutral-500 dark:text-neutral-400">No navigation structure defined yet.</p>
					</div>
				</div>
			)}
		</div>
	);
};

// Views Section for App Builder Journey
const ViewsSection = ({ state }: { state: IterativeAppBuilderState }) => {
	const [selectedView, setSelectedView] = useState<number | null>(null);
	const views = state.views || [];
	const pages = state.pages || [];

	// If no view is selected, select the first one if available
	useEffect(() => {
		if (views.length > 0 && selectedView === null) {
			setSelectedView(0);
		}
	}, [views, selectedView]);

	// Get the currently selected view
	const selectedViewData = selectedView !== null ? views[selectedView] as ViewDefinition : null;

	// Get page title for a view
	const getPageTitle = (pageName: string) => {
		const page = pages.find((p: any) => p.name === pageName);
		return page ? page.title : pageName;
	};

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold">Views</h3>

			{views.length > 0 ? (
				<div className="space-y-6">
					{/* Horizontal scrollable view selector */}
					<div className="space-y-2">
						<h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">View Components</h4>
						<div className="flex overflow-x-auto pb-2 -mx-2 px-2 gap-2 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
							{views.map((view: ViewDefinition, index: number) => (
								<button
									key={index}
									className={cn(
										'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-md',
										selectedView === index
											? 'bg-primary/10 text-primary border border-primary/20'
											: 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800',
									)}
									onClick={() => setSelectedView(index)}
								>
									<Layout className="h-4 w-4" />
									<span className="font-medium whitespace-nowrap">{view.pageName && getPageTitle(view.pageName)}</span>
								</button>
							))}
						</div>
					</div>

					{/* View details */}
					<div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
						{selectedViewData ? (
							<>
								{/* View header */}
								<div className="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
									<div>
										<h3 className="text-xl font-bold">{selectedViewData.pageName && getPageTitle(selectedViewData.pageName)}</h3>
										<Badge className="mt-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
											{selectedViewData.path || 'No path'}
										</Badge>
										<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
											{typeof selectedViewData.layout === 'string' ? 
												selectedViewData.layout : 
												JSON.stringify(selectedViewData.layout)}
										</p>
									</div>
								</div>

								{/* View components */}
								<div className="p-4 sm:p-6">
									<h4 className="text-base font-semibold mb-4">Components</h4>

									{selectedViewData.components && selectedViewData.components.length > 0 ? (
										<div className="space-y-4">
											{selectedViewData.components.map((component: AgentViewComponent, index: number) => (
												<Collapsible
													key={index}
													className="border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden"
												>
													<CollapsibleTrigger className="w-full flex justify-between items-center p-3 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-left">
														<div className="flex items-center gap-2">
															<Badge variant="outline">{component.type}</Badge>
															<span className="font-medium text-sm">{component.name}</span>
														</div>
														<ChevronDown className="h-4 w-4 text-neutral-400 transition-transform ui-open:rotate-180" />
													</CollapsibleTrigger>
													<CollapsibleContent className="border-t border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50 dark:bg-neutral-900/50">
														<div className="space-y-3 text-sm">
															<p className="text-neutral-700 dark:text-neutral-300">{component.purpose}</p>

															{component.props && Object.keys(component.props).length > 0 && (
																<div className="mt-3">
																	<h5 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-2">
																		Props
																	</h5>
																	<div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-3 overflow-x-auto">
																		<code className="text-xs font-mono whitespace-pre-wrap break-all">
																			{JSON.stringify(component.props, null, 2)}
																		</code>
																	</div>
																</div>
															)}

															{component.styling && Object.keys(component.styling).length > 0 && (
																<div className="mt-3">
																	<h5 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-2">
																		Styling
																	</h5>
																	<div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-3 overflow-x-auto">
																		<code className="text-xs font-mono whitespace-pre-wrap break-all">
																			{JSON.stringify(component.styling, null, 2)}
																		</code>
																	</div>
																</div>
															)}

															{component.children && component.children.length > 0 && (
																<div className="mt-3">
																	<h5 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-2">
																		Children
																	</h5>
																	<div className="flex flex-wrap gap-2">
																		{component.children.map((child: string, childIndex: number) => (
																			<Badge
																				key={childIndex}
																				variant="outline"
																				className="bg-neutral-100 dark:bg-neutral-800"
																			>
																				{child}
																			</Badge>
																		))}
																	</div>
																</div>
															)}
														</div>
													</CollapsibleContent>
												</Collapsible>
											))}
										</div>
									) : (
										<div className="text-center p-8 text-neutral-500 dark:text-neutral-400 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg">
											No components defined for this view.
										</div>
									)}

									{/* Data requirements and user interactions */}
									<div className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-2">
										{selectedViewData.dataRequirements && selectedViewData.dataRequirements.length > 0 && (
											<div>
												<h4 className="text-sm font-semibold mb-2">Data Requirements</h4>
												<div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-3">
													<ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
														{selectedViewData.dataRequirements.map((req: string, i: number) => (
															<li key={i}>{req}</li>
														))}
													</ul>
												</div>
											</div>
										)}

										{selectedViewData.userInteractions && selectedViewData.userInteractions.length > 0 && (
											<div>
												<h4 className="text-sm font-semibold mb-2">User Interactions</h4>
												<div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-3">
													<ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
														{selectedViewData.userInteractions.map((interaction: string, i: number) => (
															<li key={i}>{interaction}</li>
														))}
													</ul>
												</div>
											</div>
										)}
									</div>
								</div>
							</>
						) : (
							<div className="flex items-center justify-center p-12">
								<div className="text-center">
									<Layout className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-700 mb-4" />
									<h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-2">No View Selected</h3>
									<p className="text-neutral-500 dark:text-neutral-400">Select a view from the list to see its details.</p>
								</div>
							</div>
						)}
					</div>
				</div>
			) : (
				<div className="flex items-center justify-center p-12 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900/50">
					<div className="text-center">
						<Layout className="mx-auto h-10 w-10 text-neutral-400 mb-3" />
						<p className="text-sm text-neutral-500 dark:text-neutral-400">No views defined yet.</p>
					</div>
				</div>
			)}
		</div>
	);
};

export const AppBuilderJourney: React.FC<AppBuilderJourneyProps> = ({ agents }) => {
	const [isClient, setIsClient] = useState(false);
	const [activeSteps, setActiveSteps] = useState<number[]>([1]);

	useEffect(() => {
		setIsClient(true);
	}, []);
	
	useEffect(() => {
		if (!isClient || !agents || agents.length === 0) return;
		
		const appBuilderAgent = agents.find((agent) => agent.type === 'IterativeAppBuilderAgent');
		if (!appBuilderAgent) return;
		
		const state = appBuilderAgent.state || {};
		const currentStep = state.currentStep || 'idle';
		
		// Determine which steps should be visible based on currentStep
		const visibleSteps: number[] = [];
		
		// Always show the first step
		visibleSteps.push(1);
		
		// Add subsequent steps based on progress
		if (currentStep === 'ui_theme' || currentStep === 'data_model' || 
			currentStep === 'state_machines' || currentStep === 'actions' || 
			currentStep === 'navigation' || currentStep === 'views' || 
			currentStep === 'completed') {
			visibleSteps.push(2);
		}
		
		if (currentStep === 'data_model' || currentStep === 'state_machines' || 
			currentStep === 'actions' || currentStep === 'navigation' || 
			currentStep === 'views' || currentStep === 'completed') {
			visibleSteps.push(3);
		}
		
		if (currentStep === 'state_machines' || currentStep === 'actions' || 
			currentStep === 'navigation' || currentStep === 'views' || 
			currentStep === 'completed') {
			visibleSteps.push(4);
		}
		
		if (currentStep === 'actions' || currentStep === 'navigation' || 
			currentStep === 'views' || currentStep === 'completed') {
			visibleSteps.push(5);
		}
		
		if (currentStep === 'navigation' || currentStep === 'views' || 
			currentStep === 'completed') {
			visibleSteps.push(6);
		}
		
		if (currentStep === 'views' || currentStep === 'completed') {
			visibleSteps.push(7);
		}
		
		if (currentStep === 'completed') {
			visibleSteps.push(8);
		}
		
		setActiveSteps(visibleSteps);
	}, [isClient, agents]);

	if (!agents || agents.length === 0 || !isClient) {
		return null;
	}

	const appBuilderAgent = agents.find((agent) => agent.type === 'IterativeAppBuilderAgent');

	if (!appBuilderAgent) {
		return null;
	}

	const state = appBuilderAgent.state as IterativeAppBuilderState;
	const currentStep = state.currentStep || 'idle';

	// Function to determine if a step is currently being built
	const isStepLoading = (stepNumber: number): boolean => {
		switch (stepNumber) {
			case 1: return currentStep === 'application_brief';
			case 2: return currentStep === 'ui_theme';
			case 3: return currentStep === 'data_model';
			case 4: return currentStep === 'state_machines';
			case 5: return currentStep === 'actions';
			case 6: return currentStep === 'navigation';
			case 7: return currentStep === 'views';
			default: return false;
		}
	};

	return (
		<div className="w-full space-y-6 px-2 md:px-4">
			<div className="py-4">
				<h2 className="text-2xl font-bold tracking-tight">Application Builder</h2>
				<p className="text-muted-foreground">Building your application step by step</p>
			</div>

			<div className="space-y-8">
				{/* Step 1: Application Brief */}
				{activeSteps.includes(1) && (
					<div className="space-y-4 pb-4">
						<div className="flex items-center justify-between bg-white dark:bg-neutral-950 rounded-md p-4 shadow-sm">
							<div className="flex items-center gap-3">
								<div 
									className={cn(
										'flex h-8 w-8 items-center justify-center rounded-full',
										activeSteps.includes(2) ? 'bg-primary text-primary-foreground' : 'bg-neutral-100 dark:bg-neutral-800', 
									)}
								>
									{activeSteps.includes(2) ? <Check className="h-4 w-4" /> : <span>1</span>}
								</div>
								<div className="flex items-center gap-2">
									<Code className="h-4 w-4" />
									<span className="font-medium">Application Brief</span>
								</div>
							</div>
							{isStepLoading(1) && (
								<div className="flex items-center gap-2 text-sm text-neutral-500">
									<div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
									<span>Building...</span>
								</div>
							)}
						</div>
						<AnimatePresence>
							{(state.projectBrief || state.requirements || state.appDescription || isStepLoading(1)) && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									transition={{ duration: 0.3 }}
								>
									<ApplicationBriefSection state={state} />
									{isStepLoading(1) && !state.projectBrief && !state.requirements && !state.appDescription && (
										<div className="flex items-center justify-center h-24 bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-md">
											<div className="flex flex-col items-center gap-2">
												<div className="relative h-10 w-10">
													<div className="absolute inset-0 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-primary animate-spin"></div>
													<Code className="absolute inset-0 m-auto h-5 w-5 text-neutral-500" />
												</div>
												<p className="text-sm text-neutral-500">Creating application brief...</p>
											</div>
										</div>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}

				{/* Step 2: UI Theme */}
				{activeSteps.includes(2) && (
					<div className="space-y-4 pb-4">
						<div className="flex items-center justify-between bg-white dark:bg-neutral-950 rounded-md p-4 shadow-sm">
							<div className="flex items-center gap-3">
								<div 
									className={cn(
										'flex h-8 w-8 items-center justify-center rounded-full',
										activeSteps.includes(3) ? 'bg-primary text-primary-foreground' : 'bg-neutral-100 dark:bg-neutral-800', 
									)}
								>
									{activeSteps.includes(3) ? <Check className="h-4 w-4" /> : <span>2</span>}
								</div>
								<div className="flex items-center gap-2">
									<Palette className="h-4 w-4" />
									<span className="font-medium">UI Theme</span>
								</div>
							</div>
							{isStepLoading(2) && (
								<div className="flex items-center gap-2 text-sm text-neutral-500">
									<div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
									<span>Building...</span>
								</div>
							)}
						</div>
						<AnimatePresence>
							{(state.colorPalette || isStepLoading(2)) && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									transition={{ duration: 0.3 }}
								>
									<UIThemeSection state={state} />
									{isStepLoading(2) && !state.colorPalette && (
										<div className="flex items-center justify-center h-24 bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-md">
											<div className="flex flex-col items-center gap-2">
												<div className="relative h-10 w-10">
													<div className="absolute inset-0 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-primary animate-spin"></div>
													<Palette className="absolute inset-0 m-auto h-5 w-5 text-neutral-500" />
												</div>
												<p className="text-sm text-neutral-500">Creating color palette...</p>
											</div>
										</div>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}

				{/* Step 3: Data Model */}
				{activeSteps.includes(3) && (
					<div className="space-y-4 pb-4">
						<div className="flex items-center justify-between bg-white dark:bg-neutral-950 rounded-md p-4 shadow-sm">
							<div className="flex items-center gap-3">
								<div 
									className={cn(
										'flex h-8 w-8 items-center justify-center rounded-full',
										activeSteps.includes(4) ? 'bg-primary text-primary-foreground' : 'bg-neutral-100 dark:bg-neutral-800', 
									)}
								>
									{activeSteps.includes(4) ? <Check className="h-4 w-4" /> : <span>3</span>}
								</div>
								<div className="flex items-center gap-2">
									<Database className="h-4 w-4" />
									<span className="font-medium">Data Model</span>
								</div>
							</div>
							{isStepLoading(3) && (
								<div className="flex items-center gap-2 text-sm text-neutral-500">
									<div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
									<span>Building...</span>
								</div>
							)}
						</div>
						<AnimatePresence>
							{(state.entities || isStepLoading(3)) && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									transition={{ duration: 0.3 }}
								>
									<DataModelSection state={state} />
									{isStepLoading(3) && (!state.entities || state.entities.length === 0) && (
										<div className="flex items-center justify-center h-24 bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-md">
											<div className="flex flex-col items-center gap-2">
												<div className="relative h-10 w-10">
													<div className="absolute inset-0 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-primary animate-spin"></div>
													<Database className="absolute inset-0 m-auto h-5 w-5 text-neutral-500" />
												</div>
												<p className="text-sm text-neutral-500">Creating data model...</p>
											</div>
										</div>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}

				{/* Step 4: State Machines */}
				{activeSteps.includes(4) && (
					<div className="space-y-4 pb-4">
						<div className="flex items-center justify-between bg-white dark:bg-neutral-950 rounded-md p-4 shadow-sm">
							<div className="flex items-center gap-3">
								<div 
									className={cn(
										'flex h-8 w-8 items-center justify-center rounded-full',
										activeSteps.includes(5) ? 'bg-primary text-primary-foreground' : 'bg-neutral-100 dark:bg-neutral-800', 
									)}
								>
									{activeSteps.includes(5) ? <Check className="h-4 w-4" /> : <span>4</span>}
								</div>
								<div className="flex items-center gap-2">
									<GitBranch className="h-4 w-4" />
									<span className="font-medium">State Machines</span>
								</div>
							</div>
							{isStepLoading(4) && (
								<div className="flex items-center gap-2 text-sm text-neutral-500">
									<div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
									<span>Building...</span>
								</div>
							)}
						</div>
						<AnimatePresence>
							{(state.stateMachines || isStepLoading(4)) && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									transition={{ duration: 0.3 }}
								>
									<StateMachineSection state={state} />
									{isStepLoading(4) && (!state.stateMachines || state.stateMachines.length === 0) && (
										<div className="flex items-center justify-center h-24 bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-md">
											<div className="flex flex-col items-center gap-2">
												<div className="relative h-10 w-10">
													<div className="absolute inset-0 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-primary animate-spin"></div>
													<GitBranch className="absolute inset-0 m-auto h-5 w-5 text-neutral-500" />
												</div>
												<p className="text-sm text-neutral-500">Creating state machines...</p>
											</div>
										</div>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}

				{/* Step 5: Actions */}
				{activeSteps.includes(5) && (
					<div className="space-y-4 pb-4">
						<div className="flex items-center justify-between bg-white dark:bg-neutral-950 rounded-md p-4 shadow-sm">
							<div className="flex items-center gap-3">
								<div 
									className={cn(
										'flex h-8 w-8 items-center justify-center rounded-full',
										activeSteps.includes(6) ? 'bg-primary text-primary-foreground' : 'bg-neutral-100 dark:bg-neutral-800', 
									)}
								>
									{activeSteps.includes(6) ? <Check className="h-4 w-4" /> : <span>5</span>}
								</div>
								<div className="flex items-center gap-2">
									<Zap className="h-4 w-4" />
									<span className="font-medium">Actions</span>
								</div>
							</div>
							{isStepLoading(5) && (
								<div className="flex items-center gap-2 text-sm text-neutral-500">
									<div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
									<span>Building...</span>
								</div>
							)}
						</div>
						<AnimatePresence>
							{(state.actions || isStepLoading(5)) && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									transition={{ duration: 0.3 }}
								>
									<ActionsSection state={state} />
									{isStepLoading(5) && (!state.actions || state.actions.length === 0) && (
										<div className="flex items-center justify-center h-24 bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-md">
											<div className="flex flex-col items-center gap-2">
												<div className="relative h-10 w-10">
													<div className="absolute inset-0 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-primary animate-spin"></div>
													<Zap className="absolute inset-0 m-auto h-5 w-5 text-neutral-500" />
												</div>
												<p className="text-sm text-neutral-500">Creating actions...</p>
											</div>
										</div>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}

				{/* Step 6: Navigation */}
				{activeSteps.includes(6) && (
					<div className="space-y-4 pb-4">
						<div className="flex items-center justify-between bg-white dark:bg-neutral-950 rounded-md p-4 shadow-sm">
							<div className="flex items-center gap-3">
								<div 
									className={cn(
										'flex h-8 w-8 items-center justify-center rounded-full',
										activeSteps.includes(7) ? 'bg-primary text-primary-foreground' : 'bg-neutral-100 dark:bg-neutral-800', 
									)}
								>
									{activeSteps.includes(7) ? <Check className="h-4 w-4" /> : <span>6</span>}
								</div>
								<div className="flex items-center gap-2">
									<Navigation className="h-4 w-4" />
									<span className="font-medium">Navigation</span>
								</div>
							</div>
							{isStepLoading(6) && (
								<div className="flex items-center gap-2 text-sm text-neutral-500">
									<div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
									<span>Building...</span>
								</div>
							)}
						</div>
						<AnimatePresence>
							{(state.navigation || state.pages || isStepLoading(6)) && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									transition={{ duration: 0.3 }}
								>
									<NavigationSection state={state} />
									{isStepLoading(6) && (!state.navigation || !state.pages) && (
										<div className="flex items-center justify-center h-24 bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-md">
											<div className="flex flex-col items-center gap-2">
												<div className="relative h-10 w-10">
													<div className="absolute inset-0 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-primary animate-spin"></div>
													<Navigation className="absolute inset-0 m-auto h-5 w-5 text-neutral-500" />
												</div>
												<p className="text-sm text-neutral-500">Creating navigation...</p>
											</div>
										</div>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}

				{/* Step 7: Views */}
				{activeSteps.includes(7) && (
					<div className="space-y-4 pb-4">
						<div className="flex items-center justify-between bg-white dark:bg-neutral-950 rounded-md p-4 shadow-sm">
							<div className="flex items-center gap-3">
								<div 
									className={cn(
										'flex h-8 w-8 items-center justify-center rounded-full',
										activeSteps.includes(8) ? 'bg-primary text-primary-foreground' : 'bg-neutral-100 dark:bg-neutral-800', 
									)}
								>
									{activeSteps.includes(8) ? <Check className="h-4 w-4" /> : <span>7</span>}
								</div>
								<div className="flex items-center gap-2">
									<Layout className="h-4 w-4" />
									<span className="font-medium">Views</span>
								</div>
							</div>
							{isStepLoading(7) && (
								<div className="flex items-center gap-2 text-sm text-neutral-500">
									<div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
									<span>Building...</span>
								</div>
							)}
						</div>
						<AnimatePresence>
							{(state.views || isStepLoading(7)) && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									transition={{ duration: 0.3 }}
								>
									<ViewsSection state={state} />
									{isStepLoading(7) && (!state.views || state.views.length === 0) && (
										<div className="flex items-center justify-center h-24 bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-md">
											<div className="flex flex-col items-center gap-2">
												<div className="relative h-10 w-10">
													<div className="absolute inset-0 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-primary animate-spin"></div>
													<Layout className="absolute inset-0 m-auto h-5 w-5 text-neutral-500" />
												</div>
												<p className="text-sm text-neutral-500">Creating views...</p>
											</div>
										</div>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}

				{/* Step 8: Complete */}
				{activeSteps.includes(8) && (
					<div className="space-y-4 pb-4">
						<div className="flex items-center justify-between bg-white dark:bg-neutral-950 rounded-md p-4 shadow-sm">
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
									<Check className="h-4 w-4" />
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-green-500" />
									<span className="font-medium">Application Complete</span>
								</div>
							</div>
						</div>
						<AnimatePresence>
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								transition={{ duration: 0.3 }}
							>
								<div className="space-y-4">
									<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
										<div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full mx-auto mb-4">
											<Check className="w-8 h-8 text-green-500 dark:text-green-300" />
										</div>
										<h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">Application Blueprint Completed</h3>
										<p className="text-green-700 dark:text-green-400 mb-4">
											Your application schema has been fully generated and is ready for implementation.
										</p>
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
											<div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-center">
												<Database className="w-5 h-5 mx-auto text-blue-500 mb-2" />
												<span className="text-sm font-medium">{(state.entities || []).length} Entities</span>
											</div>
											<div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-center">
												<Zap className="w-5 h-5 mx-auto text-amber-500 mb-2" />
												<span className="text-sm font-medium">{(state.actions || []).length} Actions</span>
											</div>
											<div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-center">
												<Layout className="w-5 h-5 mx-auto text-purple-500 mb-2" />
												<span className="text-sm font-medium">{(state.views || []).length} Views</span>
											</div>
										</div>
									</div>
								</div>
							</motion.div>
						</AnimatePresence>
					</div>
				)}
			</div>
		</div>
	);
};
