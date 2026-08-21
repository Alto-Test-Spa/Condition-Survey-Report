import type { ReportState, Severity } from '../types'
import { EditableText } from './EditableText'
import { RichText } from './RichText'
import { Wordmark } from './Wordmark'

interface Props {
  report: ReportState
  onChange: (patch: Partial<ReportState>) => void
}

// Orden de urgencia (no el orden alfabético ni el de captura) para la franja de la
// portada y para decidir qué colores mostrar primero.
const STATUS_ORDER: Severity[] = ['critical', 'needs_action', 'observation', 'compliant']
const STATUS_LABEL: Record<Severity, [string, string]> = {
  critical: ['crítico', 'críticos'],
  needs_action: ['requiere intervención', 'requieren intervención'],
  observation: ['observación', 'observaciones'],
  compliant: ['conforme', 'conformes'],
}
function accentClass(severity: Severity): string {
  return `severity-${severity.replace('_', '-')}`
}

// Portada = ficha del documento, no una carta formal ("Señores.../Presente,") como el
// informe de referencia de la competencia (ver CLAUDE.md, "Decisiones del usuario" —
// se sacó el saludo epistolar a propósito, ese esqueleto es lo que hacía que la portada
// se leyera casi idéntica pese a tener paleta y logo distintos). El título abre la
// página; cliente/activo/contacto/fecha/folio se leen como una fichita de hechos, mismo
// lenguaje visual (etiqueta chica arriba, valor abajo) que la ficha lateral de cada
// capítulo — ver Chapter.tsx / .chapter-aside.
export function Cover({ report, onChange }: Props) {
  const included = report.chapters.filter((c) => c.included)
  const counts = STATUS_ORDER.map((severity) => ({
    severity,
    count: included.filter((c) => c.severity === severity).length,
  })).filter((s) => s.count > 0)

  return (
    <section className="page dark cover">
      <div className="cover-brand">
        <Wordmark tone="signal" textClassName="text-[16px] text-paper" />
      </div>

      <h1 className="cover-title">
        Informe de Levantamiento Inicial
        <br />
        <EditableText
          as="span"
          className="cover-scope"
          value={report.scopeTitle}
          onChange={(scopeTitle) => onChange({ scopeTitle })}
          placeholder="Alcance del levantamiento"
        />
      </h1>

      <RichText
        className="lead"
        value={report.introduction}
        onChange={(introduction) => onChange({ introduction })}
        placeholder="Párrafo de presentación del informe."
      />

      <dl className="cover-facts">
        <div className="cover-fact">
          <dt>Cliente</dt>
          <dd>
            <EditableText
              value={report.clientName}
              onChange={(clientName) => onChange({ clientName })}
              placeholder="Empresa / cliente"
            />
          </dd>
        </div>
        <div className="cover-fact">
          <dt>Activo</dt>
          <dd>
            <EditableText
              value={report.clientAsset}
              onChange={(clientAsset) => onChange({ clientAsset })}
              placeholder="Nombre del activo / edificio"
            />
          </dd>
        </div>
        <div className="cover-fact">
          <dt>Contacto</dt>
          <dd>
            <EditableText
              value={report.clientContact}
              onChange={(clientContact) => onChange({ clientContact })}
              placeholder="Nombre de contacto"
            />
          </dd>
        </div>
        <div className="cover-fact">
          <dt>Fecha</dt>
          <dd>{report.date}</dd>
        </div>
        <div className="cover-fact">
          <dt>Folio</dt>
          <dd>{report.code}</dd>
        </div>
      </dl>

      {/* Franja de estado: foto instantánea de severidad de los capítulos incluidos —
          reemplaza la firma técnica que iba acá (se movió al cierre del informe, ver
          Conclusions.tsx). Ningún informe de referencia de la competencia muestra esto
          en portada; usa los mismos colores de acento que .chapter-aside.
          Los segmentos de la barra van agrupados por severidad (no uno por capítulo en
          el orden en que aparecen) y la leyenda de abajo usa el mismo ancho proporcional
          (flexGrow: count) que su bloque de color correspondiente, para que el número
          quede debajo de su franja — pedido explícito de Camilo. */}
      {included.length > 0 && (
        <div className="cover-status">
          <span className="cover-status-total">
            {included.length} sistema{included.length === 1 ? '' : 's'} relevado
            {included.length === 1 ? '' : 's'} en terreno
          </span>
          <div className="cover-status-bar">
            {counts.map(({ severity, count }) => (
              <span
                key={severity}
                className={`cover-status-seg ${accentClass(severity)}`}
                style={{ flexGrow: count }}
              />
            ))}
          </div>
          <div className="cover-status-legend">
            {counts.map(({ severity, count }) => (
              <span key={severity} className="cover-status-item" style={{ flexGrow: count }}>
                <span className={`cover-status-dot ${accentClass(severity)}`} />
                {count} {count === 1 ? STATUS_LABEL[severity][0] : STATUS_LABEL[severity][1]}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
