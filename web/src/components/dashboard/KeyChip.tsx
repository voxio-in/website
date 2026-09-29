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
      <button className="db-iconbtn" onClick={() => setShown(!shown)} title={shown ? 'Hide' : 'Reveal'} aria-label={shown ? 'Hide key' : 'Reveal key'}>
        <Icon name={shown ? 'eyeOff' : 'eye'} size={18} />
      </button>
      <button className="db-iconbtn" title="Copy" aria-label="Copy key"
        onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>
        <Icon name={copied ? 'check' : 'copy'} size={18} />
      </button>
      <span className="db-keychip-rotate">
        <button className="db-iconbtn" onClick={() => setConfirm(!confirm)} title="Rotate" aria-label="Rotate key"><Icon name="rotate" size={18} /></button>
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
      </span>
    </div>
  )
}
