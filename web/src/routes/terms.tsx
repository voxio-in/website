import { createFileRoute, Link } from '@tanstack/react-router'

import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'

import '#/styles/legal.css'

/* These terms cover this website and its demos only. Everything about a paid
   engagement — scope, uptime, IP in what we build, indemnities — lives in the
   signed agreement for that engagement, and section "Paid work" says so rather
   than quietly implying these terms govern it. */
export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [
      { title: 'Terms of Service — Voxio Agents' },
      {
        name: 'description',
        content:
          'The terms for using voxio.in and its live demos: what the demos are, what you may not do with them, and what is and is not promised.',
      },
    ],
    links: [{ rel: 'canonical', href: 'https://voxio.in/terms' }],
  }),
  component: Terms,
})

function Terms() {
  useReveal()

  return (
    <div className="scroll">

      <div className="masthead rise">
        <span className="eyebrow">Legal</span>
        <h1>Terms of <em>Service</em>.</h1>
        <p className="section-lede">
          The rules for this website and the demos on it. A paid engagement is governed by its
          own signed agreement, not by this page.
        </p>
      </div>

      <section className="section">
        <div className="legal rise">
          <p className="legal-updated">Last updated 30 August 2026.</p>

          <h2>1. Who these terms are between</h2>

          <p>
            They are between you and Voxio Agents (&ldquo;we&rdquo;, &ldquo;us&rdquo;), and they
            apply to <strong>voxio.in</strong>, its pages, and the live demos it hosts. Using
            the site means you accept them. If you do not, please do not use it.
          </p>

          <h2>2. What the demos are</h2>

          <p>
            The calling, 3D avatar and website-navigation demos are illustrations. They run real
            agents on real infrastructure, which is the point of them, but they are configured
            to show what the product does &mdash; not to serve as a working system for your
            business.
          </p>

          <p>
            They may be changed, rate limited, or taken down at any time without notice. Nothing
            a demo says is advice, an offer, a quote, or a commitment on our part. Do not rely
            on a demo&rsquo;s output for any decision that matters.
          </p>

          <h2>3. Using them properly</h2>

          <p>You agree not to:</p>

          <ul>
            <li>
              Enter confidential information, personal data about other people, or anything you
              are not free to share, into a demo or the contact form.
            </li>
            <li>
              Use a demo to harass, deceive, or impersonate anyone, or for anything unlawful.
            </li>
            <li>
              Attempt to extract our prompts, models, or configuration, or to reverse engineer
              the service.
            </li>
            <li>
              Scrape, hammer, or otherwise place automated load on the site or its demos, or
              work around the rate limits.
            </li>
            <li>
              Give a phone number to the calling demo that is not yours or that you are not
              authorised to have called.
            </li>
          </ul>

          <p>
            That last one matters more than it looks. Asking a demo to call someone else is
            placing an unsolicited automated call in their name, and depending on where they
            are, that is illegal. We may suspend access for any of the above.
          </p>

          <h2>4. Your content</h2>

          <p>
            You keep ownership of what you say to a demo and what you write in the contact form.
            You give us permission to process it in order to run the conversation, show you the
            result, reply to you, and improve the service. How long we keep it and who else
            processes it are set out in the <Link to="/privacy">Privacy Policy</Link>.
          </p>

          <h2>5. Our content</h2>

          <p>
            The site, its copy, design, code, and the agents behind the demos are ours or our
            licensors&rsquo;. Customer names and logos on this site belong to those
            organisations and appear with their permission. You may link to and quote the site
            with attribution; you may not copy it wholesale or present it as your own.
          </p>

          <h2>6. Third-party services</h2>

          <p>
            The demos depend on speech, language model and telephony providers. Their
            availability is not in our control, and an outage on their side will take a demo
            with it.
          </p>

          <h2>7. No warranty</h2>

          <p>
            The site and the demos are provided <strong>as is</strong>. We do not warrant that
            they will be available, uninterrupted, error free, or that anything an agent says
            will be accurate. An agent can be wrong, and on a public demo it sometimes will be.
          </p>

          <h2>8. Limitation of liability</h2>

          <p>
            To the fullest extent the law allows, we are not liable for any indirect,
            incidental, or consequential loss, or for lost profits, revenue, data or goodwill,
            arising from your use of this site or its demos. Nothing here limits liability that
            cannot lawfully be limited, including for fraud or for death or personal injury
            caused by negligence.
          </p>

          <h2>9. Paid work</h2>

          <p>
            If we build and deploy an agent for you, that engagement is governed by the
            agreement we sign for it &mdash; covering scope, timelines, service levels,
            confidentiality, data protection, and who owns what. Where that agreement and this
            page disagree, that agreement wins.
          </p>

          <h2>10. Changes</h2>

          <p>
            We may update these terms. The date at the top says when we last did. Continuing to
            use the site after a change means you accept the updated version.
          </p>

          <h2>11. Governing law</h2>

          <p>
            These terms are governed by the laws of Singapore, and the courts of Singapore have
            exclusive jurisdiction over any dispute arising from them.
          </p>

          <h2>12. Contact</h2>

          <p>
            Anything about these terms goes through the{' '}
            <Link to="/contact">contact form</Link>.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
