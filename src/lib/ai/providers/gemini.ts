export async function chatGemini(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<{ content: string; model: string; inputTokens: number; outputTokens: number }> {
  throw new Error('Gemini provider no implementado todavía. Configura DERMO_AI_PROVIDER=anthropic')
}
