import { useLayoutEffect, useRef } from 'react'
import type { ElementType, KeyboardEvent } from 'react'

interface Props {
  value: string
  onChange: (valor: string) => void
  placeholder?: string
  className?: string
  as?: ElementType
}

// Campo de una sola idea (título, etiqueta, nombre de campo): sin Enter, sin formato.
// El valor se guarda al perder el foco, no en cada tecla, para no pelear con el cursor.
export function EditableText({ value, onChange, placeholder, className, as: Tag = 'span' }: Props) {
  const ref = useRef<HTMLElement>(null)

  // useLayoutEffect, no useEffect — mismo motivo que RichText.tsx: tiene que escribir el
  // DOM antes del paint para que Chapter.tsx, que mide el capítulo completo con su propio
  // useLayoutEffect, no atrape este campo todavía vacío en la primera medición.
  useLayoutEffect(() => {
    const el = ref.current
    if (el && el.textContent !== value) el.textContent = value
  }, [value])

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Enter') e.preventDefault()
  }

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-ph={placeholder}
      className={`editable ${className ?? ''}`}
      onKeyDown={onKeyDown}
      onBlur={() => onChange(ref.current?.textContent?.trim() ?? '')}
    />
  )
}
