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
// Zona de ambigüedad real entre cómo mide el layout en pantalla y cómo termina
// renderizando Chrome al imprimir de verdad. Antes esto se manejaba con un colchón
// (SAFETY_MARGIN_PX) que se restaba antes de dividir por PAGE_HEIGHT_PX — pero esta misma
// sesión demostró con dos casos reales que NINGÚN valor de colchón funciona: un capítulo
// de 19 recomendaciones necesitaba un colchón < 17px para no perdonar un desborde real
// (si no, el pie terminaba flotando a mitad de una hoja de más, con contenido real
// después) y un capítulo con una recomendación de texto repetitivo bajo justificado
// necesitaba un colchón > 18px para no reservar una hoja completa que en el PDF real
// sale en blanco (confirmado imprimiendo con el min-height forzado a mano a una hoja
// menos: el contenido entraba perfecto). Ningún número entre 17 y 18 —ni ningún otro fijo—
// resuelve los dos casos a la vez: son la MISMA incertidumbre de medición, sólo que un
// caso necesita perdonarla y el otro no, y en pantalla no hay forma de distinguirlos.
//
// La salida no es afinar el número — es dejar de apostar. Cuando el contenido cae DENTRO
// de esta zona de incertidumbre (a menos de AMBIGUOUS_ZONE_PX del límite de una hoja
// Carta), el capítulo deja de repartirse en hojas Carta completas y pasa a un alto de hoja
// CUSTOM, calculado para ese capítulo puntual (ver CUSTOM_PAGE_BUFFER_PX) — no un tamaño
// fijo más grande (se probó primero saltar completo a hoja Oficio chilena, 8.5x13in; Matías
// pidió algo proporcional al desborde real en vez de "una hoja TAN grande cuando no sea
// necesario" — un capítulo que se pasa por 18px no necesita 2 pulgadas extra). El valor
// (120px) queda cómodamente arriba del peor ruido visto (~70px) y cómodamente abajo del
// caso real más chico que SÍ necesitaba una hoja extra genuina (143px, un capítulo con 6
// recomendaciones reales) — para que ese caso siga usando hojas Carta normales, sin tamaño
// custom de más.
const AMBIGUOUS_ZONE_PX = 120
// Colchón que se SUMA (nunca se resta) al alto real antes de repartirlo entre las hojas
// custom de un capítulo ambiguo — más que el peor ruido pantalla/impresión observado esta
// sesión (~70px), con margen de sobra, así el contenido real (que Chrome puede terminar
// midiendo un poco más alto que en pantalla) sigue entrando cómodo en las hojas custom. Al
// sumarse en vez de restarse, este colchón nunca puede producir el bug original (pie
// flotando a media hoja) — en el peor caso la hoja custom queda un poco más alta de lo
// estrictamente necesario, nunca más baja.
const CUSTOM_PAGE_BUFFER_PX = 90

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
  // sheetHeightPx: el alto de CADA hoja física que ocupa este capítulo — normalmente
  // PAGE_HEIGHT_PX (Carta), salvo que el capítulo caiga en la zona de ambigüedad, caso en
  // que pasa a un alto custom calculado sólo para él (ver AMBIGUOUS_ZONE_PX arriba).
  // sheetCount es cuántas hojas de ese alto necesita; minHeightPx = sheetHeightPx *
  // sheetCount siempre — se guardan los tres juntos (no se derivan unos de otros al
  // renderizar) para no tener que invertir la división al calcular sheetCount más abajo.
  const [pagination, setPagination] = useState({
    minHeightPx: PAGE_HEIGHT_PX,
    sheetHeightPx: PAGE_HEIGHT_PX,
    sheetCount: 1,
    isCustomSize: false,
  })

  useLayoutEffect(() => {
    const contentEl = contentRef.current
    const footerEl = footerRef.current
    if (!contentEl || !footerEl) return
    // Los controles de edición (.no-print: "Agregar observación/recomendación/fila",
    // "Agregar fotos", quitar párrafo/fila/foto) ocupan su propio espacio en el flujo
    // EN PANTALLA, pero desaparecen por completo al imprimir (.no-print{display:none}
    // sólo dentro de @media print — ver index.css). Medir con ellos visibles infla el
    // alto por encima de lo que el PDF real necesita: un capítulo cuyo contenido
    // imprimible cabe justo en una hoja quedaba, por ese sobrante de pantalla, del otro
    // lado del límite de página — reservando una segunda hoja completa que en el PDF
    // sale casi en blanco (sólo el rótulo "continúa" y el pie), y descuadrando la
    // numeración de hojas que muestra PageFooter (bug real: capítulos de 3
    // observaciones/recomendaciones, sin desborde real, reportado por Camilo con PDF en
    // mano). Se ocultan con display:none ANTES de medir (mismo efecto que la regla de
    // impresión) y se restauran de inmediato — todo dentro de este useLayoutEffect
    // síncrono, así que no hay parpadeo visible para quien está editando.
    const noPrintEls = Array.from(contentEl.querySelectorAll<HTMLElement>('.no-print'))
    const previousDisplay = noPrintEls.map((el) => el.style.display)
    noPrintEls.forEach((el) => {
      el.style.display = 'none'
    })
    const naturalHeight = contentEl.offsetHeight + footerEl.offsetHeight + PAGE_VERTICAL_PADDING_PX
    noPrintEls.forEach((el, i) => {
      el.style.display = previousDisplay[i]
    })
    // Cuántas hojas Carta completas necesita el capítulo, SIN perdonar nada — a diferencia
    // del enfoque anterior (restar un colchón antes de dividir), acá el redondeo estricto
    // sólo decide si hace falta salir de Carta normal; la ambigüedad real se resuelve
    // después con un alto de hoja custom (ver arriba), no adivinando con un margen fijo.
    const strictSheetCount = Math.max(1, Math.ceil(naturalHeight / PAGE_HEIGHT_PX))

    let next: typeof pagination
    if (strictSheetCount === 1) {
      next = { minHeightPx: PAGE_HEIGHT_PX, sheetHeightPx: PAGE_HEIGHT_PX, sheetCount: 1, isCustomSize: false }
    } else {
      // Cuánto se pasa el contenido real más allá de las (strictSheetCount - 1) hojas
      // Carta que de todas formas necesita completas — sólo la ÚLTIMA hoja es la
      // ambigua, las anteriores son desborde genuino sin importar el ruido de medición.
      const overflowIntoLastSheet = naturalHeight - (strictSheetCount - 1) * PAGE_HEIGHT_PX
      // El tamaño custom SÓLO se activa en el límite 1↔2 hojas (strictSheetCount === 2),
      // no en cualquier N — probado con un capítulo real de 19 recomendaciones
      // (strictSheetCount 3, borde ambiguo hacia una 3ª hoja): reservar sólo 2 hojas custom
      // "por si acaso" no alcanzó — el contenido real al imprimir creció más de lo que el
      // colchón de CUSTOM_PAGE_BUFFER_PX cubría y desbordó a una 3ª hoja física de todas
      // formas, pero como el contenedor sólo reservaba 2 hojas de alto, el pie
      // (position:absolute;bottom:0, anclado contra esas 2 hojas) quedó flotando a mitad de
      // esa 3ª hoja no anticipada, con el resto en blanco debajo — el MISMO bug que todo
      // este mecanismo existe para evitar, sólo que un nivel más arriba. El colchón (90px)
      // sólo está calibrado contra el caso real de 1↔2 hojas (105543 en producción, ver
      // CLAUDE.md); estirarlo a capítulos con mucho más contenido asume que el desvío
      // pantalla/impresión no crece con el volumen de texto, y ese supuesto quedó refutado
      // con datos reales. Un capítulo que de todas formas necesita 3+ hojas Carta vuelve al
      // camino ya probado (hojas Carta completas, sin arriesgar una hoja de menos) — una
      // última hoja parcialmente en blanco en un capítulo ya largo es un problema mucho más
      // chico que un pie flotando con contenido real perdido de vista.
      if (strictSheetCount === 2 && overflowIntoLastSheet <= AMBIGUOUS_ZONE_PX) {
        // Ambiguo: en vez de sumar una hoja Carta entera más (que puede salir casi en
        // blanco en el PDF real), se reparte el alto real + colchón en 1 sola hoja custom
        // un poco más alta que Carta, proporcional al desborde real, nunca un salto fijo a
        // un tamaño mucho mayor.
        const sheetCount = strictSheetCount - 1
        const sheetHeightPx = Math.ceil((naturalHeight + CUSTOM_PAGE_BUFFER_PX) / sheetCount)
        next = { minHeightPx: sheetHeightPx * sheetCount, sheetHeightPx, sheetCount, isCustomSize: true }
      } else {
        // Desborde claro, o strictSheetCount >= 3: hojas Carta normales, tantas como haga
        // falta, sin tamaño custom.
        next = { minHeightPx: strictSheetCount * PAGE_HEIGHT_PX, sheetHeightPx: PAGE_HEIGHT_PX, sheetCount: strictSheetCount, isCustomSize: false }
      }
    }
    setPagination(next)
    // Depende de `chapter` completo (no de un campo puntual): cualquier cambio — texto,
    // fotos, severidad, filas de la ficha — puede alterar el alto real del contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter])

  if (!chapter.included) return null

  function patch(partial: Partial<ChapterState>) {
    onChange({ ...chapter, ...partial })
  }

  const ChapterIcon = CHAPTER_ICONS[chapter.id] ?? DEFAULT_CHAPTER_ICON

  const { minHeightPx, sheetHeightPx, sheetCount, isCustomSize } = pagination
  // chapter.id es un slug estable (no el `code` del documento, que puede cambiar — ver
  // CLAUDE.md "Folio"), así que este nombre no colisiona entre los 4 capítulos posibles
  // aunque más de uno esté en tamaño custom a la vez.
  const customPageName = `chapter-${chapter.id}-page`

  return (
    <section
      id={`chapter-${chapter.id}`}
      className="page chapter"
      // `page` (propiedad CSS de Paged Media, no un atributo de React) le dice al motor de
      // impresión qué regla @page usar para esta caja — confirmado con una prueba aislada
      // que Chromium sí respeta un `page` distinto por inline style, mezclando tamaños de
      // hoja distintos dentro del mismo PDF. Sin esto el capítulo seguiría usando la @page
      // base (Carta) sin importar el minHeight que se le aplique.
      style={isCustomSize ? { minHeight: minHeightPx, page: customPageName } : { minHeight: minHeightPx }}
    >
      {/* @page con nombre + alto calculado para ESTE capítulo puntual — no un tamaño fijo
          (Oficio) compartido por cualquier capítulo ambiguo, a pedido explícito: la hoja
          extra debe ser proporcional a cuánto se pasa el contenido, no siempre la misma.
          Un <style> en cualquier parte del documento define la regla globalmente — su
          posición en el DOM no importa, sólo que exista antes de imprimir; se re-renderiza
          con el contenido actual en cada cambio del capítulo. */}
      {isCustomSize && (
        <style>{`@page ${customPageName} { size: 8.5in ${(sheetHeightPx / 96).toFixed(3)}in; margin: 0; }`}</style>
      )}
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
          redondeado a hojas completas, así `top: k * sheetHeightPx` cae justo al inicio
          de la hoja k+1 y queda fuera del flujo de fragmentación de CSS Paged Media.
          sheetHeightPx (no PAGE_HEIGHT_PX a secas) porque un capítulo en tamaño custom
          (ver isCustomSize arriba) reparte sus hojas de continuación a SU propio alto,
          no al de una hoja Carta. */}
      {Array.from({ length: sheetCount - 1 }, (_, i) => (
        <div
          key={i}
          className="chapter-cont"
          aria-hidden="true"
          style={{ top: (i + 1) * sheetHeightPx }}
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
