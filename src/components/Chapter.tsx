import { useLayoutEffect, useRef, useState } from 'react'
import Eye from 'reicon-react/icons/Eye'
import Camera from 'reicon-react/icons/Camera'
import ClipboardCheck from 'reicon-react/icons/ClipboardCheck'
import type { ChapterState, Severity } from '../types'
import { EditableText } from './EditableText'
import { RichText } from './RichText'
import { SpecTable } from './SpecTable'
import { PhotoGallery } from './PhotoGallery'
import { SeverityBadge } from './SeverityBadge'
import { IconEyebrow } from './IconEyebrow'
import { PageFooter } from './PageFooter'
import { CHAPTER_ICONS, DEFAULT_CHAPTER_ICON } from '../lib/chapterIcons'

interface Props {
  chapter: ChapterState
  number: number | null
  onChange: (chapter: ChapterState) => void
  code: string
  sectionNumber: number
  totalSections: number
}

// 1in de CSS son siempre 96px de referencia (independiente del zoom/DPI real) — misma
// unidad que usa .page en index.css para su min-height (11in) en el resto de las páginas.
const PAGE_HEIGHT_PX = 11 * 96
const PAGE_VERTICAL_PADDING_PX = 0.85 * 96 * 2
// Colchón contra diferencias de sub-píxel entre cómo mide el layout en pantalla y cómo
// termina renderizando Chrome al imprimir de verdad — un capítulo que en pantalla mide
// justo al límite de una hoja puede terminar un pelo más alto al imprimir y saltar solo
// por eso a una segunda hoja casi vacía (bug real, confirmado dos veces esta sesión).
const SAFETY_MARGIN_PX = 48

// Franja de color de la ficha lateral: mismo mapeo de tokens que SeverityBadge/
// SummaryTable, para que el color siga significando lo mismo en todo el documento.
// Prefijo "accent-" (no "severity-" a secas) para no colisionar con las reglas sueltas
// .severity-critical/etc que ya existen para el badge y el punto de SummaryTable — esas
// no están scopeadas a su propio componente, así que cualquier otro elemento con esa
// misma clase hereda su fondo (bug real, cazado al probar el layout de 2 columnas: el
// body del capítulo completo se pintaba naranjo sólido).
const ACCENT_CLASS: Record<Severity, string> = {
  critical: 'accent-critical',
  needs_action: 'accent-needs-action',
  observation: 'accent-observation',
  compliant: 'accent-compliant',
}

