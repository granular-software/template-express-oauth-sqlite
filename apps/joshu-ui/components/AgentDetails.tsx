'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Database, FileCode, Link2, Palette } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { motion } from 'framer-motion';
import { 
	Agent, 
	EntityDefinition, 
	AgentFieldDefinition,
	ColorPalette,
	IterativeAppBuilderState
} from '@joshu/os-types';

// Custom styles for markdown content
const markdownStyles = {
	prose: `prose dark:prose-invert max-w-none
    prose-headings:font-semibold 
    prose-h1:text-2xl prose-h1:mb-4
    prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
    prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2
    prose-p:my-2
    prose-a:text-blue-600 dark:prose-a:text-blue-400
    prose-strong:font-semibold
    prose-ul:ml-6 prose-ul:list-disc
    prose-ol:ml-6 prose-ol:list-decimal
    prose-li:my-1
    prose-hr:my-4
    prose-blockquote:border-l-4 prose-blockquote:border-neutral-300 dark:prose-blockquote:border-neutral-700
    prose-blockquote:pl-4 prose-blockquote:py-1
  `,
};

// Define an interface for the actual structure used in the application
// This extends IterativeAppBuilderState with the properties being used in this component
interface ApplicationBuilderState extends IterativeAppBuilderState {
	// These fields appear to be part of the actual structure but not in the IterativeAppBuilderState type
	applicationSpecs?: string;
	ontology?: {
		entities: EntityDefinition[];
	};
	status?: string;
}

// Updated interface to match the actual agent types used
interface AppBuilderAgent extends Agent<ApplicationBuilderState> {
	type: string;
	started_at: string;
}

// Updated props interface
interface AgentDetailsProps {
	agents: AppBuilderAgent[] | null | undefined;
}

// Animation variants for staggered children
const containerVariants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
			delayChildren: 0.2,
		},
	},
};

const itemVariants = {
	hidden: {
		opacity: 0,
		y: 20,
	},
	show: {
		opacity: 1,
		y: 0,
		transition: {
			type: 'spring',
			stiffness: 260,
			damping: 20,
		},
	},
};

