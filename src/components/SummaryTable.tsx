import ChecklistAlt from 'reicon-react/icons/ChecklistAlt'
import type { ReportState } from '../types'
import type { NumberedChapter } from '../lib/chapters'
import { SEVERITY_LEVELS } from '../types'
import { EditableText } from './EditableText'
import { PageFooter } from './PageFooter'

interface Props {
  report: ReportState
  chapters: NumberedChapter[]
  number: number
  totalSections: number
  onChange: (patch: Partial<ReportState>) => void
}

const SEVERITY_LABEL = Object.fromEntries(SEVERITY_LEVELS.map((s) => [s.value, s.label]))
const SEVERITY_CLASS: Record<string, string> = {
  critical: 'severity-dot severity-critical',
  needs_action: 'severity-dot severity-needs-action',
  observation: 'severity-dot severity-observation',
  compliant: 'severity-dot severity-compliant',
}

export function SummaryTable({ report, chapters, number, totalSections, onChange }: Props) {
  const included = chapters.filter((c) => c.included)

  return (
    <section id="summary" className="page">
      <div className="section-head">
        <div className="section-head-title">
          <span className="section-icon">
            <ChecklistAlt size={16} strokeWidth={1.8} />
          </span>
          <span className="section-number">{number}.</span>
          <EditableText
            as="h2"
            className="heading-lg"
            value={report.summaryTitle}
            onChange={(summaryTitle) => onChange({ summaryTitle })}
            placeholder="Título de la síntesis"
          />
        </div>
      </div>
      <EditableText
        as="p"
        className="subheading"
        value={report.summaryIntro}
        onChange={(summaryIntro) => onChange({ summaryIntro })}
        placeholder="Bajada del resumen"
      />
      <table className="summary-grid">
        <thead>
          <tr>
            <th className="summary-col-number">N°</th>
            <th>Capítulo</th>
            <th className="summary-col-severity">Estado</th>
          </tr>
        </thead>
        <tbody>
          {included.map((chapter) => (
            <tr key={chapter.id}>
              <td className="summary-number">{chapter.number}</td>
              <td>{chapter.title}</td>
              <td className="summary-severity">
                <span className={SEVERITY_CLASS[chapter.severity]} />
                {SEVERITY_LABEL[chapter.severity]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PageFooter code={report.code} sectionNumber={number} totalSections={totalSections} />
    </section>
  )
}