export function Chapter({ chapter, number, onChange, code, sectionNumber, totalSections }: Props) {
  // Un capítulo puede crecer más de una hoja (varias fotos): .page.chapter no lleva
  // min-height fijo en CSS (ver index.css), así que el pie no tiene contra qué hoja
  // "pegarse abajo" cuando el contenido es corto — sin ayuda extra queda inmediatamente
  // después del contenido, con el resto de la hoja física en blanco (bug reportado por
  // Camilo/Matías). Se resuelve calculando acá, en cada cambio del capítulo, la altura
  // mínima real que debe tener la sección — una hoja completa si el contenido entra
  // (con margen de seguridad), o el alto real del contenido si ya es más largo — y
  // aplicándola como min-height en línea. .page.chapter es flex-column (ver index.css) y
  // el pie lleva margin-top:auto, así que una vez fijado el min-height correcto, el pie
  // se pega solo al fondo — no hace falta spacer ni medir la posición del pie por
  // separado.
  //
  // Se mide con offsetHeight de dos contenedores simples (contenido, pie), NUNCA a partir
  // de un estado anterior — cada cálculo es independiente y no arrastra error de una
  // medición previa. Un intento anterior (getBoundingClientRect + acumulador de estado
  // con setFillerPx(prev => prev + deficit)) sí podía arrastrar error: si una medición
  // se tomaba en un instante con el layout todavía asentándose, ese error quedaba
  // parcialmente "guardado" en el estado y sólo se corregía a medias en la siguiente
  // pasada — confirmado esta sesión con una traza real (una sección con dos párrafos de
  // observaciones terminó más alta que una hoja vacía, algo que no tiene sentido si el
  // cálculo fuera siempre desde cero).
  //
  // Segundo bug real, distinto y posterior: <PageFooter> recibe el ref DIRECTAMENTE (ver
  // PageFooter.tsx, React 19 sin forwardRef) — antes vivía envuelto en un <div
  // ref={footerRef}> sólo para poder medirlo, y margin-top:auto (el truco que lo pega
  // abajo) estaba en .page-footer, un NIETO del flex container, no un hijo directo. Un
  // margin:auto en el eje del bloque sólo hace algo especial en un ítem flex directo — en
  // cualquier descendiente más profundo simplemente vale 0. El resultado: min-height se
  // aplicaba bien (la sección sí medía una hoja completa), pero el pie igual quedaba
  // pegado justo después del contenido, con el resto de la hoja en blanco por debajo sin
  // usar — confirmado midiendo el DOM directo (sección a 1056px, pie apareciendo a los
  // ~360px). Con <PageFooter> como hijo directo, el pie sí es el que recibe el margen.
  const contentRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLElement>(null)
  const [minHeightPx, setMinHeightPx] = useState(PAGE_HEIGHT_PX)

  useLayoutEffect(() => {
    const contentEl = contentRef.current
    const footerEl = footerRef.current
    if (!contentEl || !footerEl) return
    const naturalHeight = contentEl.offsetHeight + footerEl.offsetHeight + PAGE_VERTICAL_PADDING_PX
    // min-height es un PISO, no un techo: si el contenido real (medido al imprimir) es
    // más alto que lo que fijemos acá, la sección va a crecer igual, sin importar qué
    // número pongamos. Por eso, salvo que el contenido exceda claramente una hoja (más
    // que el margen de seguridad de sobra), conviene forzar SIEMPRE la hoja completa —
    // eso es lo que le da colchón real contra la diferencia pantalla/impresión, no al
    // revés. Un intento anterior hacía lo opuesto (usar el alto real "pelado" apenas el
    // contenido no entraba con margen de sobra) y eso dejaba CERO colchón justo en el
    // caso borde que más lo necesitaba — bug real, confirmado con "Puntos de anclaje"
    // (naturalHeight medía 1030px en pantalla, la sección quedaba en 1030px sin margen, y
    // al imprimir de verdad se pasaba de la hoja física por unos pocos píxeles, dejando
    // el pie solo en una segunda hoja casi en blanco). Sólo se abandona la hoja completa
    // cuando el contenido de verdad necesita más — ahí no hay margen que alcance, así que
    // no tiene sentido fingir que cabe en una sola hoja.
    const isDefinitelyMultiPage = naturalHeight > PAGE_HEIGHT_PX + SAFETY_MARGIN_PX
    setMinHeightPx(isDefinitelyMultiPage ? naturalHeight : PAGE_HEIGHT_PX)
    // Depende de `chapter` completo (no de un campo puntual): cualquier cambio — texto,
    // fotos, severidad, filas de la ficha — puede alterar el alto real del contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter])

  if (!chapter.included) return null

  function patch(partial: Partial<ChapterState>) {
    onChange({ ...chapter, ...partial })
  }

  const ChapterIcon = CHAPTER_ICONS[chapter.id] ?? DEFAULT_CHAPTER_ICON

  return (
    <section id={`chapter-${chapter.id}`} className="page chapter" style={{ minHeight: minHeightPx }}>
      <div ref={contentRef}>
        <header className="section-head">
          <div className="section-head-title">
            <span className="section-icon">
              <ChapterIcon size={16} strokeWidth={1.8} />
            </span>
            <span className="section-number">{number}.</span>
            <EditableText
              as="h2"
              className="heading-lg"
              value={chapter.title}
              onChange={(title) => patch({ title })}
              placeholder="Título del capítulo"
            />
          </div>
        </header>

        {/* Ficha fija a un costado + cuerpo narrativo al otro — a propósito distinto del
            bloque único apilado (ficha -> observación -> foto -> recomendación) que usa
            el informe de referencia de la competencia (ver CLAUDE.md). */}
        <div className={`chapter-body ${ACCENT_CLASS[chapter.severity]}`}>
          <aside className="chapter-aside">
            <SeverityBadge value={chapter.severity} onChange={(severity) => patch({ severity })} />
            <SpecTable
              title={chapter.specTitle}
              onTitleChange={(specTitle) => patch({ specTitle })}
              rows={chapter.spec}
              onChange={(spec) => patch({ spec })}
            />
          </aside>

          <div className="chapter-main">
            <IconEyebrow icon={Eye} className="block-label">
              Observaciones
            </IconEyebrow>
            <RichText
              value={chapter.observations}
              onChange={(observations) => patch({ observations })}
              placeholder="Describa lo constatado en terreno para este elemento."
            />

            <IconEyebrow icon={Camera} className="block-label">
              Registro fotográfico
            </IconEyebrow>
            <PhotoGallery photos={chapter.photos} onChange={(photos) => patch({ photos })} />

            <IconEyebrow icon={ClipboardCheck} className="block-label">
              Recomendaciones
            </IconEyebrow>
            <RichText
              value={chapter.recommendations}
              onChange={(recommendations) => patch({ recommendations })}
              placeholder="Indique las acciones recomendadas para este capítulo."
            />
          </div>
        </div>
      </div>
      <PageFooter ref={footerRef} code={code} sectionNumber={sectionNumber} totalSections={totalSections} />
    </section>
  )
}
