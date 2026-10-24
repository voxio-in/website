// Playable links for session recordings and face previews in Cloudflare R2,
// and uploads into it (face previews). R2 has no egress fees, so the browser
// loads these straight from Cloudflare.
//
// The bucket is private, so the URLs the voice server saves don't open in a
// browser. With R2_PUBLIC_BASE_URL set they are rewritten onto that domain;
// otherwise each is signed (S3 SigV4 query auth) for an hour. Signed links
// expire, so sign on read and never store the result.

import { createHash, createHmac } from 'node:crypto'

const ACCOUNT = process.env.R2_ACCOUNT_ID || ''
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || ''
const SECRET = process.env.R2_SECRET_ACCESS_KEY || ''
const BUCKET = process.env.R2_BUCKET || ''
const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/+$/, '')

const EXPIRES = 3600

/** The object key a saved URL or key points at (`sessions/…`, `previews/…` or `samples/…`), or null if it isn't ours. */
function keyOf(url: string): string | null {
  const m = /(?:^|\/)((?:sessions|previews|samples)\/.*)$/.exec(url.split('?')[0])
  return m ? decodeURIComponent(m[1]) : null
}

export const r2Ready = () => !!(ACCOUNT && ACCESS_KEY && SECRET && BUCKET)

/** Upload one object; the payload is left unsigned, which R2 accepts over HTTPS. */
export async function putObject(key: string, body: ArrayBuffer | Uint8Array, contentType: string): Promise<void> {
  if (!r2Ready()) throw new Error('R2 is not set up (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET).')
  const host = `${ACCOUNT}.r2.cloudflarestorage.com`
  const path = `/${BUCKET}/${key.split('/').map(enc).join('/')}`
  const now = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')
  const day = now.slice(0, 8)
  const scope = `${day}/auto/s3/aws4_request`
  const headers: Record<string, string> = { 'content-type': contentType, host, 'x-amz-content-sha256': 'UNSIGNED-PAYLOAD', 'x-amz-date': now }
  const names = Object.keys(headers).sort()
  const request = ['PUT', path, '', names.map((n) => `${n}:${headers[n]}\n`).join(''), names.join(';'), 'UNSIGNED-PAYLOAD'].join('\n')
  const toSign = ['AWS4-HMAC-SHA256', now, scope, sha(request)].join('\n')
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${SECRET}`, day), 'auto'), 's3'), 'aws4_request')
  const signature = createHmac('sha256', signingKey).update(toSign).digest('hex')
  const { host: _h, ...send } = headers
  const res = await fetch(`https://${host}${path}`, {
    method: 'PUT', body: body as BodyInit,
    headers: { ...send, authorization: `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}` },
  })
  if (!res.ok) throw new Error(`R2 upload failed: ${res.status} ${(await res.text()).slice(0, 200)}`)
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const hmac = (k: Buffer | string, s: string) => createHmac('sha256', k).update(s).digest()
// RFC 3986, which SigV4 needs: encodeURIComponent leaves !'()* alone.
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

/** A link the browser can play, or the URL as given when it isn't in our bucket or R2 isn't set up. */
export function playableUrl(url: string | undefined): string | undefined {
  if (!url) return url
  const key = keyOf(url)
  if (!key) return url
  if (PUBLIC_BASE) return `${PUBLIC_BASE}/${key.split('/').map(enc).join('/')}`
  if (!ACCOUNT || !ACCESS_KEY || !SECRET || !BUCKET) return url

  const host = `${ACCOUNT}.r2.cloudflarestorage.com`
  const path = `/${BUCKET}/${key.split('/').map(enc).join('/')}`
  const now = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')
  const day = now.slice(0, 8)
  const scope = `${day}/auto/s3/aws4_request`
  const query = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${ACCESS_KEY}/${scope}`],
    ['X-Amz-Date', now],
    ['X-Amz-Expires', String(EXPIRES)],
    ['X-Amz-SignedHeaders', 'host'],
  ].map(([k, v]) => `${enc(k)}=${enc(v)}`).sort().join('&')
  const request = ['GET', path, query, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n')
  const toSign = ['AWS4-HMAC-SHA256', now, scope, sha(request)].join('\n')
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${SECRET}`, day), 'auto'), 's3'), 'aws4_request')
  const signature = createHmac('sha256', signingKey).update(toSign).digest('hex')
  return `https://${host}${path}?${query}&X-Amz-Signature=${signature}`
}
