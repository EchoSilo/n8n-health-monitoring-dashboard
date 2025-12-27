import { AIProvider, ErrorAnalysisContext, AIAnalysisResult } from './types';
import { getSystemPrompt, buildAnalysisPrompt, parseAnalysisResponse } from './prompts';

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
}

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  model: string;
  private apiKey: string;

  constructor(config: AnthropicConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-3-haiku-20240307';
  }

  async analyze(context: ErrorAnalysisContext): Promise<AIAnalysisResult> {
    const systemPrompt = getSystemPrompt();
    const userPrompt = buildAnalysisPrompt(context);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error('No response from Anthropic');
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
        tokenUsage: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      };
    }

    return {
      ...parsed,
      similarIssues: [],
      rawResponse: content,
      tokenUsage: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    };
  }
}
