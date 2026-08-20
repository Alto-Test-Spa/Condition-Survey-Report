import Plus from 'reicon-react/icons/Plus'
import X from 'reicon-react/icons/X'
import ClipboardList from 'reicon-react/icons/ClipboardList'
import type { SpecRow } from '../types'
import { EditableText } from './EditableText'
import { generateId } from '../lib/code'

interface Props {
  title: string
  onTitleChange: (title: string) => void
  rows: SpecRow[]
  onChange: (rows: SpecRow[]) => void
}

// Ficha técnica: tabla clave-valor editable. Mismo componente sirve para una ficha de
// una sola columna de datos (anclajes, líneas de vida) o para un checklist comparativo
// (accesibilidad) — sólo cambian los nombres de campo, no la estructura.
export function SpecTable({ title, onTitleChange, rows, onChange }: Props) {
  function updateRow(id: string, patch: Partial<SpecRow>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeRow(id: string) {
    onChange(rows.filter((row) => row.id !== id))
  }

  function addRow() {
    onChange([...rows, { id: generateId(), field: '', value: '' }])
  }

  return (
    <div className="spec-table">
      <div className="spec-table-head">
        <ClipboardList size={14} strokeWidth={1.8} className="spec-table-icon" />
        <EditableText
          as="p"
          className="spec-table-title"
          value={title}
          onChange={onTitleChange}
          placeholder="Título de la ficha"
        />
      </div>
      <table className="spec-grid">
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="spec-field">
                <EditableText
                  as="span"
                  value={row.field}
                  onChange={(field) => updateRow(row.id, { field })}
                  placeholder="Campo"
                />
              </td>
              <td className="spec-value">
                <EditableText
                  as="span"
                  value={row.value}
                  onChange={(value) => updateRow(row.id, { value })}
                  placeholder="Por completar en terreno"
                />
              </td>
              <td className="spec-action no-print">
                <button type="button" className="row-remove" onClick={() => removeRow(row.id)} title="Quitar fila">
                  <X size={13} strokeWidth={2} className="icon" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="row-add no-print" onClick={addRow}>
        <Plus size={13} strokeWidth={2} className="icon" />
        Agregar fila
      </button>
    </div>
  )
}
