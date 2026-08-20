export interface Env {
  REPORTS: KVNamespace
  ACCESS_KEY: string
}

// Contrato universal: el Worker nunca necesita entender la forma interna del
// documento de cada app (informe_levantamiento, propuesta_tecnica y
// propuesta_economica tienen modelos de datos totalmente distintos — la
// última ni siquiera tiene un campo fijo de "cliente", vive en un bag de
// texto libre). Cada app manda/recibe siempre este sobre; `doc` es opaco.
interface ReportEnvelope {
  code: string
  kind: string
  client: string
  date: string
  updatedAt: number
  doc: unknown
}

type ReportSummary = Omit<ReportEnvelope, 'doc'>

// CORS abierto a propósito: la autenticación es un Bearer token que el JS de
// cada app adjunta a mano (no cookies), así que restringir el Origin no suma
// seguridad real y sí rompe a propuesta_tecnica/propuesta_economica, que se
// abren como archivo local (`file://`) y mandan Origin "null" en sus fetch.
function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }
}

function json(data: unknown, status: number, headers: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  })
}

// Clave compartida simple, no autenticación por persona: alcanza para que este endpoint
// no quede abierto a cualquiera que encuentre la URL (estos documentos traen datos
// comerciales y hallazgos reales de seguridad de un edificio), pero no protege contra
// alguien con acceso legítimo a la clave que decide compartirla fuera del equipo.
// Ver CLAUDE.md, sección "Acceso".
function isAuthorized(request: Request, env: Env): boolean {
  const auth = request.headers.get("Authorization") ?? ""
  const key = auth.startsWith("Bearer ") ? auth.slice(7) : ""
  return key.length > 0 && key === env.ACCESS_KEY
}

const INDEX_KEY = "index"

async function readIndex(env: Env): Promise<ReportSummary[]> {
  const raw = await env.REPORTS.get(INDEX_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as ReportSummary[]
  } catch {
    return []
  }
}

// Sin transacciones en KV: dos guardados casi simultáneos pueden pisarse el índice entre
// sí (lee-modifica-escribe no atómico). Para el volumen de un equipo chico el riesgo es
// bajo y se autocorrige solo en el siguiente guardado — no vale la pena una cola/lock
// para esto todavía.
async function writeIndex(env: Env, summaries: ReportSummary[]) {
  await env.REPORTS.put(INDEX_KEY, JSON.stringify(summaries))
}

function storageKey(kind: string, code: string): string {
  return `report:${kind}:${code}`
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders()

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers })
    }

    if (!isAuthorized(request, env)) {
      return json({ ok: false, error: "unauthorized" }, 401, headers)
    }

    const url = new URL(request.url)
    const parts = url.pathname.split("/").filter(Boolean)

    if (parts[0] !== "reports" || !parts[1]) {
      return json({ ok: false, error: "not_found" }, 404, headers)
    }

    const kind = decodeURIComponent(parts[1])
    const code = parts[2] ? decodeURIComponent(parts[2]) : null

    // GET /reports/:kind — listado liviano (folio, cliente, fecha) filtrado por tipo de
    // documento, para el menú de Historial de cada app.
    if (!code) {
      if (request.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405, headers)
      const summaries = (await readIndex(env)).filter((s) => s.kind === kind)
      summaries.sort((a, b) => b.updatedAt - a.updatedAt)
      return json(summaries, 200, headers)
    }

    if (request.method === "GET") {
      const raw = await env.REPORTS.get(storageKey(kind, code))
      if (!raw) return json({ ok: false, error: "not_found" }, 404, headers)
      return new Response(raw, { status: 200, headers: { ...headers, "Content-Type": "application/json" } })
    }

    if (request.method === "PUT") {
      let body: Partial<ReportEnvelope>
      try {
        body = await request.json()
      } catch {
        return json({ ok: false, error: "invalid_json" }, 400, headers)
      }
      if (typeof body.code !== "string" || !body.code) {
        return json({ ok: false, error: "missing_code" }, 400, headers)
      }
      if (body.code !== code) {
        return json({ ok: false, error: "code_mismatch" }, 400, headers)
      }

      const envelope: ReportEnvelope = {
        code,
        kind,
        client: typeof body.client === "string" ? body.client : "",
        date: typeof body.date === "string" ? body.date : "",
        updatedAt: Date.now(),
        doc: body.doc,
      }
      await env.REPORTS.put(storageKey(kind, code), JSON.stringify(envelope))

      const summaries = await readIndex(env)
      const next = summaries.filter((s) => !(s.kind === kind && s.code === code))
      next.push({ code, kind, client: envelope.client, date: envelope.date, updatedAt: envelope.updatedAt })
      await writeIndex(env, next)

      return json({ ok: true, updatedAt: envelope.updatedAt }, 200, headers)
    }

    if (request.method === "DELETE") {
      await env.REPORTS.delete(storageKey(kind, code))
      const summaries = await readIndex(env)
      await writeIndex(
        env,
        summaries.filter((s) => !(s.kind === kind && s.code === code)),
      )
      return json({ ok: true }, 200, headers)
    }

    return json({ ok: false, error: "method_not_allowed" }, 405, headers)
  },
}
