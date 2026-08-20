import { useState } from 'react'
import type { FormEvent } from 'react'
import LockCircle from 'reicon-react/icons/LockCircle'
import { Wordmark } from './Wordmark'

interface Props {
  onSubmit: (key: string) => Promise<boolean>
}

// Portón de acceso: clave compartida del equipo, no una cuenta por persona (ver
// CLAUDE.md, "Acceso"). Se muestra al arrancar sin clave guardada, o si el Worker
// rechaza la que había (revocada, mal tipeada la primera vez).
export function AccessGate({ onSubmit }: Props) {
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!key.trim() || busy) return
    setBusy(true)
    setError('')
    const ok = await onSubmit(key.trim())
    setBusy(false)
    if (!ok) setError('Clave incorrecta, o no hay conexión con el servidor.')
  }

  return (
    <div className="access-gate">
      <form className="access-gate-card" onSubmit={handleSubmit}>
        <Wordmark tone="signal" textClassName="text-[17px] text-paper" />
        <p className="access-gate-title">
          <LockCircle size={16} strokeWidth={1.8} className="icon" />
          Clave de acceso del equipo
        </p>
        <p className="access-gate-hint">
          Los informes se guardan en el servidor de Alto Test, no en este navegador.
          Pídele la clave a quien administre el equipo si no la tienes.
        </p>
        <input
          className="access-gate-input"
          type="password"
          autoFocus
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Clave de acceso"
        />
        {error && <p className="access-gate-error">{error}</p>}
        <button type="submit" className="toolbar-btn" disabled={busy}>
          {busy ? 'Verificando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
