// What the three ported roleplay graphs import.

export type VoiceSettings = {
  preFire?: boolean
  inactivityMessage?: string
  /** How long to leave a silence before nudging. Tan-san needs a long one:
      holding a pause is the move his scenario is built to reward, and an agent
      that fills it has answered the trainee's question for them. */
  inactivityPeriod?: number
  inactivityTimes?: number
  ttsModel?: string
  sttModel?: string
  sttLanguage?: string
}

export function buildVoiceCustoms(settings: VoiceSettings = {}) {
  const preFire = settings.preFire ?? true
  return {
    tts_id: { service: 'deepgram', model: settings.ttsModel ?? 'aura-2-thalia-en' },
    stt_id: {
      service: 'deepgram-streaming',
      'model-name': settings.sttModel ?? 'nova-3',
      language: settings.sttLanguage ?? 'en-IN',
    },
    'grain-voice': false,
    'grain-level': 0,
    'pre-fire': preFire,
    'pre-fire-config': preFire ? { min: 5, max: 5000, current: 10 } : {},
    inactivity: true,
    'inactivity-metadata': {
      'time-period': settings.inactivityPeriod ?? 1000,
      'max-times': settings.inactivityTimes ?? 3,
      'inactivity-type': 'static',
      message:
        settings.inactivityMessage ??
        'Are you still there? No rush — take your time and answer whenever you are ready.',
      'interruption-type': 'full',
      'interruption-metadata': {},
    },
  }
}

export const STT_SONIOX_EN = {
  service: 'soniox',
  'language-hints': ['en'],
  'language-hints-strict': true,
  'enable-speaker-diarization': true,
} as const

let webhookUrl = ''
export function setRoleplayWebhook(url: string) {
  webhookUrl = url
}
export function roleplayWebhook(): string {
  return webhookUrl
}
