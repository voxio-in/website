// There is no endpoint behind this yet. Rather than POST to nothing and show a
// fake "sent" state, the form composes a mail draft the sender can see and edit
// — the enquiry is never silently lost.

import { createFileRoute, Link } from '@tanstack/react-router'

import { useState } from 'react'

import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'

import '#/styles/forms.css'
import '#/styles/contact.css'

export const Route = createFileRoute('/contact')({
  head: () => ({ meta: [{ title: 'Contact us — Voxio' }] }),
  component: Contact,
})

function Contact() {
  useReveal()
  const [note, setNote] = useState('')

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    const v = (id: string) =>
      (document.querySelector<HTMLInputElement>('#' + id)?.value || '').trim()

    const subject = 'Voxio enquiry — ' + (v('cf-org') || v('cf-name') || 'website')
    const body = [
      'Name: ' + v('cf-name'),
      'Organisation: ' + (v('cf-org') || '—'),
      'Email: ' + v('cf-email'),
      'Interested in: ' + v('cf-surface'),
      '',
      v('cf-msg') || '(no detail given)',
    ].join('\n')

    window.location.href =
      'mailto:hello@voxio.ai?subject=' +
      encodeURIComponent(subject) +
      '&body=' +
      encodeURIComponent(body)

    setNote('Opening your mail app… if nothing happens, write to hello@voxio.ai.')
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

              {/* No backend is wired to this static site, so the form composes a mail
                   the enquiry. */}
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
                  <button className="btn btn-solid" type="submit">Send it over</button>
                  <span className="form-note" id="cf-note" role="status" aria-live="polite">
                    {note || 'Opens in your mail app, addressed to hello@voxio.ai.'}
                  </span>
                </div>
              </form>

              <aside className="contact-aside sheet">
                <div className="aside-block">
                  <span className="fact-k">Email</span>
                  <a className="card-link" href="mailto:hello@voxio.ai">hello@voxio.ai</a>
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
                    Development, the Ministry of Health, the Singapore Prison Service, VOXA and
                    SilverWings XR. <Link className="card-link" to="/work">See the work</Link>
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
