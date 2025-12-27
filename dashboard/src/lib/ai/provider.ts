import { AIProvider, AIProviderType } from './types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { OllamaProvider } from './ollama';

export interface GetAIProviderOptions {
  provider?: AIProviderType;
  model?: string;
}

/**
 * Get an AI provider based on environment configuration
 * Priority: explicit provider > OPENAI_API_KEY > ANTHROPIC_API_KEY > OLLAMA_BASE_URL
 */
export function getAIProvider(options: GetAIProviderOptions = {}): AIProvider {
  const { provider, model } = options;

  // If provider is explicitly specified, use that
  if (provider) {
    return createProvider(provider, model);
  }

  // Otherwise, auto-detect based on available API keys
  if (process.env.OPENAI_API_KEY) {
    return createProvider('openai', model);
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return createProvider('anthropic', model);
  }

  if (process.env.OLLAMA_BASE_URL) {
    return createProvider('ollama', model);
  }

  throw new Error(
    'No AI provider configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or OLLAMA_BASE_URL environment variable.'
  );
}

/**
 * Create a specific provider instance
 */
function createProvider(type: AIProviderType, model?: string): AIProvider {
  switch (type) {
    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required for OpenAI provider');
      }
      return new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        model: model || process.env.OPENAI_MODEL || 'gpt-5.2',
        baseUrl: process.env.OPENAI_BASE_URL,
      });

    case 'anthropic':
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required for Anthropic provider');
      }
      return new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: model || process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      });

    case 'ollama':
      return new OllamaProvider({
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: model || process.env.OLLAMA_MODEL || 'llama3.2',
      });

    default:
      throw new Error(`Unknown AI provider: ${type}`);
  }
}

/**
 * Check if any AI provider is configured
 */
export function isAIConfigured(): boolean {
  return !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OLLAMA_BASE_URL
  );
}

/**
 * Get the configured provider type
 */
export function getConfiguredProviderType(): AIProviderType | null {
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OLLAMA_BASE_URL) return 'ollama';
  return null;
}

// Re-export types and providers
export * from './types';
export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
export { OllamaProvider } from './ollama';
