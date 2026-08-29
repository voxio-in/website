// On a product one-pager: the other two surfaces, plus contact.

import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'

type Which = 'calling' | 'avatar' | 'webnav'

const PRODUCTS: Record<Which, { to: LinkProps['to']; kicker: string; title: string; body: string }> = {
  calling: {
    to: '/calling',
    kicker: 'On a call',
    title: 'Calling agents',
    body:
      'Inbound, outbound and scheduled calls on a real number, handled end to end — and the call ends with your records already updated.',
  },
  avatar: {
    to: '/avatar',
    kicker: 'With a face',
    title: '3D avatar agents',
    body:
      'A character that plays the difficult person and refuses to make it easy, then drops the act and tells them what they missed.',
  },
  webnav: {
    to: '/webnav',
    kicker: 'On the web',
    title: 'Website navigation',
    body:
      "It doesn't explain your software. It uses it — scrolling, opening, filling and submitting while it talks you through it.",
  },
}

const ORDER: Which[] = ['calling', 'avatar', 'webnav']

export default function ProductCross({ current }: { current: Which }) {
  const others = ORDER.filter((k) => k !== current)

  return (
    <section className="crosslinks">
      <p className="crosslinks-tag">The other two, and us</p>
      <div className="crosslinks-grid">
        {others.map((k) => {
          const p = PRODUCTS[k]
          return (
            <Link key={k} to={p.to} className="crosslink">
              <span className="crosslink-k">{p.kicker}</span>
              <span className="crosslink-t">{p.title}</span>
              <span className="crosslink-b">{p.body}</span>
              <span className="crosslink-go">See it &rarr;</span>
            </Link>
          )
        })}

        <Link to="/contact" className="crosslink crosslink--cta">
          <span className="crosslink-k">Talk to us</span>
          <span className="crosslink-t">Contact us</span>
          <span className="crosslink-b">
            Tell us the conversation your people struggle with. We will build it into an
            agent and let you talk to it.
          </span>
          <span className="crosslink-go">Start for free &rarr;</span>
        </Link>
      </div>
    </section>
  )
}
