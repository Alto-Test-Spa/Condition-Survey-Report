import Eye from 'reicon-react/icons/Eye'
import Camera from 'reicon-react/icons/Camera'
import ClipboardCheck from 'reicon-react/icons/ClipboardCheck'
import type { ChapterState } from '../types'
import { EditableText } from './EditableText'
import { RichText } from './RichText'
import { SpecTable } from './SpecTable'
import { PhotoGallery } from './PhotoGallery'
import { SeverityBadge } from './SeverityBadge'
import { IconEyebrow } from './IconEyebrow'
import { CHAPTER_ICONS, DEFAULT_CHAPTER_ICON } from '../lib/chapterIcons'

interface Props {
  chapter: ChapterState
  number: number | null
  onChange: (chapter: ChapterState) => void
}

export function Chapter({ chapter, number, onChange }: Props) {
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
        <SeverityBadge value={chapter.severity} onChange={(severity) => patch({ severity })} />
      </header>

      <SpecTable
        title={chapter.specTitle}
        onTitleChange={(specTitle) => patch({ specTitle })}
        rows={chapter.spec}
        onChange={(spec) => patch({ spec })}
      />

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
    </section>
  )
}
