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
// se separa al imprimir. Posicionado con position:absolute (o, dentro de un capítulo,
// margin-top:auto en un flex column — ver index.css) dentro de .page, en vez de ir
// siempre en el flujo normal, para no interferir con la paginación de los capítulos que
// pueden repartirse en más de una hoja.
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
// Bug real cazado esta sesión: dentro de un capítulo, .page.chapter es flex-column y el
// pie usa margin-top:auto para pegarse abajo — pero ese margen SÓLO empuja si se aplica
// al hijo DIRECTO del contenedor flex. Chapter.tsx envolvía este componente en un <div
// ref={footerRef}> para poder medir su alto, y margin-top:auto vivía en .page-footer (un
// nieto del flex, no un hijo) — en un elemento normal de flujo (no ítem flex, no
// posicionado), margin:auto en el eje del bloque simplemente vale 0, así que el pie
// quedaba pegado justo después del contenido en vez de abajo del todo, con toda la hoja
// en blanco por debajo sin usar (confirmado con una medición directa del DOM: la sección
// medía 1056px de alto pero el pie aparecía a los ~360px, no cerca de 1056). El fix es
// que PageFooter reciba el ref directamente (React 19, sin forwardRef) para que sea el
// propio <footer> el hijo flex — no un contenedor intermedio.
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
