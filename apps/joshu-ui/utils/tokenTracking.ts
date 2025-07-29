import type { ChatCompletion } from 'openai/resources';
// import type { TokenUsage } from '../../os/types';

interface TokenUsage {
	input: number;
	output: number;
	cost: number;
}


// Define pricing per 1K tokens for different models
const PRICING = {
  'gpt-4-1106-preview': {
    input: 0.01,  // $0.01 per 1K input tokens
    output: 0.03  // $0.03 per 1K output tokens
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06
  },
  'gpt-3.5-turbo-1106': {
    input: 0.001,
    output: 0.002
  },
  'text-embedding-3-small': {
    input: 0.00002,
    output: 0.00002
  },
  'text-embedding-3-large': {
    input: 0.00013,
    output: 0.00013
  }
} as const;

export function extractTokenUsage(response: ChatCompletion): TokenUsage {
  const usage = response.usage;
  if (!usage) {
    return {
      input: 0,
      output: 0,
      // model: response.model,
      cost: 0
    };
  }

  const modelPricing = PRICING[response.model as keyof typeof PRICING] || {
    input: 0,
    output: 0
  };

  // Calculate costs
  const inputCost = (usage.prompt_tokens / 1000) * modelPricing.input;
  const outputCost = (usage.completion_tokens / 1000) * modelPricing.output;

  return {
    input: usage.prompt_tokens,
    output: usage.completion_tokens,
    // model: response.model,
    cost: inputCost + outputCost
  };
} 