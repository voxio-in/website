// A value with its copy button in a cell of its own, after Cult UI's Copy
// Button row: for install commands, keys and links.

import type { ReactNode } from 'react'

import { CopyButton } from '#/components/CodeBlock'
import { cn } from '#/lib/utils'

import '#/styles/copy-row.css'

export function CopyRow({ value, children, label, className }: {
  value: string
  /** What shows in the row; the value itself as code when left out. */
  children?: ReactNode
  /** A small label before the value, such as the package manager. */
  label?: string
  className?: string
}) {
  return (
    <div className={cn('cr', className)}>
      {label && <span className="cr-label">{label}</span>}
      <div className="cr-value">{children ?? <code>{value}</code>}</div>
      <div className="cr-action">
        <CopyButton value={value} className="cr-copy" />
      </div>
    </div>
  )
}
