// How loud the agent is during a test call (watermelon Popover 4): a speaker
// button that opens a slider, with Mute and Maximum one tap away.

import { Volume1Icon, Volume2Icon, VolumeXIcon } from 'lucide-react'

import { Button } from '@/components/base-ui/button'
import { Label } from '@/components/base-ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/base-ui/popover'
import { Slider } from '@/components/base-ui/slider'

export function AgentVolume({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const Icon = value === 0 ? VolumeXIcon : value < 50 ? Volume1Icon : Volume2Icon
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={`db-btn db-btn-icon${value === 0 ? ' is-on' : ''}`} aria-label="Agent volume" title="Agent volume">
          <Icon size={16} />{value === 0 ? 'Agent muted' : 'Agent'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="border-border bg-popover w-80 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-foreground text-sm font-bold">Agent voice</Label>
              <p className="text-muted-foreground text-[12px] font-medium">Only on this screen; the call isn’t affected.</p>
            </div>
            <output className="text-primary text-xl font-bold tabular-nums">{value}%</output>
          </div>
          <div className="bg-muted flex items-center gap-4 rounded-xl p-3">
            <VolumeXIcon className="text-muted-foreground size-4 shrink-0 opacity-60" />
            <Slider
              value={[value]}
              max={100}
              step={1}
              onValueChange={([v]) => onChange(v)}
              aria-label="Agent volume"
              className="[&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-track]]:bg-border [&_[data-slot=slider-thumb]]:border-primary"
            />
            <Volume2Icon className="text-muted-foreground size-4 shrink-0 opacity-60" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="sm" className="border-border bg-background hover:bg-muted rounded-xl text-xs font-bold" onClick={() => onChange(0)}>Mute</Button>
            <Button variant="outline" size="sm" className="border-border bg-background hover:bg-muted rounded-xl text-xs font-bold" onClick={() => onChange(100)}>Maximum</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
