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
  clientAsset: string
}

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

export function Chapter({ chapter, number, onChange, code, clientAsset }: Props) {
  if (!chapter.included) return null

  function patch(partial: Partial<ChapterState>) {
    onChange({ ...chapter, ...partial })
  }

  const ChapterIcon = CHAPTER_ICONS[chapter.id] ?? DEFAULT_CHAPTER_ICON

  return (
    <section id={`chapter-${chapter.id}`} className="page chapter">
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
      <PageFooter code={code} clientAsset={clientAsset} />
    </section>
  )
}
