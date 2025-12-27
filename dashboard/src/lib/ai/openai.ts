import { AIProvider, ErrorAnalysisContext, AIAnalysisResult } from './types';
import { getSystemPrompt, buildAnalysisPrompt, parseAnalysisResponse } from './prompts';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  model: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-5-mini';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async analyze(context: ErrorAnalysisContext): Promise<AIAnalysisResult> {
    const systemPrompt = getSystemPrompt();
    const userPrompt = buildAnalysisPrompt(context);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = parseAnalysisResponse(content);

    if (!parsed) {
      // Return a fallback response if parsing fails
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
        tokenUsage: data.usage?.total_tokens,
      };
    }

    return {
      ...parsed,
      similarIssues: [], // Will be populated by the API endpoint from DB
      rawResponse: content,
      tokenUsage: data.usage?.total_tokens,
    };
  }
}
