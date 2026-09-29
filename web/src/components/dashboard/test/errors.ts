// Plain words for every error a test session can hit. Kept free of SDK imports
// so the Test page can use it without loading @voxio/client on the server.

const MESSAGES: Record<string, string> = {
  'mic-denied': 'Allow the microphone in your browser to talk to it.',
  'no-device': 'No microphone found.',
  'insecure-context': 'Testing needs https (or localhost).',
  unsupported: 'This browser can’t make voice calls. Try Chrome, Edge or Safari.',
  auth: 'The voice server didn’t accept this flow. Check that it’s connected.',
  rejected: 'The voice server didn’t accept this flow. Check that it’s connected.',
  network: 'The connection dropped. Try again.',
  'connection-lost': 'The connection dropped. Try again.',
}

export function testErrorText(e: { code?: string; message?: string; status?: number } | null | undefined): string {
  if (!e) return ''
  // A 5xx is the voice server failing to build the call, usually because the
  // flow is missing a piece (no listening setup, no workflow), not the network.
  if (e.status && e.status >= 500) return 'The voice server couldn’t start this flow. Check that its voice and workflow are set up, then try again.'
  return (e.code && MESSAGES[e.code]) || e.message || 'Something went wrong. Try again.'
}
