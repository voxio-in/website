// The desks you can ring from the /calling page.

export type DeskId = 'university' | 'school' | 'opd' | 'hotel'

export type Desk = {
  id: DeskId
  label: string
  role: string
  blurb: string
  orgLabel: string
  orgPlaceholder: string
  defaultBrand: string
  asks: string[]
}

export const DESKS: Desk[] = [
  {
    id: 'university',
    label: 'University',
    role: 'Admissions counsellor',
    blurb:
      'Inbound admissions. Course, fee and eligibility questions, in Hinglish or English — whichever you speak to it in.',
    orgLabel: 'Which university are you asking about?',
    orgPlaceholder: 'Singapore Institute of Technology',
    defaultBrand: 'NIMS University',
    asks: [
      'What are the fees for the BTech programme?',
      'Am I eligible with 72 percent?',
      'Kya hostel available hai?',
      'Cut in halfway through its answer — it stops.',
    ],
  },
  {
    id: 'school',
    label: 'School',
    role: 'Front office',
    blurb:
      'Admissions and parent enquiries for a school front office — timings, transport, fees, the forms nobody can find.',
    orgLabel: 'Which school are you asking about?',
    orgPlaceholder: 'Raffles Institution',
    defaultBrand: 'Greenwood School',
    asks: [
      'When do Class 6 admissions open?',
      'Is there a bus from Jayanagar?',
      'What documents do I bring to the interview?',
    ],
  },
  {
    id: 'opd',
    label: 'Hospital OPD',
    role: 'Patient simulation',
    blurb:
      'The other way round: it plays the patient, and you are the one being tested. It stays anxious, vague or stubborn until you handle it properly.',
    orgLabel: 'Which hospital or department?',
    orgPlaceholder: 'General medicine OPD',
    defaultBrand: 'City Hospital',
    asks: [
      'Ask it what brought it in today.',
      'Interrupt it — see what it does.',
      'Try to reassure it before you have the history.',
    ],
  },
  {
    id: 'hotel',
    label: 'Hotel',
    role: 'Front desk',
    blurb:
      'Reservations and guest requests at a front desk — availability, changes, the late checkout everyone asks for.',
    orgLabel: 'Which hotel are you asking about?',
    orgPlaceholder: 'The Oberoi, Bengaluru',
    defaultBrand: 'The Grand',
    asks: [
      'Do you have a room for two nights from Friday?',
      'Can I get a late checkout on Sunday?',
      'Change it to a twin room instead.',
    ],
  },
]

export const DEFAULT_DESK: DeskId = 'university'

export function deskById(id: string): Desk {
  return DESKS.find((d) => d.id === id) ?? DESKS[0]!
}
