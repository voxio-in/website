// The calling product site is its own little site under /calling, with its own
// nav (the Navbar switches on the path). This layout only holds the section
// together — every page under it renders through the outlet.

import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/calling')({ component: CallingLayout })

function CallingLayout() {
  return <Outlet />
}
