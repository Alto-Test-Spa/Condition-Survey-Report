import { useState } from 'react'
import SearchNormal from 'reicon-react/icons/SearchNormal'
import { useReportStore } from './lib/store'
import { numberDocument } from './lib/chapters'
import type { ChapterState } from './types'
import { Toolbar } from './components/Toolbar'
import { ChaptersPanel } from './components/ChaptersPanel'
import { Cover } from './components/Cover'
import { TableOfContents } from './components/TableOfContents'
import { Chapter } from './components/Chapter'
import { SummaryTable } from './components/SummaryTable'
import { Conclusions } from './components/Conclusions'
import { EditableText } from './components/EditableText'
import { RichText } from './components/RichText'

interface Props {
  onAuthExpired: () => void
}

export default function ReportEditor({ onAuthExpired }: Props) {
  const { report, setReport, reset, undo, canUndo, loadReport, syncState, booting } =
    useReportStore(onAuthExpired)
  const [showGuides, setShowGuides] = useState(false)
  const [showChapters, setShowChapters] = useState(false)

  const { methodologyNumber, chapters: numberedChapters, summaryNumber, conclusionsNumber } = numberDocument(
    report.chapters,
  )

  function patchReport(partial: Partial<typeof report>) {
    setReport((prev) => ({ ...prev, ...partial }))
  }

  function patchChapter(id: string, next: ChapterState) {
    setReport((prev) => ({
      ...prev,
      chapters: prev.chapters.map((c) => (c.id === id ? next : c)),
    }))
  }

  function toggleChapter(id: string) {
    setReport((prev) => ({
      ...prev,
      chapters: prev.chapters.map((c) => (c.id === id ? { ...c, included: !c.included } : c)),
    }))
  }

  if (booting) {
    return <div className="boot-screen">Cargando el último informe…</div>
  }

  return (
    <div className={showGuides ? 'show-guides' : ''}>
      <Toolbar
        report={report}
        onChange={patchReport}
        showGuides={showGuides}
        onToggleGuides={() => setShowGuides((v) => !v)}
        showChapters={showChapters}
        onToggleChapters={() => setShowChapters((v) => !v)}
        onNew={reset}
        onUndo={undo}
        canUndo={canUndo}
        onLoadReport={loadReport}
        syncState={syncState}
      />

      {showChapters && <ChaptersPanel chapters={numberedChapters} onToggle={toggleChapter} />}

      <main className="sheet">
        <Cover report={report} onChange={patchReport} />
        <TableOfContents
          chapters={numberedChapters}
          methodologyNumber={methodologyNumber}
          summaryNumber={summaryNumber}
          conclusionsNumber={conclusionsNumber}
        />

        <section id="methodology" className="page">
          <div className="section-head">
            <div className="section-head-title">
              <span className="section-icon">
                <SearchNormal size={16} strokeWidth={1.8} />
              </span>
              <span className="section-number">{methodologyNumber}.</span>
              <EditableText
                as="h2"
                className="heading-lg"
                value={report.methodologyTitle}
                onChange={(methodologyTitle) => patchReport({ methodologyTitle })}
                placeholder="Título de metodología"
              />
            </div>
          </div>
          <RichText
            className="lead"
            value={report.methodology}
            onChange={(methodology) => patchReport({ methodology })}
            placeholder="Describa el alcance y la metodología del levantamiento."
          />
        </section>

        {numberedChapters.map((chapter) => (
          <Chapter
            key={chapter.id}
            chapter={chapter}
            number={chapter.number}
            onChange={(next) => patchChapter(chapter.id, next)}
          />
        ))}

        <SummaryTable
          report={report}
          chapters={numberedChapters}
          number={summaryNumber}
          onChange={patchReport}
        />
        <Conclusions report={report} number={conclusionsNumber} onChange={patchReport} />
      </main>
    </div>
  )
}
