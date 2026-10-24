// A page's ⋯ menu for developers, one level deeper: copy the page's settings as JSON.
// Used by Voice and Behaviour.

import { EllipsisIcon } from 'lucide-react'
import { useState } from 'react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/base-ui/popover'

/** The ⋯ button with one item: Copy settings as JSON (shows Copied). */
export function CopySettingsMenu({ settings }: { settings: unknown }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [root, setRoot] = useState<HTMLElement | null>(null)
  const copy = () => {
    void navigator.clipboard?.writeText(JSON.stringify(settings, null, 2))
    setDone(true)
    setTimeout(() => { setDone(false); setOpen(false) }, 900)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span ref={(el) => setRoot((r) => r ?? (el?.closest<HTMLElement>('.db') ?? null))}>
        <PopoverTrigger asChild>
          <button type="button" className="db-iconbtn" aria-label="More"><EllipsisIcon size={20} /></button>
        </PopoverTrigger>
      </span>
      <PopoverContent align="end" sideOffset={6} className="db-menu" container={root}>
        <button type="button" className="db-menu-item" onClick={copy}><span>{done ? 'Copied' : 'Copy settings as JSON'}</span></button>
      </PopoverContent>
    </Popover>
  )
}
