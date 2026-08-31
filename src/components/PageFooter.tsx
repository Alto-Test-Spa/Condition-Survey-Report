interface Props {
  code: string
  // El índice (TableOfContents) no es una sección numerada del documento — no tiene un
  // número propio en numberDocument(), así que su pie omite el indicador de página en
  // vez de mostrar un "0/N" inventado.
  sectionNumber?: number
  totalSections: number
  // React 19: ref como prop normal, sin forwardRef. Chapter.tsx lo necesita para que
  // <PageFooter> sea directamente el hijo flex de .page.chapter (ver "Bug real" abajo).
  ref?: React.Ref<HTMLElement>
}

// Pie de página repetido en cada hoja de papel (no en la portada, que ya tiene peso
// visual propio con la ficha y la franja de estado) — responde al feedback de Camilo de
// que las hojas se sentían muy blancas, y de paso identifica una hoja suelta si el PDF
// se separa al imprimir. Posicionado con position:absolute;bottom:0 dentro de .page (en
// los capítulos, contra el min-height redondeado a hoja completa que calcula Chapter.tsx
// — ver ahí), en vez de ir en el flujo normal, para no interferir con la paginación de
// los capítulos que pueden repartirse en más de una hoja.
//
// Cuarta vuelta de diseño (Matías): la catenaria (el ícono del isotipo) "no convenció
// para nada" — pidió texto en su lugar, y de paso sumar algo de orientación ("quizás
// poner la página"). No hay números de página reales del PDF impreso (ver
// TableOfContents.tsx — un capítulo puede repartirse en 2+ hojas físicas, así que un
// contador de páginas de verdad no cuadraría con la numeración de secciones del
// documento). En su lugar se reusa la MISMA numeración corrida que ya calcula
// numberDocument() para el índice y el encabezado de cada sección (1 = Alcance y
// metodología … N = Conclusiones) — es información real y consistente con el resto del
// documento, no un contador inventado sólo para el pie.
//
// Bug real ya cazado (histórico): una versión intermedia hacía .page.chapter flex-column
// con el pie en margin-top:auto para pegarlo abajo — pero ese margen SÓLO empuja si se
// aplica al hijo DIRECTO del contenedor flex, y Chapter.tsx envolvía este componente en
// un <div ref={footerRef}> para medirlo, con lo que margin-top:auto quedaba en un nieto y
// valía 0 (el pie pegado justo tras el contenido, con la hoja en blanco debajo). De ahí
// quedan dos cosas: (1) PageFooter recibe el ref DIRECTAMENTE (React 19, sin forwardRef),
// nunca envuelto; (2) el enfoque flex se abandonó del todo — el pie es
// position:absolute;bottom:0 (ver index.css) y Chapter.tsx sólo le da el min-height
// correcto, redondeado a hoja completa.
export function PageFooter({ code, sectionNumber, totalSections, ref }: Props) {
  return (
    <footer ref={ref} className="page-footer">
      <span className="page-footer-mark">Alto Test</span>
      <span className="page-footer-wedge">
        <span className="page-footer-code">
          {code}
          {sectionNumber !== undefined && (
            <span className="page-footer-page">
              {sectionNumber} / {totalSections}
            </span>
          )}
        </span>
      </span>
    </footer>
  )
}
