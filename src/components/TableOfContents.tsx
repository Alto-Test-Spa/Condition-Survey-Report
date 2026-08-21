import SearchNormal from 'reicon-react/icons/SearchNormal'
import ChecklistAlt from 'reicon-react/icons/ChecklistAlt'
import ShieldCheck from 'reicon-react/icons/ShieldCheck'
import type { NumberedChapter } from '../lib/chapters'
import { CHAPTER_ICONS, DEFAULT_CHAPTER_ICON } from '../lib/chapterIcons'
import { PageFooter } from './PageFooter'

interface Props {
  chapters: NumberedChapter[]
  methodologyNumber: number
  summaryNumber: number
  conclusionsNumber: number
  code: string
  clientAsset: string
}

// Los números de página reales no se calculan (no hay paginación fiable sin imprimir de
// verdad): el índice enlaza a cada capítulo por ancla, y esos enlaces se conservan en el
// PDF que genera el navegador — igual que en propuesta_tecnica. Los números de sección sí
// son reales: vienen de numberDocument, corridos de 1 a N para todo el documento.
export function TableOfContents({
  chapters,
  methodologyNumber,
  summaryNumber,
  conclusionsNumber,
  code,
  clientAsset,
}: Props) {
  const included = chapters.filter((c) => c.included)

  return (
    <section className="page toc-page">
      <p className="eyebrow">Índice</p>
      <ol className="toc">
        <li>
          <a className="toc-link" href="#methodology">
            <SearchNormal size={15} strokeWidth={1.8} className="toc-icon" />
            <span className="toc-number">{methodologyNumber}.</span>
            <span className="toc-title">Alcance y metodología</span>
          </a>
        </li>
        {included.map((chapter) => {
          const Icon = CHAPTER_ICONS[chapter.id] ?? DEFAULT_CHAPTER_ICON
          return (
            <li key={chapter.id}>
              <a className="toc-link" href={`#chapter-${chapter.id}`}>
                <Icon size={15} strokeWidth={1.8} className="toc-icon" />
                <span className="toc-number">{chapter.number}.</span>
                <span className="toc-title">{chapter.title}</span>
              </a>
            </li>
          )
        })}
        <li>
          <a className="toc-link" href="#summary">
            <ChecklistAlt size={15} strokeWidth={1.8} className="toc-icon" />
            <span className="toc-number">{summaryNumber}.</span>
            <span className="toc-title">Síntesis de hallazgos</span>
          </a>
        </li>
        <li>
          <a className="toc-link" href="#conclusions">
            <ShieldCheck size={15} strokeWidth={1.8} className="toc-icon" />
            <span className="toc-number">{conclusionsNumber}.</span>
            <span className="toc-title">Conclusiones y continuidad</span>
          </a>
        </li>
      </ol>
      <PageFooter code={code} clientAsset={clientAsset} />
    </section>
  )
}
