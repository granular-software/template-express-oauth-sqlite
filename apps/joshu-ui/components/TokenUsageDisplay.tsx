import React from 'react';
// import type { TokenUsage } from '../../os/types';
import { cn } from '@/lib/utils';

interface TokenUsage {
  input: number;
  output: number;
  cost: number;
}

interface TokenUsageDisplayProps {
  usage: TokenUsage;
  className?: string;
}

export const TokenUsageDisplay: React.FC<TokenUsageDisplayProps> = ({ usage, className }) => {
  return (
    <div className={cn("bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg text-sm", className)}>
      <div className="flex flex-wrap gap-3 text-neutral-600 dark:text-neutral-400">
        <div>
          <span className="font-medium">Input:</span>
          <span className="ml-2 font-mono">{usage.input.toLocaleString()}</span>
        </div>
        <div>
          <span className="font-medium">Output:</span>
          <span className="ml-2 font-mono">{usage.output.toLocaleString()}</span>
        </div>
          {/* <div>
            <span className="font-medium">Model:</span>
            <span className="ml-2 font-mono">{usage.}</span>
          </div> */}
        <div>
          <span className="font-medium">Cost:</span>
          <span className="ml-2 font-mono">${usage.cost.toFixed(6)}</span>
        </div>
      </div>
    </div>
  );
}; 