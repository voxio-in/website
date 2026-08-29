// The scripts for the other three desks.

import type { DeskId } from '#/lib/desks'
import { NIMC_BRAND_TOKEN, nimcGreeting, nimcSystemPrompt } from './admissionsPrompt'
import { md, render } from './prompts/render'
import sharedRules from './prompts/calling/shared-rules.md?raw'
import school from './prompts/calling/school.md?raw'
import opd from './prompts/calling/opd.md?raw'
import hotel from './prompts/calling/hotel.md?raw'

const SHARED_RULES = md(sharedRules)

const withRules = (template: string) =>
  render(md(template), { SHARED_RULES })

const SCRIPTS: Record<Exclude<DeskId, 'university'>, string> = {
  school: withRules(school),
  opd: withRules(opd),
  hotel: withRules(hotel),
}

const GREETINGS: Record<Exclude<DeskId, 'university'>, string> = {
  school: `Hello! {{BRAND}} front office, this is Priya. How can I help you today?`,
  opd: `Hello? Haan ji, main {{BRAND}} OPD ke liye baat kar raha hoon. Mujhe pet mein dard ho raha hai do din se.`,
  hotel: `Good evening! {{BRAND}}, front desk, Ravi speaking. How may I help you?`,
}

function fill(text: string, brand: string): string {
  return text.split(NIMC_BRAND_TOKEN).join(brand)
}

/** The system prompt for a desk, with the organisation name substituted in. */
export function systemPromptFor(desk: DeskId, brand: string): string {
  if (desk === 'university') return nimcSystemPrompt(brand)
  return fill(SCRIPTS[desk], brand)
}

/** The opening line for a desk, with the organisation name substituted in. */
export function greetingFor(desk: DeskId, brand: string): string {
  if (desk === 'university') return nimcGreeting(brand)
  return fill(GREETINGS[desk], brand)
}
