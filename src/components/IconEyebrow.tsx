import type { ComponentType, ReactNode } from 'react'
import type { IconProps } from 'reicon-react'

interface Props {
  icon: ComponentType<IconProps>
  children: ReactNode
  className?: string
}

// Etiqueta pequeña (Observaciones, Registro fotográfico, Recomendaciones...) con un
// ícono delante — da un punto de referencia visual rápido al recorrer un capítulo largo.
export function IconEyebrow({ icon: Icon, children, className }: Props) {
  return (
    <p className={`eyebrow eyebrow-icon ${className ?? ''}`}>
      <Icon size={12} strokeWidth={2} className="eyebrow-icon-glyph" />
      {children}
    </p>
  )
}
