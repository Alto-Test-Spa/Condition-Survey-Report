import type { ComponentType } from 'react'
import type { IconProps } from 'reicon-react'
import Route from 'reicon-react/icons/Route'
import Building2 from 'reicon-react/icons/Building2'
import Link from 'reicon-react/icons/Link'
import RouteTrack from 'reicon-react/icons/RouteTrack'

// Un ícono por capítulo de inspección — ayuda a distinguir de un vistazo cada tema
// tanto en el índice como en el encabezado del capítulo. Si se agrega un capítulo
// nuevo (id distinto a los cuatro de plantilla), cae en el ícono por defecto.
export const CHAPTER_ICONS: Record<string, ComponentType<IconProps>> = {
  accessibility: Route,
  structural: Building2,
  anchors: Link,
  lifelines: RouteTrack,
}

export const DEFAULT_CHAPTER_ICON: ComponentType<IconProps> = Route
