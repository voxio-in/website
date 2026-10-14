// The dashboard's breadcrumb: watermelon's Breadcrumb 1 (a pill of links),
// with router Links so moving between pages stays client-side.

import { Fragment } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/base-ui/breadcrumb'

export type Crumb = { label: string; to?: string; params?: Record<string, string> }

export function Crumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="border-border bg-background flex-nowrap rounded-full border px-3 py-1.5 text-[14px] shadow-sm">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            <BreadcrumbItem className="min-w-0">
              {c.to ? (
                <BreadcrumbLink asChild className="truncate">
                  <Link to={c.to} params={c.params as never}>{c.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate font-semibold">{c.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {i < crumbs.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
