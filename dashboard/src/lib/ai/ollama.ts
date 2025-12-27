import { AIProvider, ErrorAnalysisContext, AIAnalysisResult } from './types';
import { getSystemPrompt, buildAnalysisPrompt, parseAnalysisResponse } from './prompts';

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
}

export class OllamaProvider implements AIProvider {
  name = 'ollama';
  model: string;
  private baseUrl: string;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.model = config.model || 'llama3.2';
  }

  async analyze(context: ErrorAnalysisContext): Promise<AIAnalysisResult> {
    const systemPrompt = getSystemPrompt();
    const userPrompt = buildAnalysisPrompt(context);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
          options: {
            temperature: 0.3,
          },
        }),
      });
    } catch (err) {
      const error = err as Error;
      if (error.cause && (error.cause as { code?: string }).code === 'ECONNREFUSED') {
        throw new Error(
          `Ollama is not running. Start Ollama with 'ollama serve' or configure OPENAI_API_KEY/ANTHROPIC_API_KEY for cloud AI.`
        );
      }
      throw new Error(`Failed to connect to Ollama at ${this.baseUrl}: ${error.message}`);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.message?.content;

    if (!content) {
      throw new Error('No response from Ollama');
    }

    const parsed = parseAnalysisResponse(content);

    if (!parsed) {
      return {
        confidence: 50,
        rootCause: 'Unable to parse AI response. The error may require manual investigation.',
        suggestedFix: [
          'Review the error message and stack trace',
          'Check the node configuration',
          'Verify input data from previous nodes',
        ],
        similarIssues: [],
        rawResponse: content,
      };
    }

    return {
      ...parsed,
      similarIssues: [],
      rawResponse: content,
    };
  }
}
