// Files attached to an Ask Voxio message: PDF, images and Word (.docx).
// Images and PDFs go to the model as they are (Gemini and Claude read both); a Word file
// is turned into text here first, since no model reads .docx. Files ride on the message
// they were attached to only: later turns keep just their names, so a big PDF isn't paid
// for again on every message.

export type Attachment = { name: string; kind: 'image' | 'pdf' | 'text'; mime: string; data: string }
export type Upload = { name?: unknown; mime?: unknown; data?: unknown }

export const MAX_FILES = 3
export const MAX_BYTES = 10 * 1024 * 1024
const MAX_TEXT = 60_000
const IMAGES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Checks and converts what the browser sent (base64 data). Throws with a reason the chat can show. */
export async function readUploads(list: unknown): Promise<Attachment[]> {
  if (!Array.isArray(list) || !list.length) return []
  if (list.length > MAX_FILES) throw new Error(`Attach up to ${MAX_FILES} files at a time.`)
  const out: Attachment[] = []
  for (const u of list as Upload[]) {
    const name = String(u.name ?? 'file').slice(0, 120)
    const data = String(u.data ?? '')
    const bytes = Math.floor((data.length * 3) / 4)
    if (!data || bytes > MAX_BYTES) throw new Error(`“${name}” is ${bytes ? 'over 10 MB' : 'empty'}.`)
    const mime = String(u.mime ?? '').toLowerCase()
    if (IMAGES.includes(mime)) out.push({ name, kind: 'image', mime, data })
    else if (mime === 'application/pdf') out.push({ name, kind: 'pdf', mime, data })
    else if (mime === DOCX || /\.docx$/i.test(name)) {
      const mammoth = await import('mammoth')
      const r = await mammoth.extractRawText({ buffer: Buffer.from(data, 'base64') }).catch(() => null)
      const text = (r?.value ?? '').trim()
      if (!text) throw new Error(`Couldn’t read any text in “${name}”. Is it a Word (.docx) file?`)
      out.push({ name, kind: 'text', mime: 'text/plain', data: text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}\n…[cut: the document goes on for ${text.length - MAX_TEXT} more characters]` : text })
    } else throw new Error(`“${name}” can’t be attached: PDF, images (PNG, JPEG, WebP, GIF) and Word (.docx) only.`)
  }
  return out
}

/** The user message as content blocks for an OpenAI-style API (OpenRouter). */
export function openaiParts(text: string, files: Attachment[]) {
  return [
    { type: 'text', text },
    ...files.map((f) => f.kind === 'image' ? { type: 'image_url', image_url: { url: `data:${f.mime};base64,${f.data}` } }
      : f.kind === 'pdf' ? { type: 'file', file: { filename: f.name, file_data: `data:application/pdf;base64,${f.data}` } }
      : { type: 'text', text: `Attached file “${f.name}” (Word document, as text):\n\n${f.data}` }),
  ]
}

/** The user message as content blocks for Anthropic's API. */
export function anthropicParts(text: string, files: Attachment[]) {
  return [
    ...files.map((f) => f.kind === 'image' ? { type: 'image', source: { type: 'base64', media_type: f.mime, data: f.data } }
      : f.kind === 'pdf' ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.data }, title: f.name }
      : { type: 'text', text: `Attached file “${f.name}” (Word document, as text):\n\n${f.data}` }),
    { type: 'text', text },
  ]
}
