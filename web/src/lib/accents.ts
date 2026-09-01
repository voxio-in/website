// The accent a demo runs in — one choice that moves both ears and voice.
//
// Picking an accent sets two things at once: which languages Soniox is told to
// expect, and which Deepgram voice answers. They are one control because they
// are one decision. A visitor who says "Indian" means "we will be speaking
// English and Hindi at you, and you should sound like you belong here", and
// getting one half without the other is the uncanny result — an agent that
// understands Hinglish and replies in Received Pronunciation.

export type AccentId = 'indian' | 'singaporean' | 'english' | 'japanese'

export type Accent = {
  id: AccentId
  label: string
  /** what the visitor can speak, in their words */
  note: string
  /** Soniox language hints. One entry means the hint is enforced strictly. */
  sttHints: readonly string[]
  /** the Deepgram voice that answers */
  ttsModel: string
}

/* English is alone in its list on purpose. A single hint is a fence rather
   than a preference — there is nothing else to hear, so holding the fence
   stops a stray word being decoded as another language. The other two must
   stay open: their whole premise is a speaker who switches mid-sentence, and
   a fence around the second language throws away the English half. */
export const ACCENTS: readonly Accent[] = [
  {
    id: 'indian',
    label: 'Indian',
    note: 'English and Hindi',
    sttHints: ['en', 'hi'],
    ttsModel: 'flux-naveen-en',
  },
  {
    id: 'singaporean',
    label: 'Singaporean',
    note: 'English, Singapore English and Mandarin',
    /* Singlish particles — lah, leh, meh, can or not — come back as English
       tokens and need no hint of their own. What the second hint is actually
       for is the Mandarin and Hokkien that a Singaporean speaker drops in a
       word at a time, which a fenced 'en' would mangle into nonsense English.
       Add 'ms' here if Malay turns up in testing; three hints dilute the
       first, so it is not on by default. */
    sttHints: ['en', 'zh'],
    /* PLACEHOLDER — shares Japanese's voice, which is the closest thing
       available rather than a match. Swap for a Singaporean render and
       nothing else in this file has to change. */
    ttsModel: 'flux-kai-en',
  },
  {
    id: 'english',
    label: 'English',
    note: 'English only',
    sttHints: ['en'],
    ttsModel: 'flux-cliff-en',
  },
  {
    id: 'japanese',
    label: 'Japanese',
    note: 'English and Japanese',
    sttHints: ['en', 'ja'],
    ttsModel: 'flux-kai-en',
  },
]

/* Indian, because it is what every deployment on this site runs in today and
   it is the one a visitor is most likely to have come to hear. */
export const DEFAULT_ACCENT: AccentId = 'indian'

export function accentById(id: string | undefined): Accent {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0]!
}
