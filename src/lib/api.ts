import type { ReportState } from '../types'

const BASE_URL = import.meta.env.VITE_REPORTS_ENDPOINT
const ACCESS_KEY_STORAGE = 'altotest_informe_levantamiento_access_key'

// El Worker es compartido con propuesta_tecnica y propuesta_economica (ver
// worker/src/index.ts) — "informe" es el tipo de documento de esta app, parte de la
// ruta (/reports/informe/:code), no algo que el Worker necesite conocer de antemano.
const KIND = 'informe'

// Estado del último intento de guardado, para el indicador de la barra (SyncStatus.tsx).
// 'offline' es una falla de red (fetch nunca llegó al Worker); 'error' es el Worker
// respondiendo con un error real (5xx, cuerpo inválido).
export type SyncState = 'idle' | 'saving' | 'saved' | 'offline' | 'error'

export function getStoredAccessKey(): string {
  return localStorage.getItem(ACCESS_KEY_STORAGE) ?? ''
}

export function setStoredAccessKey(key: string) {
  localStorage.setItem(ACCESS_KEY_STORAGE, key)
}

export function clearStoredAccessKey() {
  localStorage.removeItem(ACCESS_KEY_STORAGE)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const key = getStoredAccessKey()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
      Authorization: `Bearer ${key}`,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError(res.status, text || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export interface ReportSummary {
  code: string
  client: string
  date: string
  updatedAt: number
}

interface ReportEnvelope {
  code: string
  kind: string
  client: string
  date: string
  updatedAt: number
  doc: ReportState
}

// Se usa tanto para validar una clave recién escrita en el portón de acceso como para
// detectar, en cualquier otro llamado, que la clave guardada dejó de servir.
export async function verifyAccessKey(key: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/reports/${KIND}`, { headers: { Authorization: `Bearer ${key}` } })
  return res.ok
}

export function listReports(): Promise<ReportSummary[]> {
  return request<ReportSummary[]>(`/reports/${KIND}`)
}

export async function fetchReport(code: string): Promise<ReportState> {
  const envelope = await request<ReportEnvelope>(`/reports/${KIND}/${encodeURIComponent(code)}`)
  return envelope.doc
}

export function saveReport(report: ReportState): Promise<{ ok: boolean; updatedAt: number }> {
  const client = [report.clientName, report.clientAsset].filter(Boolean).join(' — ')
  return request(`/reports/${KIND}/${encodeURIComponent(report.code)}`, {
    method: 'PUT',
    body: JSON.stringify({ code: report.code, client, date: report.date, doc: report }),
  })
}

export function deleteReport(code: string): Promise<{ ok: boolean }> {
  return request(`/reports/${KIND}/${encodeURIComponent(code)}`, { method: 'DELETE' })
}
