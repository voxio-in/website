// An API key as a lit chip: masked value, then reveal / copy / rotate icons.
// Rotate asks for confirmation in a small popover.

import { useState } from 'react'

import { maskKey } from '#/lib/dashboard/client'
import Icon from './Icon'

export default function KeyChip({ value, onRotate, label = 'API key' }: { value: string; onRotate: () => void; label?: string }) {
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="db-keychip">
      <span className="db-keychip-label"><Icon name="bolt" size={16} />{label}</span>
      <code>{shown ? value : maskKey(value)}</code>
      {/* Connected icon buttons; the hovered one widens to show its label. */}
      <span className="db-btngroup is-icons" role="group" aria-label={`${label} actions`}>
        <button className="db-gbtn" onClick={() => setShown(!shown)} aria-label={shown ? 'Hide key' : 'Reveal key'}>
          <Icon name={shown ? 'eyeOff' : 'eye'} size={18} /><span className="db-gbtn-label">{shown ? 'Hide' : 'Reveal'}</span>
        </button>
        <button className="db-gbtn" aria-label="Copy key"
          onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>
          <Icon name={copied ? 'check' : 'copy'} size={18} /><span className="db-gbtn-label">{copied ? 'Copied' : 'Copy'}</span>
        </button>
        <button className="db-gbtn" onClick={() => setConfirm(!confirm)} aria-label="Rotate key" aria-expanded={confirm}>
          <Icon name="rotate" size={18} /><span className="db-gbtn-label">Rotate</span>
        </button>
      </span>
      {confirm && (
        <span className="db-popover" role="dialog">
          <b>Issue a new key?</b>
          <span>The current key stops working straight away.</span>
          <span className="db-popover-actions">
            <button className="db-btn" onClick={() => setConfirm(false)}>Cancel</button>
            <button className="db-btn db-danger" onClick={() => { setConfirm(false); onRotate() }}>Rotate</button>
          </span>
        </span>
      )}
    </div>
  )
}
