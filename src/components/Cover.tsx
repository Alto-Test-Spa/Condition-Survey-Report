import type { ReportState } from '../types'
import { EditableText } from './EditableText'
import { RichText } from './RichText'
import { Wordmark } from './Wordmark'

interface Props {
  report: ReportState
  onChange: (patch: Partial<ReportState>) => void
}

// Portada = carta de presentación (patrón que se vio en el informe de referencia de la
// competencia): señores/cliente, folio, fecha, párrafo de introducción y firma técnica.
export function Cover({ report, onChange }: Props) {
  return (
    <section className="page dark cover">
      <div className="cover-meta">
        <Wordmark tone="signal" textClassName="text-[16px] text-paper" />
        <div className="cover-meta-fields">
          <span className="eyebrow">Folio {report.code}</span>
          <span className="eyebrow">Fecha {report.date}</span>
        </div>
      </div>

      <div className="cover-addressee">
        <p>Señores</p>
        <EditableText
          as="p"
          value={report.clientName}
          onChange={(clientName) => onChange({ clientName })}
          placeholder="Empresa / cliente"
        />
        <EditableText
          as="p"
          value={report.clientAsset}
          onChange={(clientAsset) => onChange({ clientAsset })}
          placeholder="Nombre del activo / edificio"
        />
        <EditableText
          as="p"
          value={report.clientContact}
          onChange={(clientContact) => onChange({ clientContact })}
          placeholder="Nombre de contacto"
        />
        <p>Presente,</p>
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

      <div className="signature-block">
        <EditableText
          as="p"
          className="signature-name"
          value={report.authorName}
          onChange={(authorName) => onChange({ authorName })}
          placeholder="Nombre del responsable técnico"
        />
        <EditableText
          as="p"
          className="signature-role"
          value={report.authorRole}
          onChange={(authorRole) => onChange({ authorRole })}
          placeholder="Cargo"
        />
        <EditableText
          as="p"
          className="signature-role"
          value={report.authorEmail}
          onChange={(authorEmail) => onChange({ authorEmail })}
          placeholder="correo@altotest.cl"
        />
      </div>
    </section>
  )
}
