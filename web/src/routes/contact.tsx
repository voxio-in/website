// The form posts to the server and the enquiry is stored. It used to compose a
// mailto: draft instead, which depended on the visitor having a mail client and
// on the address in the link being live — and it was not, so the form looked
// like it worked and lost everything put into it. See server/contact.ts.

import { createFileRoute, Link } from '@tanstack/react-router'

import { useState } from 'react'

import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'
import { submitContact } from '#/server/contact'

import '#/styles/forms.css'
import '#/styles/contact.css'

export const Route = createFileRoute('/contact')({
  head: () => ({
    meta: [
      { title: 'Contact us — Voxio Agents' },
      { name: 'description', content: 'Describe the conversation your people find hardest and we will build it into an agent you can talk to. We reply with questions, not a deck.' },
    ],
    links: [{ rel: 'canonical', href: 'https://voxio.in/contact' }],
  }),
  component: Contact,
})

type Phase = 'idle' | 'sending' | 'sent' | 'failed'

function Contact() {
  useReveal()
  const [phase, setPhase] = useState<Phase>('idle')
  const [note, setNote] = useState('')

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    if (phase === 'sending') return

    const v = (id: string) =>
      (
        document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          '#' + id,
        )?.value || ''
      ).trim()

    setPhase('sending')
    setNote('')

    try {
      const res = await submitContact({
        data: {
          name: v('cf-name'),
          org: v('cf-org'),
          email: v('cf-email'),
          surface: v('cf-surface'),
          message: v('cf-msg'),
        },
      })
      if (res.ok) {
        setPhase('sent')
        return
      }
      setPhase('failed')
      setNote(res.reason)
    } catch {
      /* A network failure is the one case where the enquiry really is lost, so
         say so plainly rather than showing a confirmation we cannot stand behind. */
      setPhase('failed')
      setNote('That did not go through. Check your connection and try once more.')
    }
  }

  return (
    <>
      <div className="scroll contact-scroll">

        <div className="masthead rise">
          <span className="eyebrow">Contact us</span>
          <h1>Tell us the <em>hard conversation</em>.</h1>
          <p className="section-lede">
            Every deployment on this site started the same way &mdash; someone described a
            conversation their people were struggling with. Describe yours and we will build it
            into an agent you can talk to.
          </p>
        </div>

        <section className="section" id="form" style={{ paddingTop: "30px" }}>
          <div className="glass-panel rise">
            <div className="contact-grid">

              {/* The confirmation replaces the form rather than sitting under it.
                  A sent form left on screen invites a second submission, and the
                  one thing a person wants to know here is whether it went. */}
              {phase === 'sent' ? (
              <div className="contact-sent">
                <p className="contact-sent-head">That is with us.</p>
                <p className="contact-sent-body">
                  We read every one of these ourselves, and we reply with questions rather
                  than a deck. Expect to hear back within a couple of working days.
                </p>
                <p className="contact-sent-foot">
                  In the meantime the demos on this site are live &mdash;{' '}
                  <Link className="card-link" to="/avatar">talk to an avatar</Link> or{' '}
                  <Link className="card-link" to="/webnav">watch one drive a page</Link>.
                </p>
              </div>
              ) : (
              <form className="contact-form" id="contact-form" noValidate onSubmit={onSubmit}>
                <div className="field">
                  <label htmlFor="cf-name">Your name</label>
                  <input id="cf-name" name="name" type="text" autoComplete="name" required
                         placeholder="Jane Tan" />
                </div>

                <div className="field">
                  <label htmlFor="cf-org">Organisation</label>
                  <input id="cf-org" name="org" type="text" autoComplete="organization"
                         placeholder="Where you work" />
                </div>

                <div className="field">
                  <label htmlFor="cf-email">Work email</label>
                  <input id="cf-email" name="email" type="email" autoComplete="email" required
                         placeholder="you@company.com" />
                </div>

                <div className="field">
                  <label htmlFor="cf-surface">What are you looking at?</label>
                  <select id="cf-surface" name="surface">
                    <option value="Not sure yet">Not sure yet &mdash; help me pick</option>
                    <option value="3D avatar agents">3D avatar agents &mdash; training and practice</option>
                    <option value="Calling agents">Calling agents &mdash; inbound and outbound</option>
                    <option value="Website navigation">Website navigation &mdash; an agent that drives the page</option>
                  </select>
                </div>

                <div className="field field--wide">
                  <label htmlFor="cf-msg">The conversation you want handled</label>
                  <textarea id="cf-msg" name="message" rows={5}
                            placeholder="Who is talking to whom, and what makes it hard?"></textarea>
                </div>

                <div className="form-actions">
                  <button className="btn btn-solid" type="submit" disabled={phase === 'sending'}>
                    {phase === 'sending' ? 'Sending…' : 'Send it over'}
                  </button>
                  <span
                    className={`form-note${phase === 'failed' ? ' form-note--bad' : ''}`}
                    id="cf-note"
                    role="status"
                    aria-live="polite"
                  >
                    {note || 'Goes straight to us. We read every one.'}
                  </span>
                </div>
              </form>
              )}

              <aside className="contact-aside sheet">
                <div className="aside-block">
                  <span className="fact-k">How to reach us</span>
                  <p className="aside-body">
                    The form is the way in. It reaches us directly, and we answer from a
                    real address so you can just reply to us after that.
                  </p>
                </div>
                <div className="aside-block">
                  <span className="fact-k">Where we work</span>
                  <span className="fact-v">Singapore &middot; India</span>
                </div>
                <div className="aside-block">
                  <span className="fact-k">What happens next</span>
                  <p className="aside-body">
                    We reply with questions, not a deck. If the workflow is a fit we build a
                    working agent for it first &mdash; you talk to the thing itself before
                    anyone talks about price.
                  </p>
                </div>
                <div className="aside-block">
                  <span className="fact-k">Already running</span>
                  <p className="aside-body">
                    Singapore Institute of Technology, the Ministry of Social and Family
                    Development, Yellow Ribbon Singapore, VOXA and SilverWings XR.{' '}
                    <Link className="card-link" to="/work">See the work</Link>
                  </p>
                </div>
                <div className="aside-block">
                  <span className="fact-k">In development</span>
                  <p className="aside-body">
                    The Agency for Integrated Care, and a co-developed course with Acetek
                    College.
                  </p>
                </div>
              </aside>

            </div>
          </div>
        </section>
      <SiteFooter />

      </div>
    </>
  )
}
