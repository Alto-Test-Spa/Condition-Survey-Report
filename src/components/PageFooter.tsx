interface Props {
  code: string
  clientAsset: string
}

// Pie de página repetido en cada hoja de papel (no en la portada, que ya tiene peso
// visual propio con la ficha y la franja de estado) — responde al feedback de Camilo de
// que las hojas se sentían muy blancas, y de paso identifica una hoja suelta si el PDF
// se separa al imprimir. Posicionado con position:absolute dentro de .page (ver
// index.css, "Pie de página") en vez de ir en el flujo normal, para no interferir con la
// paginación de los capítulos que pueden repartirse en más de una hoja.
export function PageFooter({ code, clientAsset }: Props) {
  const doc = [clientAsset, code].filter(Boolean).join(' · ')
  return (
    <footer className="page-footer">
      <span className="page-footer-brand">Alto Test</span>
      <span className="page-footer-doc">{doc || 'Informe de Levantamiento Inicial'}</span>
    </footer>
  )
}
