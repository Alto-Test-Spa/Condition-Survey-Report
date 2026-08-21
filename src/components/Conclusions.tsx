import ShieldCheck from 'reicon-react/icons/ShieldCheck'
import Flag from 'reicon-react/icons/Flag'
import type { ReportState } from '../types'
import { EditableText } from './EditableText'
import { RichText } from './RichText'
import { IconEyebrow } from './IconEyebrow'
import { PageFooter } from './PageFooter'

interface Props {
  report: ReportState
  number: number
  onChange: (patch: Partial<ReportState>) => void
}

// Cierre del informe: la síntesis técnica y, separada de ella, la invitación a
// continuar el ciclo (Diseño → Instalación → Certificación). Tono de continuidad, no de
// venta — ver lib/template.ts para la redacción por defecto.
export function Conclusions({ report, number, onChange }: Props) {
  return (
    <section id="conclusions" className="page">
      <div className="section-head">
        <div className="section-head-title">
          <span className="section-icon">
            <ShieldCheck size={16} strokeWidth={1.8} />
          </span>
          <span className="section-number">{number}.</span>
          <EditableText
            as="h2"
            className="heading-lg"
            value={report.conclusionsTitle}
            onChange={(conclusionsTitle) => onChange({ conclusionsTitle })}
            placeholder="Título de conclusiones"
          />
        </div>
      </div>
      <RichText
        className="lead"
        value={report.conclusions}
        onChange={(conclusions) => onChange({ conclusions })}
        placeholder="Síntesis técnica del levantamiento."
      />
      <div className="closing-box">
        <IconEyebrow icon={Flag}>Próximos pasos</IconEyebrow>
        <RichText
          className="lead"
          value={report.closingInvitation}
          onChange={(closingInvitation) => onChange({ closingInvitation })}
          placeholder="Invitación a continuar con el ciclo de servicios."
        />
      </div>

      {/* Firma técnica: vivía en la portada, se movió acá (cierre del documento, no
          apertura) al reemplazar el pie de portada por la franja de estado — ver
          Cover.tsx. */}
      <div className="closing-signature">
        <EditableText
          as="p"
          className="closing-signature-name"
          value={report.authorName}
          onChange={(authorName) => onChange({ authorName })}
          placeholder="Nombre del responsable técnico"
        />
        <EditableText
          as="p"
          className="closing-signature-role"
          value={report.authorRole}
          onChange={(authorRole) => onChange({ authorRole })}
          placeholder="Cargo"
        />
        <EditableText
          as="p"
          className="closing-signature-role"
          value={report.authorEmail}
          onChange={(authorEmail) => onChange({ authorEmail })}
          placeholder="correo@altotest.cl"
        />
      </div>
      <PageFooter code={report.code} clientAsset={report.clientAsset} />
    </section>
  )
}
