import { useEffect, useRef, useState } from 'react'
import type { ReportState } from '../types'
import { initialTemplate, normalizeReport } from './template'
import { generateCode, isValidCode } from './code'
import { todayDate } from './date'
import { fetchReport, saveReport, ApiError } from './api'
import type { SyncState } from './api'

// Ya no es "el documento": es sólo una copia local del último informe activo, para no
// mostrar una pantalla en blanco si el Worker no responde al abrir la app (ver
// CLAUDE.md, "Nube como fuente de verdad"). La nube manda — esto es un mirror, no una
// fuente de datos independiente.
const MIRROR_KEY = 'altotest_informe_levantamiento_mirror'
const PREVIOUS_KEY = `${MIRROR_KEY}_previous`

function withCodeAndDate(report: ReportState): ReportState {
  return {
    ...report,
    code: report.code && isValidCode(report.code) ? report.code : generateCode(),
    date: report.date || todayDate(),
  }
}

function readMirror(): ReportState | null {
  const saved = localStorage.getItem(MIRROR_KEY)
  if (!saved) return null
  try {
    return normalizeReport({ ...initialTemplate(), ...(JSON.parse(saved) as Partial<ReportState>) })
  } catch {
    return null
  }
}

function writeMirror(report: ReportState) {
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify(report))
  } catch (e) {
    console.warn('No se pudo escribir la copia local del informe:', e)
  }
}

export function useReportStore(onAuthExpired: () => void) {
  const [report, setReport] = useState<ReportState>(() => withCodeAndDate(readMirror() ?? initialTemplate()))
  const [canUndo, setCanUndo] = useState(() => !!localStorage.getItem(PREVIOUS_KEY))
  const [syncState, setSyncState] = useState<SyncState>('idle')
  // Sin mirror no hay nada que volver a pedirle al Worker: arranca "no booting" directo.
  const [booting, setBooting] = useState(() => !!readMirror())
  const firstChangeAfterReset = useRef(false)
  const saveSeq = useRef(0)
  // Si la sesión arranca sin mirror local, `report` nace de initialTemplate() —
  // un informe en blanco que nadie tocó. Sin esta guarda, el solo hecho de
  // abrir la app (o que la abra un bot, o correr un test) crea un documento
  // permanente en el Worker. Se compara contra una foto del `report` del
  // primer render (por referencia, no un flag consumido una vez): React
  // StrictMode monta cada efecto dos veces en desarrollo (monta → limpia →
  // monta) y un flag booleano se "gasta" en la pasada fantasma, dejando la
  // real sin protección — probado en propuesta_tecnica_react, ver su
  // CLAUDE.md. Sólo aplica si no había mirror; una sesión que vuelve con
  // cambios sin sincronizar sigue guardando como siempre.
  const hadMirrorOnBoot = useRef(!!readMirror())
  const pristineReport = useRef(report)
  // Ref en vez de dependencia del efecto: sólo nos interesa la versión más reciente del
  // callback cuando de verdad se necesita (401), no que el timer de autoguardado se
  // reinicie cada vez que App.tsx vuelve a renderizar y crea la función de nuevo. Se
  // sincroniza en un efecto (no durante el render) para no leer/escribir el ref fuera
  // de donde React lo permite.
  const onAuthExpiredRef = useRef(onAuthExpired)
  useEffect(() => {
    onAuthExpiredRef.current = onAuthExpired
  })

  // Al montar: si había un informe activo (mirror local), se vuelve a pedir al Worker
  // por si cambió desde otro dispositivo — la nube manda, el mirror es sólo para no
  // dejar la pantalla en blanco mientras llega la respuesta o si no hay conexión.
  useEffect(() => {
    const mirror = readMirror()
    if (!mirror) return
    fetchReport(mirror.code)
      .then((fresh) => {
        setReport(fresh)
        writeMirror(fresh)
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          onAuthExpiredRef.current()
          return
        }
        if (e instanceof ApiError && e.status === 404) return // informe nuevo, nunca guardado
        setSyncState('offline')
      })
      .finally(() => setBooting(false))
  }, [])

  useEffect(() => {
    const isUntouched = !hadMirrorOnBoot.current && report === pristineReport.current
    if (isUntouched) return
    const seq = ++saveSeq.current
    const t = setTimeout(async () => {
      writeMirror(report)
      setSyncState('saving')
      try {
        await saveReport(report)
        if (saveSeq.current === seq) setSyncState('saved')
      } catch (e) {
        if (saveSeq.current !== seq) return
        if (e instanceof ApiError) {
          if (e.status === 401) {
            onAuthExpiredRef.current()
            return
          }
          setSyncState('error')
        } else {
          setSyncState('offline')
        }
      }
      if (firstChangeAfterReset.current) {
        firstChangeAfterReset.current = false
        localStorage.removeItem(PREVIOUS_KEY)
        setCanUndo(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [report])

  function reset() {
    localStorage.setItem(PREVIOUS_KEY, JSON.stringify(report))
    firstChangeAfterReset.current = true
    setCanUndo(true)
    setReport(withCodeAndDate(initialTemplate()))
  }

  function undo() {
    const saved = localStorage.getItem(PREVIOUS_KEY)
    if (!saved) return
    setReport(JSON.parse(saved))
    localStorage.removeItem(PREVIOUS_KEY)
    firstChangeAfterReset.current = false
    setCanUndo(false)
  }

  // Reemplaza el informe activo por uno que viene de otro lado (abrir del Historial).
  // A diferencia de "Deshacer" (un solo paso), esto permite volver a CUALQUIER informe
  // guardado en el servidor.
  function loadReport(incoming: ReportState) {
    setReport(incoming)
  }

  return { report, setReport, reset, undo, canUndo, loadReport, syncState, booting }
}
