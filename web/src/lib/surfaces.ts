// The pages the navigator demo can drive on /webnav.

export type SurfaceId = 'clinic' | 'university' | 'rail' | 'shop'

export type Surface = {
  id: SurfaceId
  label: string
  /** the job the visitor is asking the agent to do */
  task: string
  /** the fake site's own name, shown on the frame */
  site: string
  /** what the address bar reads */
  host: string
  /** why this is hard, in our voice, said outside the frame */
  hard: string
  /** the fifteen-second dare, before the agent is allowed to help */
  dare: string
  blurb: string
  asks: string[]
}

export const SURFACES: Surface[] = [
  {
    id: 'clinic',
    label: 'A hospital portal',
    task: 'Get an appointment',
    site: 'Civil Hospital — Patient Services',
    host: 'hms.civilhospital.gov.in',
    hard:
      'A department list written for doctors, not patients. You have chest pain; the menu offers Cardiology, Cardiothoracic and Internal Medicine, and picking wrong costs you the slot.',
    dare: 'Try booking the first free cardiology slot this week.',
    blurb:
      'The appointment system every government hospital runs: a department list in medical language, a doctor list with no free slots, and a form that clears itself if you get one field wrong.',
    asks: [
      'My father has chest pain, earliest appointment please.',
      'Something this week, mornings only.',
      'He is sixty two, and he has the ABHA number.',
    ],
  },
  {
    id: 'university',
    label: 'A university portal',
    task: 'Find the thing that is buried',
    site: 'Meridian Institute of Technology',
    host: 'meridian.edu.in/student',
    hard:
      'The re-evaluation form is four levels down, filed under Examinations — not with the results, which is where everybody looks for it.',
    dare: 'Try to find the re-evaluation form yourself.',
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
    site: 'Passenger Reservation System',
    host: 'irctc-reservation.gov.in',
    hard:
      'Station codes, a quota dropdown nobody understands, and a date field that only takes one format. Nine fields before you can even see a train.',
    dare: 'Try booking Jaipur to Delhi on the twenty sixth.',
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
    site: 'bazaar.in',
    host: 'bazaar.in/footwear',
    hard:
      'Twenty four products, a sponsored row, three badges on every card and a filter rail that hides the one thing you asked for.',
    dare: 'Find running shoes under four thousand that are actually in stock.',
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
