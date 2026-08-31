import { useLayoutEffect, useRef, useState } from 'react'
import Eye from 'reicon-react/icons/Eye'
import Camera from 'reicon-react/icons/Camera'
import ClipboardCheck from 'reicon-react/icons/ClipboardCheck'
import type { ChapterState, Severity } from '../types'
import { EditableText } from './EditableText'
import { ParagraphList } from './ParagraphList'
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
  // Un capítulo puede crecer más de una hoja (varias fotos, texto largo): .page.chapter
  // no lleva min-height fijo en CSS (ver index.css). El pie va position:absolute;bottom:0
  // (igual que en todas las demás páginas), así que queda anclado contra el min-height
  // que fijemos acá — y "bottom:0" sólo cae al borde inferior de una hoja física si ese
  // min-height es un múltiplo EXACTO del alto de una hoja. Por eso el cálculo de abajo
  // redondea SIEMPRE hacia arriba a la siguiente hoja completa; nunca deja el alto
  // "pelado" del contenido, que casi nunca es un múltiplo redondo.
  //
  // Se mide con offsetHeight de dos contenedores simples (contenido, pie), y CADA cálculo
  // parte de cero — nunca a partir de un estado anterior.
  //
  // Caminos ya recorridos, no volver a ellos:
  //  - Spacer invisible + getBoundingClientRect + acumulador de estado
  //    (setFillerPx(prev => prev + deficit)): arrastraba el error de una medición tomada
  //    con el layout a medio asentar y capítulos cortos terminaban midiendo más que una
  //    hoja entera (confirmado con una traza real).
  //  - Alto "pelado" del contenido apenas éste no entraba con el margen de sobra: dejaba
  //    CERO colchón justo en el caso borde (un capítulo que en pantalla medía 1030px
  //    quedaba en 1030px y al imprimir se pasaba unos píxeles, con el pie solo en una
  //    segunda hoja casi vacía). De ahí que el redondeo sea SIEMPRE hacia arriba.
  //  - flex-column con el pie en margin-top:auto: se rompía al fragmentar la caja en 2+
  //    hojas al imprimir (bug de fragmentación de flexbox de Chromium). Se abandonó
  //    flexbox — el pie es position:absolute y un elemento absoluto queda fuera del flujo
  //    de fragmentación de CSS Paged Media, así que no hereda ese bug.
  //  - Con ese flex, <PageFooter> vivía envuelto en un <div ref={footerRef}> y el
  //    margin-top:auto (en un nieto, no un hijo flex directo) no empujaba nada. Hoy
  //    <PageFooter> recibe el ref DIRECTAMENTE (React 19, sin forwardRef) — se mide sin
  //    envolverlo.
  const contentRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLElement>(null)
  const [minHeightPx, setMinHeightPx] = useState(PAGE_HEIGHT_PX)

  useLayoutEffect(() => {
    const contentEl = contentRef.current
    const footerEl = footerRef.current
    if (!contentEl || !footerEl) return
    const naturalHeight = contentEl.offsetHeight + footerEl.offsetHeight + PAGE_VERTICAL_PADDING_PX
    // Cuántas hojas físicas completas necesita el capítulo. min-height es un PISO, no un
    // techo: si el contenido real al imprimir queda más alto, la sección crece igual — por
    // eso se redondea hacia ARRIBA a la hoja completa, para que el pie (bottom:0) caiga
    // siempre al borde de una hoja y no a media hoja cuando el capítulo se reparte en
    // varias (bug real: Camilo reportó un capítulo de 4 recomendaciones que se partía en
    // 2 hojas y dejaba el pie flotando a ~1/3 de la segunda, con el resto en blanco).
    //
    // El colchón (SAFETY_MARGIN_PX) se RESTA antes de dividir, no se suma: un capítulo que
    // en pantalla mide un pelo más que N hojas —dentro del ruido de medición
    // pantalla/impresión— se queda en N y no salta a N+1 por unos pocos píxeles. Es el
    // mismo criterio que antes valía sólo para la primera hoja ("forzar la hoja completa
    // salvo que el contenido exceda claramente el límite"), ahora para cualquier N.
    const pageCount = Math.max(1, Math.ceil((naturalHeight - SAFETY_MARGIN_PX) / PAGE_HEIGHT_PX))
    setMinHeightPx(pageCount * PAGE_HEIGHT_PX)
    // Depende de `chapter` completo (no de un campo puntual): cualquier cambio — texto,
    // fotos, severidad, filas de la ficha — puede alterar el alto real del contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter])

  if (!chapter.included) return null

  function patch(partial: Partial<ChapterState>) {
    onChange({ ...chapter, ...partial })
  }

  const ChapterIcon = CHAPTER_ICONS[chapter.id] ?? DEFAULT_CHAPTER_ICON

  // Cuántas hojas físicas ocupa el capítulo (minHeightPx ya es un múltiplo exacto del alto
  // de una hoja, ver arriba). Un capítulo de una sola hoja no lleva rótulo de continuación.
  const sheetCount = Math.max(1, Math.round(minHeightPx / PAGE_HEIGHT_PX))

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
            <ParagraphList
              items={chapter.observations}
              onChange={(observations) => patch({ observations })}
              placeholder="Describa lo constatado en terreno para este elemento."
              addLabel="Agregar observación"
            />

            <IconEyebrow icon={Camera} className="block-label">
              Registro fotográfico
            </IconEyebrow>
            <PhotoGallery photos={chapter.photos} onChange={(photos) => patch({ photos })} />

            <IconEyebrow icon={ClipboardCheck} className="block-label">
              Recomendaciones
            </IconEyebrow>
            <ParagraphList
              items={chapter.recommendations}
              onChange={(recommendations) => patch({ recommendations })}
              placeholder="Indique las acciones recomendadas para este capítulo."
              addLabel="Agregar recomendación"
            />
          </div>
        </div>
      </div>

      {/* Rótulo de continuación en la banda de padding superior de cada hoja física
          posterior a la primera — orienta al lector en un capítulo que se reparte en
          varias hojas y le da un ancla arriba que hace juego con el pie abajo, para que el
          blanco del medio se lea como "la sección sigue". Sólo impresión: en pantalla el
          capítulo es un bloque continuo sin corte de hoja (ver index.css, .chapter-cont).
          Mismo mecanismo que PageFooter — position:absolute contra el min-height ya
          redondeado a hojas completas, así `top: k * PAGE_HEIGHT_PX` cae justo al inicio
          de la hoja k+1 y queda fuera del flujo de fragmentación de CSS Paged Media. */}
      {Array.from({ length: sheetCount - 1 }, (_, i) => (
        <div
          key={i}
          className="chapter-cont"
          aria-hidden="true"
          style={{ top: (i + 1) * PAGE_HEIGHT_PX }}
        >
          <span className="chapter-cont-title">
            {number != null && <span className="chapter-cont-number">{number}</span>}
            {chapter.title}
          </span>
          <span className="chapter-cont-tag">continúa</span>
        </div>
      ))}

      <PageFooter ref={footerRef} code={code} sectionNumber={sectionNumber} totalSections={totalSections} />
    </section>
  )
}
