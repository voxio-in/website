import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import PendingPage from './components/PendingPage'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    // A hover preload is reused for 30 s instead of fetching the page again on every hover.
    defaultPreloadStaleTime: 30_000,

    // Shown while a route resolves. defaultPendingMs holds it back so a fast
    // navigation never flashes a skeleton, and defaultPendingMinMs keeps it on
    // screen long enough to read as a state rather than a flicker.
    defaultPendingComponent: PendingPage,
    defaultPendingMs: 260,
    defaultPendingMinMs: 420,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
