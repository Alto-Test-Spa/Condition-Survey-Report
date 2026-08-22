import Plus from 'reicon-react/icons/Plus'
import X from 'reicon-react/icons/X'
import type { ParagraphItem } from '../types'
import { RichText } from './RichText'
import { generateId } from '../lib/code'

interface Props {
  items: ParagraphItem[]
  onChange: (items: ParagraphItem[]) => void
  placeholder: string
  addLabel: string
}

// Observaciones/recomendaciones de un capítulo: en vez de un único cuadro de texto donde
// cada punto se separaba escribiendo Enter (y numerando a mano "1.", "2.", ...), cada
// punto es su propio párrafo agregable/quitable, igual que las filas de SpecTable — la
// numeración la pone el CSS (counter-increment en .paragraph-item, ver index.css), así
// que nunca queda desincronizada al agregar o quitar un párrafo.
export function ParagraphList({ items, onChange, placeholder, addLabel }: Props) {
  function updateItem(id: string, text: string) {
    onChange(items.map((item) => (item.id === id ? { ...item, text } : item)))
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id))
  }

  function addItem() {
    onChange([...items, { id: generateId(), text: '' }])
  }

  return (
    <div className="paragraph-list">
      {items.map((item) => (
        <div key={item.id} className="paragraph-item">
          <RichText value={item.text} onChange={(text) => updateItem(item.id, text)} placeholder={placeholder} />
          <button
            type="button"
            className="row-remove paragraph-remove no-print"
            onClick={() => removeItem(item.id)}
            title="Quitar párrafo"
          >
            <X size={13} strokeWidth={2} className="icon" />
          </button>
        </div>
      ))}
      <button type="button" className="row-add no-print" onClick={addItem}>
        <Plus size={13} strokeWidth={2} className="icon" />
        {addLabel}
      </button>
    </div>
  )
}
