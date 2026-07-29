import { DERMO_SYSTEM_PROMPT } from './prompts/dermoSystemPrompt'
import { chatAnthropic } from './providers/anthropic'
import { sql } from '@/lib/db'

type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'openrouter'

interface ChatRequest {
  query: string
  productContext?: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}

interface ChatResponse {
  content: string
  model: string
  inputTokens: number
  outputTokens: number
}

async function getAIProvider(): Promise<{
  chat: typeof chatAnthropic
  name: string
}> {
  const provider = (process.env.DERMO_AI_PROVIDER || 'anthropic') as AIProvider

  switch (provider) {
    case 'anthropic':
      return { chat: chatAnthropic, name: 'anthropic' }
    case 'openai':
      const { chatOpenAI } = await import('./providers/openai')
      return { chat: chatOpenAI, name: 'openai' }
    case 'gemini':
      const { chatGemini } = await import('./providers/gemini')
      return { chat: chatGemini, name: 'gemini' }
    default:
      return { chat: chatAnthropic, name: 'anthropic' }
  }
}

export async function dermoChat(request: ChatRequest, userEmail: string): Promise<ChatResponse> {
  const { chat: providerChat, name: providerName } = await getAIProvider()

  const systemPrompt = request.productContext
    ? `${DERMO_SYSTEM_PROMPT}\n\nContexto del producto:\n${request.productContext}`
    : DERMO_SYSTEM_PROMPT

  const messages = [
    ...(request.history || []),
    { role: 'user' as const, content: request.query },
  ]

  const result = await providerChat(systemPrompt, messages)

  // Log usage
  try {
    await sql`
      INSERT INTO ai_usage_logs (user_email, endpoint, input_tokens, output_tokens, cost, model)
      VALUES (${userEmail}, 'dermo_chat', ${result.inputTokens}, ${result.outputTokens},
        ROUND(((${result.inputTokens} * 0.000003) + (${result.outputTokens} * 0.000015))::numeric, 6),
        ${result.model})
    `
  } catch {
    // Non-critical, continue
  }

  return result
}
