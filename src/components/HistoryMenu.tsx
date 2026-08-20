import { useEffect, useRef, useState } from 'react'
import HistoryIcon from 'reicon-react/icons/History'
import X from 'reicon-react/icons/X'
import type { ReportState } from '../types'
import { listReports, deleteReport, fetchReport, type ReportSummary } from '../lib/api'

interface Props {
  currentCode: string
  onOpen: (report: ReportState) => void
}

// Desplegable sobre el Worker (lib/api.ts): a diferencia de "Deshacer" (un solo paso),
// esto navega CUALQUIER informe guardado en el servidor — visible desde cualquier
// dispositivo con la misma clave de acceso, no sólo desde este navegador.
export function HistoryMenu({ currentCode, onOpen }: Props) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ReportSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [openingCode, setOpeningCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      setItems(await listReports())
    } catch {
      setError('No se pudo cargar el historial.')
    } finally {
      setLoading(false)
    }
  }

  function toggle() {
    if (!open) refresh()
    setOpen((v) => !v)
  }

  async function openItem(code: string) {
    setOpeningCode(code)
    try {
      const report = await fetchReport(code)
      onOpen(report)
      setOpen(false)
    } catch {
      setError('No se pudo abrir ese informe.')
    } finally {
      setOpeningCode(null)
    }
  }

  async function removeItem(code: string) {
    try {
      await deleteReport(code)
      setItems((prev) => prev.filter((i) => i.code !== code))
    } catch {
      setError('No se pudo quitar ese informe.')
    }
  }

  return (
    <div className="history-menu no-print" ref={ref}>
      <button
        type="button"
        className={`toolbar-btn toolbar-btn--ghost ${open ? 'is-on' : ''}`}
        onClick={toggle}
        title="Volver a cualquier informe guardado en el servidor"
      >
        <HistoryIcon size={14} strokeWidth={2} className="icon" />
        Historial
      </button>

      {open && (
        <div className="history-dropdown">
          {loading && <p className="history-empty">Cargando…</p>}
          {!loading && error && <p className="history-empty">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p className="history-empty">Todavía no hay informes guardados.</p>
          )}
          {!loading &&
            !error &&
            items.map((item) => (
              <div key={item.code} className={`history-item ${item.code === currentCode ? 'is-current' : ''}`}>
                <button
                  type="button"
                  className="history-item-open"
                  disabled={openingCode !== null}
                  onClick={() => openItem(item.code)}
                >
                  <p className="history-item-code">
                    {item.code}
                    {item.code === currentCode && <span className="history-item-tag"> · actual</span>}
                    {openingCode === item.code && <span className="history-item-tag"> · abriendo…</span>}
                  </p>
                  <p className="history-item-client">{item.client || 'Sin cliente'}</p>
                  <p className="history-item-date">{item.date || 'sin fecha'}</p>
                </button>
                <button
                  type="button"
                  className="history-item-remove"
                  title="Quitar del historial"
                  onClick={() => removeItem(item.code)}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
