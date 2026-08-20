import FilePlus from 'reicon-react/icons/FilePlus'
import Checklist from 'reicon-react/icons/Checklist'
import PenTool from 'reicon-react/icons/PenTool'
import Printer from 'reicon-react/icons/Printer'
import Refresh from 'reicon-react/icons/Refresh'
import Undo from 'reicon-react/icons/Undo'
import type { ReportState } from '../types'
import { generateCode } from '../lib/code'
import { formatDateInput } from '../lib/date'
import { Logomark } from './Logomark'
import { HistoryMenu } from './HistoryMenu'
import { SyncStatus } from './SyncStatus'
import type { SyncState } from '../lib/api'

interface Props {
  report: ReportState
  onChange: (patch: Partial<ReportState>) => void
  showGuides: boolean
  onToggleGuides: () => void
  showChapters: boolean
  onToggleChapters: () => void
  onNew: () => void
  onUndo: () => void
  canUndo: boolean
  onLoadReport: (report: ReportState) => void
  syncState: SyncState
}

export function Toolbar({
  report,
  onChange,
  showGuides,
  onToggleGuides,
  showChapters,
  onToggleChapters,
  onNew,
  onUndo,
  canUndo,
  onLoadReport,
  syncState,
}: Props) {
  return (
    <div className="toolbar no-print">
      <span className="toolbar-brand">
        <Logomark tone="signal" width={26} height={11} />
        ALTO&nbsp;TEST
      </span>

      <div className="toolbar-group">
        <span className="eyebrow">N°</span>
        <input
          className="toolbar-input toolbar-input--code"
          value={report.code}
          onChange={(e) => onChange({ code: e.target.value })}
        />
        <button
          type="button"
          className="toolbar-btn toolbar-btn--ghost toolbar-btn--mini"
          title="Generar un folio nuevo"
          onClick={() => onChange({ code: generateCode() })}
        >
          <Refresh size={14} strokeWidth={2} className="icon" />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <span className="eyebrow">Fecha</span>
        <input
          className="toolbar-input toolbar-input--date"
          value={report.date}
          placeholder="dd/mm/aaaa"
          onChange={(e) => onChange({ date: formatDateInput(e.target.value) })}
        />
      </div>

      <SyncStatus state={syncState} />

      <div className="toolbar-spacer" />

      <button
        type="button"
        className={`toolbar-btn toolbar-btn--ghost ${showGuides ? 'is-on' : ''}`}
        onClick={onToggleGuides}
      >
        <PenTool size={14} strokeWidth={2} className="icon" />
        Guías
      </button>
      <button
        type="button"
        className={`toolbar-btn toolbar-btn--ghost ${showChapters ? 'is-on' : ''}`}
        onClick={onToggleChapters}
      >
        <Checklist size={14} strokeWidth={2} className="icon" />
        Capítulos
      </button>
      <HistoryMenu currentCode={report.code} onOpen={onLoadReport} />

      <button type="button" className="toolbar-btn toolbar-btn--ghost" onClick={onNew}>
        <FilePlus size={14} strokeWidth={2} className="icon" />
        Nueva
      </button>
      {canUndo && (
        <button type="button" className="toolbar-btn toolbar-btn--ghost" onClick={onUndo}>
          <Undo size={14} strokeWidth={2} className="icon" />
          Deshacer
        </button>
      )}
      <button type="button" className="toolbar-btn" onClick={() => window.print()}>
        <Printer size={14} strokeWidth={2} className="icon" />
        Imprimir / PDF
      </button>
    </div>
  )
}
