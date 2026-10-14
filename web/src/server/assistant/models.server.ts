// The models the Assistant can run on, and one adapter per API style:
// Anthropic's Messages API, and the OpenAI-compatible chat API that
// OpenRouter and Groq speak. The loop only ever sees the internal format below.
// A model shows up only when its provider's key is set.

import type { ToolDef } from './tools.server'

export type Call = { id: string; name: string; input: Record<string, unknown> }
export type Msg =
  | { role: 'user'; content: string }
  | { role: 'assistant'; text: string; calls: Call[] }
  | { role: 'tool'; id: string; name: string; content: string }

/** input counts every prompt token sent; cached is the part the provider served from its prompt cache (billed far lower). */
export type Turn = { text: string; calls: Call[]; usage?: { input: number; output: number; cached?: number } }

type Provider = 'anthropic' | 'openrouter' | 'groq'
export type ModelInfo = { id: string; label: string; provider: Provider; model: string; note: string }

const KEYS: Record<Provider, string | undefined> = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
  groq: process.env.GROQ_API_KEY,
}

const ALL: ModelInfo[] = [
  // First available model is the default.
  { id: 'or-gemini-lite', label: 'Gemini 3.1 Flash Lite (OpenRouter)', provider: 'openrouter', model: 'google/gemini-3.1-flash-lite', note: 'Default · fast and cheap' },
  { id: 'claude-sonnet', label: 'Claude Sonnet 5.5', provider: 'anthropic', model: 'claude-sonnet-5-5', note: 'Careful, strong with tools' },
  { id: 'claude-opus', label: 'Claude Opus 5.5', provider: 'anthropic', model: 'claude-opus-5-5', note: 'Most capable, slower' },
  { id: 'claude-haiku', label: 'Claude Haiku 5.5', provider: 'anthropic', model: 'claude-haiku-5-5', note: 'Fast and light' },
  { id: 'or-claude', label: 'Claude Sonnet (OpenRouter)', provider: 'openrouter', model: 'anthropic/claude-sonnet-5', note: 'Via OpenRouter' },
  { id: 'or-gpt', label: 'GPT-5 mini (OpenRouter)', provider: 'openrouter', model: 'openai/gpt-5-mini', note: 'Balanced' },
  { id: 'or-gemini', label: 'Gemini 2.5 Flash (OpenRouter)', provider: 'openrouter', model: 'google/gemini-2.5-flash', note: 'Fast, long context' },
  { id: 'groq-oss', label: 'GPT-OSS 120B (Groq)', provider: 'groq', model: 'openai/gpt-oss-120b', note: 'Fastest' },
]

export const availableModels = () => ALL.filter((m) => KEYS[m.provider])
export const modelById = (id: string) => availableModels().find((m) => m.id === id) ?? availableModels()[0]

const MAX_OUT = 4096

/** One model turn: the reply text and any tool calls it wants made. */
export async function complete(m: ModelInfo, system: string, msgs: Msg[], tools: ToolDef[], signal?: AbortSignal): Promise<Turn> {
  return m.provider === 'anthropic' ? anthropic(m, system, msgs, tools, signal) : openaiLike(m, system, msgs, tools, signal)
}

// ------------------------------------------------------------------ Anthropic

/** Marks the end of the conversation so the next step reads everything up to here from the cache. */
function markLast(messages: { role: 'user' | 'assistant'; content: unknown }[]) {
  const last = messages[messages.length - 1]
  if (!last) return messages
  const blocks = typeof last.content === 'string' ? [{ type: 'text', text: last.content }] : (last.content as Record<string, unknown>[])
  if (!blocks.length) return messages
  const marked = [...blocks.slice(0, -1), { ...blocks[blocks.length - 1], cache_control: { type: 'ephemeral' } }]
  return [...messages.slice(0, -1), { ...last, content: marked }]
}

