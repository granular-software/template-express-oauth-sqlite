import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Grid, Layers } from 'lucide-react';
import { SerializedView } from '@joshu/os-types';
import { UseOsClient } from '@/hooks/useOsClient';
interface DesktopViewProps {
  view: SerializedView;
  isSelected: (path: string) => boolean;
  getSelectionScore: (path: string) => number;
  isRecentlySelected?: (path: string, isAction?: boolean) => boolean;
  osClient: UseOsClient;
  window_id: string;
}

export const DesktopView: React.FC<DesktopViewProps> = ({ 
  view, 
  isSelected, 
  getSelectionScore,
  isRecentlySelected = () => false,
  osClient,
  window_id
}) => {
  return (
    <Card className="shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
          <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-medium text-sm">Desktop</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Operating System Interface</p>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
          Available Applications
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          {view.clickable_links.map((link, i) => {
            const selected = isSelected(link.router_path);
            const recentlySelected = isRecentlySelected(link.router_path, false);
            const score = getSelectionScore(link.router_path);
            const scorePercentage = Math.round(score * 100);
            
            return (
              <motion.div
                key={i}
                animate={recentlySelected ? {
                  scale: [1, 1.03, 1],
                  boxShadow: [
                    '0 0 0 rgba(59, 130, 246, 0)',
                    '0 0 15px rgba(59, 130, 246, 0.5)',
                    '0 0 0 rgba(59, 130, 246, 0)'
                  ]
                } : {}}
                transition={{ duration: 1.5 }}
                className={`
                  p-3 rounded-lg border flex items-center gap-3 transition-all relative
                  ${recentlySelected ? 'border-blue-400 dark:border-blue-600 bg-blue-50/80 dark:bg-blue-900/30' : 
                    selected ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10' : 
                    'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'}
                `}
              >
                {recentlySelected && (
                  <motion.div 
                    className="absolute inset-0 bg-blue-400/20 dark:bg-blue-600/30 rounded-lg"
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 1.5 }}
                  />
                )}
                
                <div className={`
                  h-8 w-8 rounded-md flex items-center justify-center
                  ${recentlySelected ? 'bg-blue-200 dark:bg-blue-800/70' :
                    selected ? 'bg-blue-100 dark:bg-blue-800/50' : 
                    'bg-neutral-100 dark:bg-neutral-800'}
                `}>
                  {recentlySelected ? (
                    <motion.div
                      initial={{ rotate: -30, scale: 0.5 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <Check className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                    </motion.div>
                  ) : (
                    <Grid className={`h-4 w-4 ${
                      selected ? 'text-blue-600 dark:text-blue-400' : 
                      'text-neutral-500'}`} 
                    />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm truncate ${recentlySelected ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                    {link.name}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{link.description}</div>
                </div>
                
                {selected && (
                  <Badge className={`
                    text-white flex items-center gap-1.5 ml-2
                    ${recentlySelected ? 'bg-blue-600 dark:bg-blue-700' : 'bg-blue-500 dark:bg-blue-600'}
                  `}>
                    <Check className="h-3 w-3" />
                    <span>{scorePercentage}%</span>
                  </Badge>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}; 