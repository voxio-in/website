// The pages the navigator demo can drive on /webnav.

export type SurfaceId = 'form' | 'university' | 'rail' | 'shop'

export type Surface = {
  id: SurfaceId
  label: string
  /** the job the visitor is asking the agent to do */
  task: string
  blurb: string
  asks: string[]
}

export const SURFACES: Surface[] = [
  {
    id: 'form',
    label: 'Contact us',
    task: 'Get in touch without filling it in',
    blurb:
      'Our own contact form, with the agent holding the pen. Tell it who you are and why you are here, and it writes the fields as you speak.',
    asks: [
      'Say your name and where you work.',
      'Tell it you are not sure which product you need.',
      'Ask it to read back what it has so far.',
    ],
  },
  {
    id: 'university',
    label: 'A university portal',
    task: 'Find the thing that is buried',
    blurb:
      'Four levels of menu, a table of circulars and a form that lives three clicks past where anyone looks. Ask for what you actually want and watch it dig.',
    asks: [
      'I need the re-evaluation form for last semester.',
      'When does the fee payment window close?',
      'Where do I get a bonafide certificate?',
    ],
  },
  {
    id: 'rail',
    label: 'A train booking',
    task: 'Book a ticket',
    blurb:
      'The government booking flow, faithfully: station codes, a quota dropdown, a results table, then passenger details. Say where you are going and it does the rest.',
    asks: [
      'Book me Delhi to Jaipur on the fourteenth.',
      'I want the earliest train, AC three tier.',
      'Add a passenger, twenty eight, male.',
    ],
  },
  {
    id: 'shop',
    label: 'A shop',
    task: 'Choose and add to cart',
    blurb:
      'Twenty four products and no idea which one. Describe what you need and the price you have in mind, and it picks, explains why, and puts it in the basket.',
    asks: [
      'I need running shoes under four thousand.',
      'Something for a two year old, not plastic.',
      'Add the cheapest one that is in stock.',
    ],
  },
]

export const DEFAULT_SURFACE: SurfaceId = 'university'

export function surfaceById(id: string): Surface {
  return SURFACES.find((s) => s.id === id) ?? SURFACES[0]!
}