// Custom checkbox component for markdown
const MarkdownCheckbox = ({ checked }: { checked: boolean }) => (
	<span className="inline-flex items-center mr-2">
		<span
			className={`w-4 h-4 border rounded flex items-center justify-center ${checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}
		>
			{checked && <span className="text-white text-xs">✓</span>}
		</span>
	</span>
);

// Color palette display component - moved outside of AgentDetails
const ColorPaletteDisplay = ({ 
	stablePalette, 
	isPaletteGenerating 
}: { 
	stablePalette: ColorPalette; 
	isPaletteGenerating: boolean;
}) => {
	// Always initialize hooks at the top level, unconditionally
	const hasRenderedRef = useRef(false);
	
	// Use useEffect to set hasRendered to true after first render
	useEffect(() => {
		hasRenderedRef.current = true;
	}, []);
	
	// Only show when color palette is generated and not generating
	if (!stablePalette || isPaletteGenerating) return null;
	
	// Only apply animation variants if this is the first render
	const animationVariant = hasRenderedRef.current ? {} : itemVariants;

	return (
		<motion.div 
			variants={animationVariant}
			initial={hasRenderedRef.current ? { opacity: 1, y: 0 } : undefined}
			animate={hasRenderedRef.current ? { opacity: 1, y: 0 } : undefined}
		>
			<Card className="border-violet-100 dark:border-violet-900/30 overflow-hidden">
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2">
						<Palette className="h-5 w-5 text-violet-500" />
						Color Palette
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-0">
					<div className="space-y-6">
						{/* Primary, Secondary, Accent Colors */}
						<div className="grid grid-cols-3 gap-3">
							<div className="space-y-2">
								<div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Primary</div>
								<div className="flex flex-col gap-1">
									<div 
										className="h-12 rounded-md shadow-sm flex items-end justify-end p-1" 
										style={{ backgroundColor: stablePalette.primary.base }}
									>
										<Badge className="bg-white/70 text-xs">{stablePalette.primary.base}</Badge>
									</div>
									<div className="flex gap-1">
										<div 
											className="h-6 flex-1 rounded-md" 
											style={{ backgroundColor: stablePalette.primary.hover }}
											title="Hover state"
										/>
										<div 
											className="h-6 w-6 rounded-md flex items-center justify-center" 
											style={{ backgroundColor: stablePalette.primary.base, color: stablePalette.primary.text }}
											title="Text color"
										>
											<span>T</span>
										</div>
									</div>
								</div>
							</div>
							
							<div className="space-y-2">
								<div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Secondary</div>
								<div className="flex flex-col gap-1">
									<div 
										className="h-12 rounded-md shadow-sm flex items-end justify-end p-1" 
										style={{ backgroundColor: stablePalette.secondary.base }}
									>
										<Badge className="bg-white/70 text-xs">{stablePalette.secondary.base}</Badge>
									</div>
									<div className="flex gap-1">
										<div 
											className="h-6 flex-1 rounded-md" 
											style={{ backgroundColor: stablePalette.secondary.hover }}
											title="Hover state"
										/>
										<div 
											className="h-6 w-6 rounded-md flex items-center justify-center" 
											style={{ backgroundColor: stablePalette.secondary.base, color: stablePalette.secondary.text }}
											title="Text color"
										>
											<span>T</span>
										</div>
									</div>
								</div>
							</div>
							
							<div className="space-y-2">
								<div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Accent</div>
								<div className="flex flex-col gap-1">
									<div 
										className="h-12 rounded-md shadow-sm flex items-end justify-end p-1" 
										style={{ backgroundColor: stablePalette.accent.base }}
									>
										<Badge className="bg-white/70 text-xs">{stablePalette.accent.base}</Badge>
									</div>
									<div className="flex gap-1">
										<div 
											className="h-6 flex-1 rounded-md" 
											style={{ backgroundColor: stablePalette.accent.hover }}
											title="Hover state"
										/>
										<div 
											className="h-6 w-6 rounded-md flex items-center justify-center" 
											style={{ backgroundColor: stablePalette.accent.base, color: stablePalette.accent.text }}
											title="Text color"
										>
											<span>T</span>
										</div>
									</div>
								</div>
							</div>
						</div>
						
						{/* Entity Colors */}
						<div className="space-y-2">
							<div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Entity Colors</div>
							<div className="grid grid-cols-6 gap-2">
								{stablePalette.entity_colors.map((color, index) => (
									<div key={index} className="space-y-1">
										<div 
											className="aspect-square rounded-md shadow-sm flex items-end justify-end p-1 relative overflow-hidden" 
											style={{ backgroundColor: color.background, color: color.text, borderColor: color.border, borderWidth: 1 }}
										>
											<div className="absolute inset-0 flex items-center justify-center">
												<span className="text-sm font-medium">{index + 1}</span>
											</div>
											<div 
												className="absolute bottom-0 right-0 left-0 h-5 flex items-center justify-center"
												style={{ backgroundColor: color.darkBackground, color: color.darkText }}
											>
												<span className="text-[9px]">Dark</span>
											</div>
										</div>
										<div 
											className="text-[8px] font-mono text-center overflow-hidden text-ellipsis"
											title={color.background}
										>
											{color.background}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
};

export const AgentDetails: React.FC<AgentDetailsProps> = ({ agents }) => {
	// Initialize all hooks at the top level, unconditionally
	const [isSpecsOpen, setIsSpecsOpen] = React.useState(true);
	const scrollRef = useRef<HTMLDivElement>(null);
	const initialPaletteRef = useRef<ColorPalette | null>(null);
	const [isDarkMode, setIsDarkMode] = React.useState(false);
	
	// Move all useEffect calls to the top level
	// Effect for updating the initial palette ref
	React.useEffect(() => {
		if (!agents || agents.length === 0) return;
		
		const agent = agents[0];
		if (agent.type !== 'ApplicationBuilderAgent' || !agent.state || !agent.state.applicationSpecs) return;
		
		const { colorPalette } = agent.state;
		if (!initialPaletteRef.current && colorPalette) {
			initialPaletteRef.current = colorPalette;
		}
	}, [agents]);
	
	// Effect for auto-scrolling to bottom when specs change
	useEffect(() => {
		if (!agents || agents.length === 0) return;
		
		const agent = agents[0];
		if (agent.type !== 'ApplicationBuilderAgent' || !agent.state || !agent.state.applicationSpecs) return;
		
		const { applicationSpecs } = agent.state;
		
		if (scrollRef.current && isSpecsOpen) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [agents, isSpecsOpen]);
	
	// Effect for updating dark mode on component mount and when theme changes
	React.useEffect(() => {
		// Initial dark mode check
		const checkDarkMode = () => document.documentElement.classList.contains('dark');

		setIsDarkMode(checkDarkMode());

		// Set up observer for theme changes
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.attributeName === 'class') {
					setIsDarkMode(checkDarkMode());
				}
			});
		});

		observer.observe(document.documentElement, { attributes: true });

		// Cleanup
		return () => observer.disconnect();
	}, []);
	
	// Memoize the ColorPaletteDisplay component to prevent re-renders
	// Move this up before any conditional returns
	const MemoizedColorPalette = React.useMemo(() => {
		if (!agents || agents.length === 0) return null;
		
		const agent = agents[0];
		if (agent.type !== 'ApplicationBuilderAgent' || !agent.state || !agent.state.applicationSpecs) return null;
		
		const { colorPalette } = agent.state;
		const stablePalette = initialPaletteRef.current || colorPalette;
		const isPaletteGenerating = agent.state.status === 'generating_palette';
		
		if (!stablePalette || isPaletteGenerating) return null;
		return <ColorPaletteDisplay stablePalette={stablePalette} isPaletteGenerating={isPaletteGenerating} />;
	}, [agents, initialPaletteRef]);

	// Early return after all hooks are declared
	if (!agents || agents.length === 0) {
		return null;
	}

	// For simplicity, we'll display the first agent
	const agent = agents[0];

	// Check if this is an Application Builder Agent with specifications
	if (agent.type !== 'ApplicationBuilderAgent' || !agent.state || !agent.state.applicationSpecs) {
		return null;
	}

	const { applicationSpecs, ontology, userQuery, colorPalette, entity_color_map } = agent.state;

	// Format the date nicely
	const startedDate = new Date(agent.started_at);
	const formattedDate = startedDate.toLocaleString();
	
	// Use the initial palette for rendering to prevent re-renders
	const stablePalette = initialPaletteRef.current || colorPalette;

	// Status badges based on agent state
	const isPaletteGenerating = agent.state.status === 'generating_palette';
	const isOntologyGenerating = agent.state.status === 'defining_ontology';
	const isSpecsGenerating = agent.state.status === 'defining_specs';

	// Custom component to render markdown with checkboxes
	const CustomMarkdown = ({ children }: { children: string }) => {
		return (
			<ReactMarkdown
				components={{
					// @ts-ignore - the types for ReactMarkdown components are incomplete
					li: ({ node, ...props }: any) => {
						if (node && node.properties) {
							const { checked } = node.properties;
							if (typeof checked === 'boolean') {
								return (
									<li className="flex items-start" {...props}>
										<MarkdownCheckbox checked={checked} />
										<span>{props.children}</span>
									</li>
								);
							}
						}
						return <li {...props} />;
					},
				}}
			>
				{children}
			</ReactMarkdown>
		);
	};

	// Color palette status badge
	const ColorPaletteStatus = () => {
		const agent = agents?.[0];
		if (!agent || !isPaletteGenerating) return null;

		const paletteState = agent.state?.lastAction || '';

		// Gradient colors for status badge background
		const badgeStyle = {
			background: 'linear-gradient(to right, rgba(239, 246, 255, 0.6), rgba(245, 243, 255, 0.6), rgba(254, 242, 242, 0.6))',
			color: '#1E40AF',
			borderColor: '#BFDBFE',
		};

		// Dark mode style
		const darkBadgeStyle = {
			background: 'linear-gradient(to right, rgba(30, 58, 138, 0.3), rgba(76, 29, 149, 0.3), rgba(127, 29, 29, 0.3))',
			color: '#93C5FD',
			borderColor: '#1E40AF',
		};

		// Dot animation style
		const dotStyle = {
			background: 'linear-gradient(to right, #60A5FA, #8B5CF6)',
			width: '0.75rem',
			height: '0.75rem',
			borderRadius: '9999px',
		};

		if (
			!['generating_initial_palette', 'streaming_palette', 'tuning_palette', 'defined_palette', 'recovered_palette', 'Preparing palette...'].includes(
				paletteState,
			)
		) {
			return <></>;
		}
		return (
			<div className="flex items-center mt-4 mb-2">
				<Badge className="px-3 py-1 border" style={isDarkMode ? darkBadgeStyle : badgeStyle}>
					<div className="flex items-center gap-2">
						<motion.div style={dotStyle} animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />
						{paletteState === 'generating_initial_palette' && 'Generating initial colors...'}
						{paletteState === 'streaming_palette' && 'Building color palette live...'}
						{paletteState === 'tuning_palette' && 'Tuning color palette...'}
						{paletteState === 'defined_palette' && 'Color palette complete'}
						{paletteState === 'recovered_palette' && 'Color palette recovered'}
						{!paletteState && 'Preparing palette...'}
					</div>
				</Badge>
			</div>
		);
	};

	// Check if entities are being generated or if we have entities already
	// @ts-ignore: We've added null checks but TypeScript still flags this
	const hasEntities = ontology?.entities?.length > 0 || false;
	const isGeneratingEntities = agent.state.lastAction?.includes('entity') || agent.state.status === 'defining_ontology';
	const shouldShowDataModel = hasEntities || isGeneratingEntities;

	// Entity loading skeleton component
	const EntitySkeletons = () => {
		return (
			<>
				{[1, 2, 3].map((i) => (
					<motion.div
						key={`skeleton-${i}`}
						className="border rounded-lg shadow-sm h-full overflow-hidden transition-shadow bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
						animate={{
							opacity: [0.5, 0.8, 0.5],
							scale: [0.98, 1, 0.98],
						}}
						transition={{
							repeat: Infinity,
							duration: 1.5,
							delay: i * 0.2,
						}}
					>
						<div className="p-2 border-b flex items-center justify-between bg-gray-100/50 dark:bg-gray-800/50">
							<div className="flex items-center gap-2">
								<div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
								<div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
							</div>
						</div>

						<div className="p-2">
							<div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
							<div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
						</div>

						<div className="px-2 pb-1">
							<div className="flex flex-wrap gap-1 mb-1">
								<div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
								<div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
								<div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
							</div>
						</div>
					</motion.div>
				))}
			</>
		);
	};

	return (
		<motion.div className="space-y-6 mt-8" initial="hidden" animate="show" variants={containerVariants}>
			<motion.div className="flex items-center justify-between" variants={itemVariants}>
				<div className="flex items-center gap-3">
					<FileCode className="h-6 w-6 text-blue-500" />
					<h2 className="text-2xl font-semibold">Application Blueprint</h2>
				</div>
				<Badge variant="outline" className="px-3 py-1">
					Created: {formattedDate}
				</Badge>
			</motion.div>

			{/* Application Specs Accordion */}
			<motion.div variants={itemVariants}>
				<Collapsible open={isSpecsOpen} onOpenChange={setIsSpecsOpen} className="w-full">
					<Card className="border-blue-100 dark:border-blue-900/30">
						<CollapsibleTrigger className="w-full text-left">
							<CardHeader className="flex flex-row items-center justify-between py-4">
								<div className="flex items-center gap-2">
									<FileCode className="h-5 w-5 text-blue-500" />
									<CardTitle>Application Specifications</CardTitle>
								</div>
								<div className="flex items-center gap-3">
									<CardDescription className="m-0">
										Based on query:{' '}
										<Badge variant="outline" className="ml-1 font-medium">
											{userQuery && userQuery.length > 50 ? userQuery.substring(0, 50) + '...' : userQuery}
										</Badge>
									</CardDescription>
									<ChevronDown className="h-5 w-5 text-neutral-500 transition-transform ui-open:rotate-180" />
								</div>
							</CardHeader>
						</CollapsibleTrigger>
						<CollapsibleContent className="px-4 pb-4 overflow-auto max-h-96" ref={scrollRef}>
							<div className={markdownStyles.prose}>
								{applicationSpecs ? (
									<CustomMarkdown>{applicationSpecs}</CustomMarkdown>
								) : (
									<div className="animate-pulse space-y-2">
										<div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
										<div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
										<div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded"></div>
									</div>
								)}
							</div>
						</CollapsibleContent>
					</Card>
				</Collapsible>
			</motion.div>

			{/* Color Palette */}
			<motion.div variants={itemVariants}>
				{!stablePalette && isPaletteGenerating && <ColorPaletteStatus />}
				{MemoizedColorPalette}
			</motion.div>

			{/* Data Model */}
			{shouldShowDataModel && (
				<motion.div variants={itemVariants}>
					<Card className="border-emerald-100 dark:border-emerald-900/30">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2">
								<Database className="h-5 w-5 text-emerald-500" />
								Data Model
							</CardTitle>
							<CardDescription>({ontology?.entities?.length || 0} entities defined)</CardDescription>
						</CardHeader>
						<CardContent className="pt-0">
							{hasEntities && !isGeneratingEntities ? (
								<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
									{ontology?.entities && ontology.entities.map((entity: EntityDefinition) => (
										<CompactEntityCard
											key={entity.name}
											entity={entity}
											entities={ontology.entities ?? []}
											colorPalette={stablePalette}
											agent={agent}
											isDarkMode={isDarkMode}
										/>
									))}
								</div>
							) : (
								<EntitySkeletons />
							)}
						</CardContent>
					</Card>
				</motion.div>
			)}
		</motion.div>
	);
};

// Compact component to display an entity and its relationships
const CompactEntityCard: React.FC<{
	entity: EntityDefinition;
	entities: EntityDefinition[];
	colorPalette?: ColorPalette | null;
	isTuningPalette?: boolean;
	agent: AppBuilderAgent;
	isDarkMode?: boolean;
}> = ({ entity, entities, colorPalette, isTuningPalette, agent, isDarkMode = false }) => {
	// Generate a deterministic color for this entity or get from color map
	const getEntityColor = (name: string) => {
		// Check if we have a color map
		if (agent.state.entity_color_map && agent.state.entity_color_map[name]) {
			return agent.state.entity_color_map[name];
		} else if (colorPalette && colorPalette.entity_colors && colorPalette.entity_colors.length > 0) {
			// Calculate a deterministic index for the entity name
			const hash = name.split('').reduce((acc, char, i) => {
				return acc + char.charCodeAt(0) * (i + 1);
			}, 0);
			return colorPalette.entity_colors[hash % colorPalette.entity_colors.length];
		}
		// Default fallback color
		return {
			background: '#EFF6FF',
			text: '#1E40AF',
			border: '#BFDBFE',
			darkBackground: '#1E3A8A',
			darkText: '#93C5FD',
			darkBorder: '#1E40AF',
		};
	};

	const entityColor = getEntityColor(entity.name);
	
	const cardStyle = isDarkMode
		? getDarkModeStyle(entityColor)
		: getLightModeStyle(entityColor);
	
	// Field badge variants based on type
	const fieldTypes = entity.fields?.map(field => field.type) || [];
	const uniqueTypes = [...new Set(fieldTypes)];
	
	// Get relationship fields
	const relationFields = entity.fields?.filter(field => field.is_relation) || [];
	
	return (
		<div 
			className="border rounded-lg shadow-sm h-full overflow-hidden transition-shadow hover:shadow-md"
			style={{ borderColor: cardStyle.borderColor, backgroundColor: cardStyle.backgroundColor }}
		>
			<div 
				className="p-2 border-b flex items-center justify-between"
				style={{ borderColor: cardStyle.borderColor, backgroundColor: cardStyle.headerBackground }}
			>
				<div className="flex items-center gap-2">
					<div
						className="w-6 h-6 rounded-full flex items-center justify-center"
						style={{ backgroundColor: cardStyle.iconBackground, color: cardStyle.iconColor }}
					>
						<span>{entity.emoji}</span>
					</div>
					<span 
						className="text-sm font-medium truncate max-w-[140px]"
						style={{ color: cardStyle.titleColor }}
					>
						{entity.label || entity.name}
					</span>
				</div>
			</div>

			<div className="p-2">
				<p className="text-xs line-clamp-2" style={{ color: cardStyle.textColor }}>
					{entity.description}
				</p>
			</div>

			<div className="px-2 pb-2">
				<div className="flex flex-wrap gap-1 mb-1">
					{uniqueTypes.map(type => (
						<div 
							key={type}
							className="text-xs px-1.5 py-0.5 rounded"
							style={{ 
								backgroundColor: cardStyle.badgeBackground,
								color: cardStyle.badgeColor
							}}
						>
							{formatType(type)}
						</div>
					))}
				</div>
				
				{relationFields.length > 0 && (
					<div className="mt-1">
						<div 
							className="text-[10px] font-semibold uppercase"
							style={{ color: cardStyle.labelColor }}
						>
							Relations:
						</div>
						<div className="flex flex-wrap gap-1 mt-0.5">
							{relationFields.map(field => {
								const relatedEntity = entities.find(e => e.name === field.type);
								return (
									<div 
										key={field.name}
										className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5"
										style={{ 
											backgroundColor: cardStyle.relationBackground,
											color: cardStyle.relationColor
										}}
										title={`${field.name}: ${field.description || 'Relation to ' + field.type}`}
									>
										<Link2 className="h-2 w-2" />
										<span className="truncate max-w-[80px]">{field.name}</span>
										{field.is_list && <span>[]</span>}
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

// Style utility functions for the entity card
const getLightModeStyle = (color: ColorPalette['entity_colors'][0] | undefined) => ({
	backgroundColor: color?.background || '#f5f5f5',
	borderColor: color?.border || '#e5e7eb',
	headerBackground: `${color?.background || '#f5f5f5'}95`,
	textColor: color?.text || '#1f2937',
	titleColor: color?.text || '#111827',
	iconBackground: color?.text || '#4b5563',
	iconColor: color?.background || '#ffffff',
	badgeBackground: `${color?.text || '#4b5563'}15`,
	badgeColor: color?.text || '#4b5563',
	labelColor: `${color?.text || '#4b5563'}99`,
	relationBackground: `${color?.text || '#4b5563'}10`,
	relationColor: color?.text || '#4b5563',
});

const getDarkModeStyle = (color: ColorPalette['entity_colors'][0] | undefined) => ({
	backgroundColor: color?.darkBackground || '#1f2937',
	borderColor: color?.darkBorder || '#374151',
	headerBackground: `${color?.darkBackground || '#1f2937'}95`,
	textColor: color?.darkText || '#e5e7eb',
	titleColor: color?.darkText || '#f9fafb',
	iconBackground: color?.darkText || '#d1d5db',
	iconColor: color?.darkBackground || '#1f2937',
	badgeBackground: `${color?.darkText || '#d1d5db'}20`,
	badgeColor: color?.darkText || '#d1d5db',
	labelColor: `${color?.darkText || '#d1d5db'}99`,
	relationBackground: `${color?.darkText || '#d1d5db'}15`,
	relationColor: color?.darkText || '#d1d5db',
});

// Format type for display
const formatType = (type: string) => {
	// For relation fields, just show the entity name
	const isRelation = type.charAt(0).toUpperCase() === type.charAt(0);
	if (isRelation) {
		return type;
	}
	
	// Format built-in types
	switch (type) {
		case 'string':
			return 'String';
		case 'number':
			return 'Number';
		case 'boolean':
			return 'Boolean';
		case 'date':
			return 'Date';
		default:
			return type;
	}
};

export default AgentDetails;
