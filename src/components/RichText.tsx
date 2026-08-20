import { useEffect, useRef } from 'react'
import type { ClipboardEvent } from 'react'
import { sanitizeRichHtml } from '../lib/richtext'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

// Texto largo (observaciones, recomendaciones): admite párrafos (Enter) y negrita
// (Ctrl/Cmd+B), saneado al perder el foco. Igual que EditableText, no controlado en
// cada tecla — el DOM manda mientras se escribe, React sólo sincroniza al perder foco
// o cuando el valor cambia por fuera (ej. "Nueva").
export function RichText({ value, onChange, placeholder, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== value) el.innerHTML = value
  }, [value])

  function onPaste(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-ph={placeholder}
      className={`editable rich-text ${className ?? ''}`}
      onPaste={onPaste}
      onBlur={() => onChange(sanitizeRichHtml(ref.current?.innerHTML ?? ''))}
    />
  )
}