async function anthropic(m: ModelInfo, system: string, msgs: Msg[], tools: ToolDef[], signal?: AbortSignal): Promise<Turn> {
  // Consecutive tool results go back as one user message of tool_result blocks.
  const messages: { role: 'user' | 'assistant'; content: unknown }[] = []
  for (const x of msgs) {
    if (x.role === 'user') messages.push({ role: 'user', content: x.content })
    else if (x.role === 'assistant') messages.push({ role: 'assistant', content: [...(x.text ? [{ type: 'text', text: x.text }] : []), ...x.calls.map((c) => ({ type: 'tool_use', id: c.id, name: c.name, input: c.input }))] })
    else {
      const block = { type: 'tool_result', tool_use_id: x.id, content: x.content }
      const last = messages[messages.length - 1]
      if (last?.role === 'user' && Array.isArray(last.content)) (last.content as unknown[]).push(block)
      else messages.push({ role: 'user', content: [block] })
    }
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', 'x-api-key': KEYS.anthropic!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      // The system prompt and tools are the same on every step: cache them, and the conversation so far.
      model: m.model, max_tokens: MAX_OUT, system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }], messages: markLast(messages),
      tools: tools.map((t, i) => ({ name: t.name, description: t.description, input_schema: t.input, ...(i === tools.length - 1 ? { cache_control: { type: 'ephemeral' } } : {}) })),
    }),
  })
  if (!res.ok) throw new Error(`${m.label}: ${res.status} ${(await res.text()).slice(0, 300)}`)
  const j = (await res.json()) as { content: { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[]; usage?: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } }
  return {
    text: j.content.filter((b) => b.type === 'text').map((b) => b.text).join(''),
    calls: j.content.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id!, name: b.name!, input: b.input ?? {} })),
    usage: j.usage && { input: j.usage.input_tokens + (j.usage.cache_read_input_tokens ?? 0) + (j.usage.cache_creation_input_tokens ?? 0), output: j.usage.output_tokens, cached: j.usage.cache_read_input_tokens ?? 0 },
  }
}

// ------------------------------------------------------------------ OpenAI-compatible

const BASE: Record<'openrouter' | 'groq', string> = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
}

async function openaiLike(m: ModelInfo, system: string, msgs: Msg[], tools: ToolDef[], signal?: AbortSignal): Promise<Turn> {
  const messages: Record<string, unknown>[] = [{ role: 'system', content: system }]
  for (const x of msgs) {
    if (x.role === 'user') messages.push({ role: 'user', content: x.content })
    else if (x.role === 'assistant') messages.push({
      role: 'assistant', content: x.text || null,
      ...(x.calls.length ? { tool_calls: x.calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.input) } })) } : {}),
    })
    else messages.push({ role: 'tool', tool_call_id: x.id, content: x.content })
  }
  const provider = m.provider as 'openrouter' | 'groq'
  const res = await fetch(BASE[provider], {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEYS[provider]}`, ...(provider === 'openrouter' ? { 'X-Title': 'Voxio Assistant' } : {}) },
    body: JSON.stringify({
      model: m.model, max_tokens: MAX_OUT, messages,
      tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input } })),
    }),
  })
  if (!res.ok) throw new Error(`${m.label}: ${res.status} ${(await res.text()).slice(0, 300)}`)
  const j = (await res.json()) as { choices: { message: { content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[]; usage?: { prompt_tokens: number; completion_tokens: number; prompt_tokens_details?: { cached_tokens?: number } } }
  const msg = j.choices[0]?.message ?? {}
  return {
    text: msg.content ?? '',
    calls: (msg.tool_calls ?? []).map((c) => {
      let input: Record<string, unknown> = {}
      try { input = JSON.parse(c.function.arguments || '{}') } catch { /* model sent bad JSON: the tool reports it */ }
      return { id: c.id, name: c.function.name, input }
    }),
    usage: j.usage && { input: j.usage.prompt_tokens, output: j.usage.completion_tokens, cached: j.usage.prompt_tokens_details?.cached_tokens ?? 0 },
  }
}
