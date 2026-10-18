import React, { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  const dialog = useRef(null)
  const cancelButton = useRef(null)
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  useEffect(() => {
    const previouslyFocused = document.activeElement
    cancelButton.current?.focus()
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        onCancelRef.current()
        return
      }
      if (event.key === 'Tab') {
        const buttons = dialog.current.querySelectorAll('button')
        const firstButton = buttons[0]
        const lastButton = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === firstButton) {
          event.preventDefault()
          lastButton.focus()
        } else if (!event.shiftKey && document.activeElement === lastButton) {
          event.preventDefault()
          firstButton.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [])

  return <div className="confirm-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onCancel() }}>
    <section ref={dialog} className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
      <button type="button" className="confirm-dialog-close" aria-label="Close confirmation" onClick={onCancel}><X size={17}/></button>
      <span className="confirm-dialog-icon"><AlertTriangle size={22}/></span>
      <h2 id="confirm-dialog-title">{title}</h2>
      <p id="confirm-dialog-message">{message}</p>
      <div className="confirm-dialog-actions">
        <button ref={cancelButton} type="button" className="confirm-dialog-cancel" onClick={onCancel}>Cancel</button>
        <button type="button" className="confirm-dialog-confirm" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </section>
  </div>
}
