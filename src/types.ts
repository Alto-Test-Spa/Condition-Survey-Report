export type Severity = 'critical' | 'needs_action' | 'observation' | 'compliant'

export const SEVERITY_LEVELS: { value: Severity; label: string }[] = [
  { value: 'critical', label: 'Crítico' },
  { value: 'needs_action', label: 'Requiere intervención' },
  { value: 'observation', label: 'Observación' },
  { value: 'compliant', label: 'Conforme' },
]

export interface PhotoItem {
  id: string
  dataUrl: string
  caption: string
}

export interface SpecRow {
  id: string
  field: string
  value: string
}

export interface ChapterState {
  id: string
  title: string
  included: boolean
  severity: Severity
  specTitle: string
  spec: SpecRow[]
  observations: string
  photos: PhotoItem[]
  recommendations: string
}

export interface ReportState {
  code: string
  date: string

  clientName: string
  clientAsset: string
  clientContact: string

  scopeTitle: string
  introduction: string
  methodologyTitle: string
  methodology: string

  chapters: ChapterState[]

  summaryTitle: string
  summaryIntro: string

  conclusionsTitle: string
  conclusions: string
  closingInvitation: string

  authorName: string
  authorRole: string
  authorEmail: string
}
