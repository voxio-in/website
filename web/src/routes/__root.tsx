// The stylesheets are imported straight from the repo root rather than copied
// into web/. The static pages still read the same two files, so the design
// cannot drift between the two versions while the port runs.

import {
  HeadContent,
  Scripts,
  createRootRoute,
  Outlet,
} from '@tanstack/react-router'

import bundleCss from '#/styles/bundle.css?url'

import AuroraBackdrop from '#/components/AuroraBackdrop'
import BootVeil from '#/components/BootVeil'
import PerfTier from '#/components/PerfTier'
import RouteProgress from '#/components/RouteProgress'
import Navbar from '#/components/Navbar'
import PullToHome from '#/components/PullToHome'

// Where the site is served from. Link previews are fetched by a scraper with no
// page context, so og:image and og:url have to be absolute — a leading slash
// resolves against the scraper, not against us.
const SITE = 'https://voxio.in'

const FONTS =
  'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900&family=Instrument+Serif:ital@1&display=swap'

const LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#org`,
      name: 'Voxio Agents',
      /* The domain is short and two testimonials quote customers saying just
         "Voxio", so a machine reading this page sees both forms. alternateName
         is what tells it they are one company rather than two. */
      alternateName: ['Voxio', 'Voxio AI'],
      url: SITE,
      logo: `${SITE}/apple-touch-icon.png`,
      description:
        'Voice agents that hold a real conversation and work the system while they talk — on the phone, behind a 3D face, and driving a website.',
      areaServed: ['Singapore', 'India'],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#site`,
      url: SITE,
      name: 'Voxio Agents',
      alternateName: 'Voxio',
      publisher: { '@id': `${SITE}/#org` },
    },
  ],
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      /* The browser chrome on mobile picks this up, so the address bar sits in
         the same world as the page instead of a white band above it. */
      { name: 'theme-color', content: '#03171c' },
      /* The title names the category first and the products second, because
         the category is what anyone is searching for and the products are what
         separates us once they are looking. Kept under sixty characters so it
         survives a search result without being cut mid-word. */
      { title: 'Voxio Agents — Voice AI That Sells, Trains and Navigates' },
      {
        name: 'description',
        content:
          'Calling agents, 3D avatar agents and website navigation on one engine — voice AI that books and closes, trains your people, and drives the page while it talks.',
      },

      /* Open Graph and Twitter, which the site had none of. Without them Slack,
         WhatsApp, LinkedIn and X have nothing to read and fall back to whatever
         they scraped years ago — which is why the old "Voxio AI · Intelligent
         Chat & Voice Bots" line kept reappearing in previews long after it had
         left the code. Absolute URL on the image because every one of those
         scrapers fetches it out of context. */
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Voxio Agents' },
      { property: 'og:title', content: 'Voice agents that sell, train and drive the page.' },
      {
        property: 'og:description',
        content:
          'Calling agents, 3D avatar agents and website navigation on one engine — voice AI that books and closes, trains your people, and drives the page while it talks.',
      },
      { property: 'og:image', content: `${SITE}/assets/og-card.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'Voxio Agents — voice agents that sell, train and drive the page.' },
      { property: 'og:url', content: SITE },

      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Voice agents that sell, train and drive the page.' },
      {
        name: 'twitter:description',
        content:
          'A caller that books and closes, a 3D avatar that trains your people, and an agent that drives your website while it talks.',
      },
      { name: 'twitter:image', content: `${SITE}/assets/og-card.png` },
    ],
    links: [
      /* SVG first, so a browser that understands one takes it and never fetches
         the rasters. The 32px PNG and the .ico are for the engines that do not:
         the .ico last, because a few of them stop at the first icon they can
         parse and it is the worst-looking of the three. */
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
      /* "shortcut icon" rather than "alternate icon": browsers treat the two
         the same, but several SEO checkers only recognise the older keyword and
         report the site as having no favicon at all without it. */
      { rel: 'shortcut icon', href: '/favicon.ico', sizes: '48x48' },

      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      /* Fetched early but NOT render-blocking. As a plain stylesheet this was
         a third-party request standing between the browser and the first
         pixel, on a document that already has six local sheets to parse — it
         was most of a 3.3s first contentful paint. `as="style"` starts the
         download at the same moment it would have started anyway; the inline
         script below promotes it to a stylesheet once it lands. The swap it
         causes is the reason BootVeil exists, and BootVeil already waits on
         document.fonts.ready, so nothing flashes. */
      {
        rel: 'preload',
        as: 'style',
        href: FONTS,
        fetchpriority: 'high',
      },
      { rel: 'stylesheet', href: bundleCss },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Organization and WebSite, so a search engine has something to
            attach the name, the logo and the three products to rather than
            inferring them from the copy. Kept in the shell because a JSON-LD
            block is a <script>, which the route head's `links` cannot carry. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(LD) }}
        />
        {/* Paint the backdrop's ground before anything external can arrive. */}
        <style>{`html,body{background:#03171c;color:#fff}`}</style>
        {/* Turns the preloaded font sheet into a real stylesheet once it has
            arrived, and leaves a <noscript> copy for the crawlers and the
            handful of people with scripting off. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              `(function(){var l=document.querySelector('link[rel="preload"][as="style"]');` +
              `if(l){l.addEventListener('load',function(){l.rel='stylesheet'});` +
              `if(l.sheet)l.rel='stylesheet'}})()`,
          }}
        />
        <noscript>
          <link rel="stylesheet" href={FONTS} />
        </noscript>
      </head>
      <body>
        {/* Measures the browser and stands the costly effects down if it
            cannot hold frame rate. Must mount before anything animates. */}
        <PerfTier />
        <BootVeil />
        <RouteProgress />
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
