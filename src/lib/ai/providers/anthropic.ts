export async function chatAnthropic(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<{ content: string; model: string; inputTokens: number; outputTokens: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error: ${err}`)
  }

  const data = await res.json()
  return {
    content: data.content[0]?.text || '',
    model: data.model || 'claude-sonnet-4-6',
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  }
}
