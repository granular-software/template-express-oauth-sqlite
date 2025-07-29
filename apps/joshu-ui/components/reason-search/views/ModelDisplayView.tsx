import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Database } from 'lucide-react';
import { SerializedView } from '@joshu/os-types';
import { UseOsClient } from '@/hooks/useOsClient';

interface ModelDisplayViewProps {
  view: SerializedView;
  isSelected: (path: string) => boolean;
  getSelectionScore: (path: string) => number;
  isRecentlySelected?: (path: string, isAction?: boolean) => boolean;

  osClient: UseOsClient;
  window_id: string;
}

export const ModelDisplayView: React.FC<ModelDisplayViewProps> = ({ 
  view, 
  isSelected, 
  getSelectionScore,
    isRecentlySelected = () => false,
  osClient,
  window_id
}) => {
  const selected = isSelected(view.router_path);
  const recentlySelected = isRecentlySelected(view.router_path, false);
  const score = getSelectionScore(view.router_path);
  const scorePercentage = Math.round(score * 100);
  
  return (
    <motion.div
      animate={recentlySelected ? {
        scale: [1, 1.03, 1],
        boxShadow: [
          '0 0 0 rgba(168, 85, 247, 0)',
          '0 0 15px rgba(168, 85, 247, 0.5)',
          '0 0 0 rgba(168, 85, 247, 0)'
        ]
      } : {}}
      transition={{ duration: 1.5 }}
    >
      <Card className={`
        shadow-sm border overflow-hidden transition-colors relative
        ${recentlySelected ? 'border-purple-400 dark:border-purple-600 bg-purple-50/80 dark:bg-purple-900/30' : 
          selected ? 'border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10' : 
          'border-neutral-200 dark:border-neutral-800'}
      `}>
        {recentlySelected && (
          <motion.div 
            className="absolute inset-0 bg-purple-400/20 dark:bg-purple-600/30"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          />
        )}
        
        <CardContent className="p-3 flex items-center gap-3">
          <div className={`
            h-8 w-8 rounded-full flex items-center justify-center
            ${recentlySelected ? 'bg-purple-200 dark:bg-purple-800/70' :
              selected ? 'bg-purple-100 dark:bg-purple-900/50' : 
              'bg-neutral-100 dark:bg-neutral-800'}
          `}>
            {recentlySelected ? (
              <motion.div
                initial={{ rotate: -30, scale: 0.5 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                <Check className="h-4 w-4 text-purple-700 dark:text-purple-300" />
              </motion.div>
            ) : (
              <Database className={`h-4 w-4 ${
                selected ? 'text-purple-600 dark:text-purple-400' : 
                'text-neutral-500'}`} 
              />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className={`font-medium text-sm ${recentlySelected ? 'text-purple-700 dark:text-purple-300' : ''}`}>
              {view.name}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">{view.description}</div>
            <div className="mt-1 text-xs text-purple-500 dark:text-purple-400 flex items-center gap-1">
              <Database className="h-3 w-3" />
              Model: {view.router_path}
            </div>
          </div>
          
          {selected && (
            <Badge className={`
              text-white flex items-center gap-1.5
              ${recentlySelected ? 'bg-purple-600 dark:bg-purple-700' : 'bg-purple-500 dark:bg-purple-600'}
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