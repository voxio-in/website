// The stylesheets are imported straight from the repo root rather than copied
// into web/. The static pages still read the same two files, so the design
// cannot drift between the two versions while the port runs.

import {
  HeadContent,
  Scripts,
  createRootRoute,
  Outlet,
} from '@tanstack/react-router'

import siteCss from '../../../site.css?url'
import navIconsCss from '../../../nav-icons.css?url'

import auroraCss from '#/styles/aurora.css?url'
import glyphsCss from '#/styles/glyphs.css?url'
import homeCss from '#/styles/home.css?url'

import AuroraBackdrop from '#/components/AuroraBackdrop'
import GlassDefs from '#/components/GlassDefs'
import Navbar from '#/components/Navbar'
import PullToHome from '#/components/PullToHome'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Voxio — Operational AI Infrastructure' },
      {
        name: 'description',
        content:
          'Voice agents that adapt to the room. On the phone, in the browser, and behind a face.',
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900&family=Instrument+Serif:ital@1&display=swap',
      },
      { rel: 'stylesheet', href: siteCss },
      { rel: 'stylesheet', href: navIconsCss },
      { rel: 'stylesheet', href: auroraCss },
      { rel: 'stylesheet', href: glyphsCss },
      { rel: 'stylesheet', href: homeCss },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Paint the backdrop's ground before anything external can arrive. */}
        <style>{`html,body{background:#03171c;color:#fff}`}</style>
      </head>
      <body>
        <GlassDefs />
        {/* The site background, for every route. Here rather than per page:
            the component was four chances for them to drift apart. */}
        <AuroraBackdrop />
        <div className="grain" aria-hidden="true" />
        <Navbar />
        {/* Deliberately pulling up at the top of any page goes back to the
            itself out on "/", where there is nothing above. */}
        <PullToHome />
        {/* TEMPORARY — applies the hero tuner's saved value on every route. */}
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
