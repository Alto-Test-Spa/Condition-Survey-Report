import { useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import Bold from 'reicon-react/icons/Bold'
import Italic from 'reicon-react/icons/Italic'
import { sanitizeRichHtml } from '../lib/richtext'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

interface ToolbarPos {
  top: number
  left: number
}

// Texto largo (observaciones, recomendaciones): admite párrafos (Enter) y negrita/
// cursiva (Ctrl/Cmd+B / +I ya funcionaba antes vía el atajo nativo del navegador, pero
// no es descubrible — Camilo no sabía que existía). El botón flotante de acá abajo hace
// lo mismo (document.execCommand) pero con un control visible: aparece pegado a la
// selección de texto DENTRO de este campo en particular, no de cualquier otro RichText
// de la misma hoja. Saneado al perder el foco, igual que antes. No controlado en cada
// tecla — el DOM manda mientras se escribe, React sólo sincroniza el valor al perder el
// foco (onBlur) o cuando cambia por fuera (ej. "Nueva", abrir del Historial).
export function RichText({ value, onChange, placeholder, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [toolbarPos, setToolbarPos] = useState<ToolbarPos | null>(null)

  useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== value) el.innerHTML = value
  }, [value])

  useEffect(() => {
    function updateToolbar() {
      const el = ref.current
      const sel = document.getSelection()
      if (!el || !sel || sel.isCollapsed || sel.rangeCount === 0) {
        setToolbarPos(null)
        return
      }
      const range = sel.getRangeAt(0)
      if (!el.contains(range.commonAncestorContainer)) {
        setToolbarPos(null)
        return
      }
      const rect = range.getBoundingClientRect()
      setToolbarPos({ top: rect.top, left: rect.left + rect.width / 2 })
    }
    document.addEventListener('selectionchange', updateToolbar)
    // Captura (true) para enterarse de scroll en cualquier contenedor ancestro, no sólo
    // en window — si no, el botón queda "flotando" en el lugar viejo al hacer scroll.
    window.addEventListener('scroll', updateToolbar, true)
    return () => {
      document.removeEventListener('selectionchange', updateToolbar)
      window.removeEventListener('scroll', updateToolbar, true)
    }
  }, [])

  function onPaste(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  // preventDefault en mousedown (no en click): si no, el navegador le saca el foco al
  // campo editable ANTES del click para dárselo al botón, y la selección de texto se
  // pierde — execCommand ya no tendría sobre qué aplicar el formato.
  function applyFormat(command: 'bold' | 'italic') {
    return (e: ReactMouseEvent) => {
      e.preventDefault()
      document.execCommand(command)
    }
  }

  return (
    <div className="rich-text-wrap">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-ph={placeholder}
        className={`editable rich-text ${className ?? ''}`}
        onPaste={onPaste}
        onBlur={() => {
          setToolbarPos(null)
          onChange(sanitizeRichHtml(ref.current?.innerHTML ?? ''))
        }}
      />
      {toolbarPos && (
        <div className="format-toolbar no-print" style={{ top: toolbarPos.top, left: toolbarPos.left }}>
          <button type="button" onMouseDown={applyFormat('bold')} title="Negrita (Ctrl/Cmd+B)">
            <Bold size={13} strokeWidth={2} className="icon" />
          </button>
          <button type="button" onMouseDown={applyFormat('italic')} title="Cursiva (Ctrl/Cmd+I)">
            <Italic size={13} strokeWidth={2} className="icon" />
          </button>
        </div>
      )}
    </div>
  )
}
