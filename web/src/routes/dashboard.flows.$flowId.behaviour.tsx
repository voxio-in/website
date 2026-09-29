import { createFileRoute } from '@tanstack/react-router'

import { CopyJson } from '#/components/dashboard/controls'
import { KnobList } from '#/components/dashboard/KnobInput'
import { SaveBar, useDraft } from '#/components/dashboard/ui'
import { BEHAVIOUR_GROUPS, knobsIn } from '#/lib/dashboard/knobs'
import type { FlowDoc } from '#/lib/dashboard/types'

export const Route = createFileRoute('/dashboard/flows/$flowId/behaviour')({
  component: Behaviour,
})

const TITLES: Record<(typeof BEHAVIOUR_GROUPS)[number], string> = {
  Pipeline: 'Conversation',
  'Turn-taking': 'Turn-taking',
  Inactivity: 'Silence',
}

function Behaviour() {
  const keys = BEHAVIOUR_GROUPS.flatMap((g) => knobsIn(g).map((k) => k.key)) as (keyof FlowDoc)[]
  const { draft, set, dirty, commit, reset, status } = useDraft(keys)
  const values = draft as Record<string, unknown>

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Behaviour</h1>
          <p className="db-sub">How your agent takes turns and handles silence.</p>
        </div>
      </header>
      <div className="db-settings">
        {BEHAVIOUR_GROUPS.map((g) => {
          const knobs = knobsIn(g)
          const snapshot = Object.fromEntries(knobs.map((k) => [k.key, values[k.key] ?? k.default]))
          return (
            <section key={g} className="db-setcard">
              <div className="db-setcard-head">
                <h2 className="db-h2">{TITLES[g]}</h2>
                <CopyJson value={snapshot} />
              </div>
              <KnobList knobs={knobs} values={values} onChange={(k, v) => set(k as keyof FlowDoc, v as never)} />
            </section>
          )
        })}
      </div>
      <SaveBar dirty={dirty} status={status} onSave={commit} onReset={reset} />
    </div>
  )
}
