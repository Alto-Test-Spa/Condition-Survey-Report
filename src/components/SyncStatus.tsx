import Refresh from 'reicon-react/icons/Refresh'
import CloudCheck from 'reicon-react/icons/CloudCheck'
import CloudX from 'reicon-react/icons/CloudX'
import type { SyncState } from '../lib/api'

interface Config {
  label: string
  icon: typeof Refresh
  className: string
  spin?: boolean
}

const CONFIG: Partial<Record<SyncState, Config>> = {
  saving: { label: 'Guardando…', icon: Refresh, className: 'sync-status--saving', spin: true },
  saved: { label: 'Guardado en la nube', icon: CloudCheck, className: 'sync-status--saved' },
  offline: { label: 'Sin conexión — cambios no guardados', icon: CloudX, className: 'sync-status--offline' },
  error: { label: 'Error al guardar', icon: CloudX, className: 'sync-status--error' },
}

// 'idle' no muestra nada — es el estado antes del primer autoguardado, no hace falta
// avisar de algo que todavía no pasó.
export function SyncStatus({ state }: { state: SyncState }) {
  const cfg = CONFIG[state]
  if (!cfg) return null
  const Icon = cfg.icon
  return (
    <div className={`sync-status ${cfg.className} no-print`} title={cfg.label}>
      <Icon size={13} strokeWidth={2} className={`icon ${cfg.spin ? 'icon-spin' : ''}`} />
      {cfg.label}
    </div>
  )
}
