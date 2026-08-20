import type { NumberedChapter } from '../lib/chapters'

interface Props {
  chapters: NumberedChapter[]
  onToggle: (id: string) => void
}

// Panel para dejar capítulos fuera sin borrarlos — igual que en propuesta_tecnica, el
// contenido se conserva y el resto se renumera solo. El número mostrado es el que le
// toca a cada capítulo AHORA, para que se vea de inmediato cómo se corre el resto al
// marcar/desmarcar uno.
export function ChaptersPanel({ chapters, onToggle }: Props) {
  return (
    <div className="chapters-panel no-print">
      <p className="eyebrow">Capítulos del informe</p>
      <div className="chapters-list">
        {chapters.map((chapter) => (
          <label key={chapter.id} className={`chapter-toggle ${chapter.included ? '' : 'is-off'}`}>
            <input type="checkbox" checked={chapter.included} onChange={() => onToggle(chapter.id)} />
            <span className="chapter-toggle-number">{chapter.number ?? '—'}</span>
            {chapter.title}
          </label>
        ))}
      </div>
    </div>
  )
}
