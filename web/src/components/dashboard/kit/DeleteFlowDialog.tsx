// Confirming a flow delete (watermelon Dialog 3): what goes, what stays, and a
// box to tick before the red button works.

import { useState } from 'react'
import { TriangleAlertIcon } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/base-ui/alert-dialog'
import { Button } from '@/components/base-ui/button'
import { Checkbox } from '@/components/base-ui/checkbox'
import { Label } from '@/components/base-ui/label'

export function DeleteFlowDialog({ name, open, onOpenChange, onDelete }: {
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Resolves when the delete is done; the dialog stays open (and busy) until then. */
  onDelete: () => Promise<void>
}) {
  const [sure, setSure] = useState(false)
  const [busy, setBusy] = useState(false)

  const change = (o: boolean) => {
    if (busy) return
    if (!o) setSure(false)
    onOpenChange(o)
  }
  const confirm = async () => {
    setBusy(true)
    try { await onDelete() } finally { setBusy(false); setSure(false) }
  }

  return (
    <AlertDialog open={open} onOpenChange={change}>
      <AlertDialogContent className="border-border bg-popover rounded-2xl border p-7 shadow-xl sm:max-w-[440px]">
        <AlertDialogHeader className="place-items-start gap-2 text-left">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-[rgb(255_122_122/0.14)]">
            <TriangleAlertIcon className="text-destructive size-6" />
          </div>
          <AlertDialogTitle className="text-foreground text-[18px] font-semibold">Delete “{name}”?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-muted-foreground flex flex-col gap-4 text-[14.5px] leading-relaxed">
              <p>
                The flow stops working right away: its key is turned off and its phone numbers are freed.
                Its past sessions and logs are kept, marked “Flow deleted”.
              </p>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="delete-sure"
                  checked={sure}
                  onCheckedChange={(v) => setSure(v === true)}
                  className="border-input data-[state=checked]:border-destructive data-[state=checked]:bg-destructive size-5 rounded-md border data-[state=checked]:text-white"
                />
                <Label htmlFor="delete-sure" className="text-foreground cursor-pointer text-[14.5px] font-normal">
                  I understand this can’t be undone
                </Label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2 gap-2 sm:justify-end">
          <AlertDialogCancel disabled={busy} className="border-border bg-muted text-foreground hover:bg-accent h-10 rounded-xl border px-5">
            Cancel
          </AlertDialogCancel>
          <Button
            disabled={!sure || busy}
            onClick={confirm}
            className="bg-destructive hover:bg-destructive/90 h-10 rounded-xl px-6 font-semibold text-white shadow"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
