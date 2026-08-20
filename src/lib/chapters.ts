import type { ChapterState } from '../types'

export interface NumberedChapter extends ChapterState {
  number: number | null
}

export interface DocumentNumbering {
  methodologyNumber: number
  chapters: NumberedChapter[]
  summaryNumber: number
  conclusionsNumber: number
}

// Numeración corrida de todo el documento: Alcance y metodología siempre es la sección
// 1 (es fija, no se puede excluir), después vienen los capítulos incluidos, y Síntesis y
// Conclusiones se llevan los dos números siguientes — también fijas. Un capítulo que se
// deja fuera no rompe la secuencia: pierde su número y el resto se corre solo.
export function numberDocument(chapters: ChapterState[]): DocumentNumbering {
  const methodologyNumber = 1
  let n = methodologyNumber

  const numberedChapters = chapters.map((chapter) => {
    if (!chapter.included) return { ...chapter, number: null }
    n += 1
    return { ...chapter, number: n }
  })

  return {
    methodologyNumber,
    chapters: numberedChapters,
    summaryNumber: n + 1,
    conclusionsNumber: n + 2,
  }
}
