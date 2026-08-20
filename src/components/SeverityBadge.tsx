import type { Severity } from '../types'
import { SEVERITY_LEVELS } from '../types'

interface Props {
  value: Severity
  onChange: (value: Severity) => void
}

const SEVERITY_CLASS: Record<Severity, string> = {
  critical: 'severity-badge severity-critical',
  needs_action: 'severity-badge severity-needs-action',
  observation: 'severity-badge severity-observation',
  compliant: 'severity-badge severity-compliant',
}

// Selector que rota entre los 4 niveles al hacer clic — no es un <select> para no romper
// la estética plana del documento con un control de formulario nativo.
export function SeverityBadge({ value, onChange }: Props) {
  const index = SEVERITY_LEVELS.findIndex((s) => s.value === value)
  const label = SEVERITY_LEVELS[index]?.label ?? value

  function cycle() {
    const next = SEVERITY_LEVELS[(index + 1) % SEVERITY_LEVELS.length]
    onChange(next.value)
  }

  return (
    <button type="button" className={SEVERITY_CLASS[value]} onClick={cycle} title="Clic para cambiar el nivel">
      {label}
    </button>
  )
}
