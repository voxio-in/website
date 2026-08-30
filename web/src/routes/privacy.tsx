import { createFileRoute, Link } from '@tanstack/react-router'

import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'

import '#/styles/legal.css'

/* Written against what the code actually stores rather than from a template.
   The three Prisma models — ContactSubmission, CallRequest and RoomSession —
   are the whole of it, and the table below is a straight reading of their
   columns. If a model gains a field, this page is the other place to change. */
export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: 'Privacy Policy — Voxio Agents' },
      {
        name: 'description',
        content:
          'What Voxio Agents collects when you use this site or one of the live demos, why we keep it, how long for, and how to have it deleted.',
      },
    ],
    links: [{ rel: 'canonical', href: 'https://voxio.in/privacy' }],
  }),
  component: Privacy,
})

function Privacy() {
  useReveal()

  return (
    <div className="scroll">

      <div className="masthead rise">
        <span className="eyebrow">Legal</span>
        <h1>Privacy <em>Policy</em>.</h1>
        <p className="section-lede">
          This site runs live demos, so it records more than a brochure would. Everything
          it keeps is listed below, in the order you would meet it.
        </p>
      </div>

      <section className="section">
        <div className="legal rise">
          <p className="legal-updated">Last updated 30 August 2026.</p>

          <p>
            Voxio Agents (&ldquo;we&rdquo;, &ldquo;us&rdquo;) builds voice and conversational
            agents. This policy covers <strong>voxio.in</strong> and the demos on it. It does
            not cover agents we have built and deployed for a customer &mdash; when you speak
            to one of those, the customer operating it is the controller of that conversation
            and their own policy applies.
          </p>

          <h2>What we collect</h2>

          <div className="legal-scroll">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>What</th>
                  <th>When</th>
                  <th>Why</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Name, work email, organisation, the product you picked, and your message</td>
                  <td>You submit the contact form</td>
                  <td>To reply to you</td>
                </tr>
                <tr>
                  <td>Phone number</td>
                  <td>You ask a calling demo to ring you</td>
                  <td>To place that one call</td>
                </tr>
                <tr>
                  <td>Transcript of the demo conversation, its duration, and the scored outcome</td>
                  <td>You run a calling, avatar or navigation demo</td>
                  <td>To show you the result, and to debug the agent</td>
                </tr>
                <tr>
                  <td>IP address and browser user-agent</td>
                  <td>Any of the above</td>
                  <td>Rate limiting and abuse prevention only</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            That is the complete list. There is no analytics script, no advertising pixel, no
            session recorder and no third-party tracker on this site. We set no cookies for
            tracking, which is why you have never seen a consent banner here.
          </p>

          <h2>Demo audio</h2>

          <p>
            A demo needs your microphone to work. The audio is streamed to the voice service
            that runs the agent and is processed to produce the transcript you see in the
            room. <strong>We do not store the audio.</strong> What is written to our database
            is the text transcript, the duration, and the scene beats the roleplay produced.
          </p>

          <p>
            Do not put anything confidential into a demo. It is a public sandbox on a marketing
            site, not a deployed system with your access controls around it.
          </p>

          <h2>How long we keep it</h2>

          <ul>
            <li>
              <strong>Contact submissions</strong> &mdash; for as long as the conversation is
              live, and up to 24 months afterwards so we can pick a thread back up.
            </li>
            <li>
              <strong>Demo sessions and transcripts</strong> &mdash; 90 days, then deleted.
            </li>
            <li>
              <strong>IP addresses</strong> &mdash; kept with the record they belong to and
              deleted with it.
            </li>
          </ul>

          <h2>Who else sees it</h2>

          <p>
            We do not sell personal data and we do not share it for advertising. It reaches
            three kinds of third party, all of them acting on our instructions:
          </p>

          <ul>
            <li>The hosting and database providers that run this site.</li>
            <li>
              The speech and language model providers that make an agent able to hear and
              answer. A demo conversation is processed by them in order to happen at all.
            </li>
            <li>The telephony provider that places a call when you ask a demo to ring you.</li>
          </ul>

          <p>
            We may also disclose information where the law requires it. Where a provider is
            outside your country, the transfer is covered by the standard contractual
            protections in our agreement with them.
          </p>

          <h2>Your rights</h2>

          <p>
            Depending on where you live &mdash; including under Singapore&rsquo;s PDPA,
            India&rsquo;s DPDP Act and the GDPR &mdash; you can ask us for a copy of what we
            hold about you, ask us to correct it, ask us to delete it, or withdraw consent you
            have given.
          </p>

          <p>
            Ask through the <Link to="/contact">contact form</Link> and say what you want done.
            We will respond within 30 days. We will need enough to be sure the request is
            yours, which for a contact submission usually means sending it from the same email
            address.
          </p>

          <h2>Children</h2>

          <p>
            This site is for businesses and institutions. It is not directed at children and we
            do not knowingly collect data from anyone under 16.
          </p>

          <h2>Security</h2>

          <p>
            The site is served over HTTPS, the database is not publicly reachable, and access
            to it is limited to the people who operate the service. No system is perfect; if
            you find a problem, tell us through the contact form and we will treat it as
            urgent.
          </p>

          <h2>Changes</h2>

          <p>
            If we change this policy we will change the date at the top. Where the change is
            material and we hold your email because you contacted us, we will tell you.
          </p>

          <h2>Contact</h2>

          <p>
            Questions about this policy, or a request about your data, go through the{' '}
            <Link to="/contact">contact form</Link>. We operate from Singapore and India.
          </p>

          <p>
            See also our <Link to="/terms">Terms of Service</Link>.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
