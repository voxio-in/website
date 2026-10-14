// Table pagination (watermelon Pagination 15): rows per page on the left,
// "Showing 1–10 of 84" and the page buttons on the right. A long run of
// pages folds into "…" with a tooltip saying how many are hidden.

import { useId } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, EllipsisIcon } from 'lucide-react'

import { buttonVariants } from '@/components/base-ui/button'
import { Label } from '@/components/base-ui/label'
import { Pagination, PaginationContent, PaginationItem } from '@/components/base-ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/base-ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/base-ui/tooltip'
import { cn } from '@/lib/utils'

export type Paged = {
  page: number
  pages: number
  setPage: (p: number) => void
  perPage: number
  setPerPage: (n: number) => void
  from: number
  to: number
  total: number
}

const SIZES = [10, 25, 50]

/** Up to five page numbers around the current one, with gaps where pages are hidden. */
function window5(page: number, pages: number): (number | 'gap')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const start = Math.max(1, Math.min(page - 2, pages - 4))
  const run = Array.from({ length: 5 }, (_, i) => start + i)
  return [...(start > 1 ? ['gap' as const] : []), ...run, ...(start + 4 < pages ? ['gap' as const] : [])]
}

const iconBtn = 'size-9 rounded-xl border-none transition-all hover:bg-background active:scale-95 disabled:opacity-35'

function Btn({ to: p, page, pages, setPage, label, children, className, active }: {
  to: number; page: number; pages: number; setPage: (p: number) => void
  label: string; children: React.ReactNode; className?: string; active?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      disabled={p < 1 || p > pages || (p === page && !active)}
      onClick={() => setPage(p)}
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), iconBtn, className)}
    >
      {children}
    </button>
  )
}

export function Pager({ page, pages, setPage, perPage, setPerPage, from, to, total }: Paged) {
  const id = useId()
  if (total === 0) return null
  const sizes = SIZES.includes(perPage) ? SIZES : [...SIZES, perPage].sort((a, b) => a - b)
  const nums = window5(page, pages)

  const nav = { page, pages, setPage }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="border-border flex w-full flex-wrap items-center justify-between gap-4 border-t px-5 py-3.5 max-sm:flex-col max-sm:justify-center">
        <div className="border-border bg-muted flex shrink-0 items-center gap-3 rounded-xl border p-1">
          <Label htmlFor={id} className="text-muted-foreground pl-2 text-[11px] font-bold tracking-widest uppercase">Rows</Label>
          <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
            <SelectTrigger id={id} size="sm" className="bg-background h-7 w-[64px] rounded-lg border-none px-2 text-[13px] font-bold shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-popover rounded-xl shadow-2xl">
              {sizes.map((n) => <SelectItem key={n} value={String(n)} className="rounded-lg">{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-5 max-sm:flex-col max-sm:gap-3">
          <p className="text-muted-foreground text-[13.5px] font-semibold" aria-live="polite">
            Showing <span className="text-primary px-0.5 font-bold">{from}–{to}</span> of{' '}
            <span className="text-foreground px-0.5 font-bold">{total.toLocaleString()}</span>
          </p>
          {pages > 1 && (
            <Pagination className="mx-0 w-auto">
              <PaginationContent className="bg-muted gap-1 rounded-xl p-1 max-sm:flex-wrap max-sm:justify-center">
                <PaginationItem className="hidden sm:flex">
                  <Btn {...nav} to={1} label="First page" className="bg-background shadow-sm"><ChevronsLeftIcon className="size-4" /></Btn>
                </PaginationItem>
                <PaginationItem>
                  <Btn {...nav} to={page - 1} label="Previous page"><ChevronLeftIcon className="size-4" /></Btn>
                </PaginationItem>
                {nums.map((n, i) => n === 'gap' ? (
                  <PaginationItem key={`gap${i}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-muted-foreground flex size-9 items-center justify-center rounded-lg" tabIndex={0}>
                          <EllipsisIcon className="size-4 opacity-60" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="bg-foreground text-background rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase">
                        {i === 0 ? (nums[1] as number) - 1 : pages - (nums[i - 1] as number)} more pages
                      </TooltipContent>
                    </Tooltip>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={n}>
                    <Btn {...nav} to={n} label={`Page ${n}`} active={n === page}
                      className={cn('text-[13.5px] font-bold', n === page
                        ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground scale-105 shadow-md'
                        : 'hover:bg-background')}>
                      {n}
                    </Btn>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <Btn {...nav} to={page + 1} label="Next page"><ChevronRightIcon className="size-4" /></Btn>
                </PaginationItem>
                <PaginationItem className="hidden sm:flex">
                  <Btn {...nav} to={pages} label="Last page" className="bg-background shadow-sm"><ChevronsRightIcon className="size-4" /></Btn>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
