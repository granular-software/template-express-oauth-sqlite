import OpenAI from 'openai';

// Model provider types
export type ModelProvider = 'deepseek' | 'openai';

// Configuration interface
export interface ModelConfig {
  provider: ModelProvider;
  apiKey: string;
  baseURL?: string;
  modelName: string;
}

// Available configurations
const configurations: Record<string, ModelConfig> = {
  deepseek: {
    provider: 'deepseek',
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseURL: "https://api.deepseek.com",
    modelName: "deepseek-chat"
  },
  openai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY || "",
    modelName: "gpt-4.1"
  }
};

// Active configuration - change this to switch between providers
const activeConfig: string = 'openai';

// Export the active configuration
export const modelConfig: ModelConfig = configurations[activeConfig];

// Helper function to create an OpenAI client with the active configuration
export function createOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: modelConfig.apiKey,
    baseURL: modelConfig.baseURL
  });
}

// Helper function to get model name
export function getModelName(): string {
  return modelConfig.modelName;
} 