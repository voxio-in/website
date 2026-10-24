// GET /api/voice-sample?service=deepgram&voice=aura-2-thalia-en — the short
// sample line for one voice, made by scripts/voice-samples.py with the voice
// backend's own TTS and kept in R2. Redirects to a signed (or public) link;
// 404 for a voice that has no sample yet.

import { createFileRoute } from '@tanstack/react-router'

import SAMPLES from '#/lib/dashboard/voice-samples.json'
import { playableUrl } from '#/server/r2.server'
import { currentUser } from '#/server/session.server'

const has = (service: string, voice: string) => ((SAMPLES as Record<string, string[]>)[service] ?? []).includes(voice)

export const Route = createFileRoute('/api/voice-sample')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await currentUser())) return new Response('Please log in again.', { status: 401 })
        const q = new URL(request.url).searchParams
        const service = q.get('service') ?? ''
        const voice = q.get('voice') ?? ''
        // Only names from the list the script wrote: nothing else in the bucket can be reached this way.
        if (!has(service, voice)) return new Response('No sample for this voice yet.', { status: 404 })
        const url = playableUrl(`samples/voices/${service}/${voice}.wav`)
        if (!url) return new Response('Samples are not set up.', { status: 503 })
        return Response.redirect(url, 302)
      },
    },
  },
})
