import { useEffect, useState } from 'react'
import { getStoredAccessKey, setStoredAccessKey, clearStoredAccessKey, verifyAccessKey } from './lib/api'
import { AccessGate } from './components/AccessGate'
import ReportEditor from './ReportEditor'

export default function App() {
  const [authorized, setAuthorized] = useState(() => !!getStoredAccessKey())
  // Sin clave guardada no hay nada que verificar: arranca "no checking" directo, en vez
  // de pasar por el efecto sólo para volver a apagar el estado.
  const [checking, setChecking] = useState(() => !!getStoredAccessKey())

  // Al montar: si ya había una clave guardada, se confirma contra el Worker una sola
  // vez — puede haber sido revocada desde la última visita.
  useEffect(() => {
    const key = getStoredAccessKey()
    if (!key) return
    verifyAccessKey(key).then((ok) => {
      if (!ok) {
        clearStoredAccessKey()
        setAuthorized(false)
      }
      setChecking(false)
    })
  }, [])

  function handleAuthExpired() {
    clearStoredAccessKey()
    setAuthorized(false)
  }

  async function handleAccessSubmit(key: string): Promise<boolean> {
    const ok = await verifyAccessKey(key)
    if (ok) {
      setStoredAccessKey(key)
      setAuthorized(true)
    }
    return ok
  }

  if (checking) return <div className="boot-screen">Cargando…</div>
  if (!authorized) return <AccessGate onSubmit={handleAccessSubmit} />

  return <ReportEditor onAuthExpired={handleAuthExpired} />
}
