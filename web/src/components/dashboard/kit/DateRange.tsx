// A custom start and end, each a day and a time (watermelon Calendar 20 /
// DatePicker 12): the calendar button opens a card with a Starts row and an
// Ends row. A day opens the calendar, a time opens a clock face.
// Whole days (00:00 → 23:59) come back as plain dates, YYYY-MM-DD; anything
// narrower comes back as YYYY-MM-DDTHH:mm (see Range in ./ui).

import { useState } from 'react'
import { CalendarIcon, ChevronDownIcon, ClockIcon } from 'lucide-react'

import { Button } from '@/components/base-ui/button'
import { Calendar } from '@/components/base-ui/calendar'
import { Label } from '@/components/base-ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/base-ui/popover'
import { cn } from '@/lib/utils'
import { ClockPicker } from './ClockPicker'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const asDate = (s: string) => new Date(`${s}T00:00:00`)
const fmtDay = (s: string) => asDate(s).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
const fmtTime = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

type Point = { day: string; time: string }

const fieldBtn = 'border-border bg-background hover:bg-muted h-11 rounded-2xl border font-normal shadow-xs'

export function DateRangeButton({ from, to, active, onPick, value, earliest, cell }: {
  /** Drawn as the last cell of a connected group, reading "Custom" until a range is picked. */
  cell?: boolean
  /** First day with data; the calendar starts at its month. Defaults to a year ago. */
  earliest?: string
  from: Date
  to: Date
  /** A custom range is in use (the button shows it). */
  active: boolean
  /** Each end is YYYY-MM-DD, or YYYY-MM-DDTHH:mm when a time was chosen. */
  onPick: (from: string, to: string) => void
  /** The range as given, so a reopened card shows its times. */
  value?: { from: string; to: string }
}) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState<Point>({ day: iso(from), time: '00:00' })
  const [end, setEnd] = useState<Point>({ day: iso(to), time: '23:59' })
  const today = iso(new Date())
  const first = earliest ? new Date(earliest) : new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1)
  const startMonth = new Date(Math.min(first.getTime(), from.getTime()))
  const firstDay = iso(startMonth)

  const onOpen = (o: boolean) => {
    if (o) {
      const time = (s: string | undefined, dflt: string) => (s && s.length > 10 ? s.slice(11, 16) : dflt)
      setStart({ day: iso(from), time: time(active ? value?.from : undefined, '00:00') })
      setEnd({ day: iso(to), time: time(active ? value?.to : undefined, '23:59') })
    }
    setOpen(o)
  }

  const startKey = `${start.day}T${start.time}`
  const endKey = `${end.day}T${end.time}`
  const valid = startKey <= endKey
  const wholeDays = start.time === '00:00' && end.time === '23:59'
  const apply = () => {
    onPick(wholeDays ? start.day : startKey, wholeDays ? end.day : endKey)
    setOpen(false)
  }

  const label = active ? `${asDate(iso(from)).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${asDate(iso(to)).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : null

  return (
    <Popover open={open} onOpenChange={onOpen}>
      <PopoverTrigger asChild>
        {cell ? (
          <button type="button" className={`db-gbtn${active ? ' is-sel' : ''}`} aria-pressed={active} aria-label="Pick dates and times">
            <CalendarIcon size={17} />{label ?? 'Custom'}
          </button>
        ) : (
          <button type="button" className={`db-dr-btn${active ? ' is-on' : ''}${label ? '' : ' is-icon'}`} aria-label="Pick dates and times" title="Pick dates and times">
            <CalendarIcon size={17} />{label}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="border-border bg-popover w-[340px] rounded-[1.75rem] p-0 shadow-xl">
        <div className="border-border flex flex-col gap-1 border-b border-dashed px-5 pt-5 pb-4">
          <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">Custom range</span>
          <span className="text-foreground text-[15px] font-semibold">
            {fmtDay(start.day)}, {fmtTime(start.time)} → {fmtDay(end.day)}, {fmtTime(end.time)}
          </span>
        </div>
        <div className="flex flex-col gap-5 px-5 py-5">
          <Row label="Starts" point={start} onChange={setStart} startMonth={startMonth} disabled={(d) => iso(d) > today || iso(d) < firstDay} />
          <Row label="Ends" point={end} onChange={setEnd} startMonth={startMonth} disabled={(d) => iso(d) > today || iso(d) < start.day} />
          {!valid && <p className="text-destructive text-[13px]">The end is before the start.</p>}
        </div>
        {/* Cancel + Apply as one connected group. */}
        <div className="flex justify-end gap-0.5 px-5 pb-5" role="group">
          <Button variant="secondary" className="h-10 rounded-l-[20px] rounded-r-[8px] px-5" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-l-[8px] rounded-r-[20px] px-6 font-semibold" disabled={!valid} onClick={apply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Row({ label, point, onChange, disabled, startMonth }: {
  label: string
  startMonth: Date
  point: Point
  onChange: (p: Point) => void
  disabled: (d: Date) => boolean
}) {
  const [dayOpen, setDayOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-primary px-1 text-[13px] font-semibold">{label}</Label>
      {/* Date + time as one connected group. */}
      <div className="flex gap-0.5" role="group" aria-label={label}>
        <Popover open={dayOpen} onOpenChange={setDayOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" className={cn(fieldBtn, 'flex-1 justify-between rounded-l-[20px] rounded-r-[8px] border-0 bg-secondary px-4 text-[15px] shadow-none hover:bg-secondary/80')}>
              {fmtDay(point.day)}
              <ChevronDownIcon className="text-primary/80 size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="border-border bg-popover w-auto overflow-hidden rounded-2xl p-0 shadow-lg">
            <Calendar
              mode="single"
              selected={asDate(point.day)}
              defaultMonth={asDate(point.day)}
              captionLayout="dropdown"
              startMonth={startMonth}
              endMonth={new Date()}
              disabled={disabled}
              onSelect={(d) => { if (d) onChange({ ...point, day: iso(d) }); setDayOpen(false) }}
            />
          </PopoverContent>
        </Popover>
        <Popover open={timeOpen} onOpenChange={setTimeOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" className={cn(fieldBtn, 'w-[124px] justify-start gap-2 rounded-l-[8px] rounded-r-[20px] border-0 bg-secondary px-4 text-[15px] tabular-nums shadow-none hover:bg-secondary/80')}>
              <ClockIcon className="text-muted-foreground size-4" />
              {fmtTime(point.time)}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="border-border bg-popover w-auto rounded-[1.75rem] p-5 shadow-lg">
            <ClockPicker value={point.time} onChange={(time) => onChange({ ...point, time })} onDone={() => setTimeOpen(false)} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
