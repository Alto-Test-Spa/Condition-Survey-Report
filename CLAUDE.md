# CLAUDE.md — Informe de Levantamiento Inicial (Alto Test)

Contexto para retomar este proyecto sin releer todo el chat. Aquí están las
**decisiones y las trampas**, no un tutorial de React. Este proyecto vive en
`informes/` (ver `../../CONTEXTO.md` para el mapa completo de carpetas de
Alto Test). Ver también `../../venta/propuesta_tecnica_react/CLAUDE.md` y
`../../venta/propuesta_economica_react/CLAUDE.md` (mismo autor, mismas
convenciones de fondo — los tres son Vite+React+TS+Tailwind desde el
2026-08-20, cuando se reescribieron los dos vanilla que le quedaban a
`venta/`; antes de esa fecha estas notas comparaban contra un stack distinto,
ver "Decisiones del usuario" y "Pendientes" más abajo para el historial). Los
tres comparten el mismo Worker, ver "Arquitectura de datos" más abajo.
`/home/meraki/merakilabs/propuestas/generador/CLAUDE.md` (de ahí sale el
patrón de Historial y el stack Vite+React+Tailwind que usa esta carpeta) y
`../../site/worker/` (de ahí sale el patrón de Worker que se usa acá: CORS,
`Env`, secretos con `wrangler secret put`).

## Qué es

Una app web (no un documento estático de un solo `index.html`, a diferencia de
sus hermanos) con la que Alto Test genera el **Informe de Levantamiento
Inicial** — el primero de una futura familia de informes de "condiciones
iniciales" y, dentro del ciclo completo que gestiona Alto Test
(Diagnóstico → Diseño → Instalación → Certificación → Mantención), es
literalmente el documento del primer paso. Este ejemplar concreto es
**"Sistemas de Anclaje y Accesibilidad"**.

**No es un documento de venta.** El tono es técnico, objetivo, y transmite
preocupación genuina por lo que se encontró — citando normativa (EN 795:2012,
EN 365:2004, NCh 1258, D.S. N°594), con fichas técnicas y fotos de respaldo.
La única "venta" es sutil y va al final (Conclusiones → "Próximos pasos"):
invita a seguir con el resto del ciclo, sin presionar.

Se revisó como referencia de **contenido y estructura** (no de diseño) un
informe real de la competencia (Vertical SPA), guardado en
`ejemplo_vrope.pdf` (gitignored, sólo local). De ahí salió el patrón
ficha técnica → observaciones → recomendaciones por capítulo y las normas
citadas. Lo que se hizo **distinto a propósito**: las fotos van intercaladas
en el cuerpo de cada capítulo, no en un anexo al final (pedido explícito del
cliente), y el diseño visual es 100% de Alto Test (paleta papel/tinta/acero/
naranjo, IBM Plex, catenaria) — nada de la identidad de Vertical SPA.

**Sin base de datos tradicional, pero con backend propio.** Los informes se
guardan en Cloudflare Workers KV a través de un Worker chico (`worker/`), no
en el navegador — ver "Arquitectura de datos" más abajo para el porqué. El
"envío" del informe sigue siendo el PDF que genera `window.print()`.

## Stack — y por qué éste y no el de los hermanos

**Frontend:** Vite 8 + React 19 + TypeScript + Tailwind v4
(`@tailwindcss/vite`, sin config aparte — el theme vive en `@theme` dentro de
`src/index.css`). `reicon-react` para íconos. `oxlint` para lint. IBM Plex
Sans/Mono por Google Fonts (mismas que `site/` y `propuesta_tecnica`).

**Backend:** un Cloudflare Worker (`worker/`, proyecto npm **independiente**,
mismo patrón que `site/worker` — no se instala con el `npm install` de la
raíz) + Workers KV como almacén. Sin framework (fetch handler plano, como
`site/worker`), sin ORM, sin base de datos relacional.

```bash
npm run dev              # localhost:5210 (puerto fijo, no el 5173 por defecto)
npm run build             # tsc -b && vite build
npm run lint                # oxlint

cd worker && npm install    # proyecto aparte, instalar una vez
npm run dev                  # wrangler dev, localhost:8787 — con KV local simulado
npm run deploy                # wrangler deploy (real, a Cloudflare)
```

**Por qué React acá y vanilla en `propuesta_tecnica`/`propuesta_economica`:**
pedido explícito del usuario (Matías), siguiendo el patrón de
`merakilabs/propuestas/generador` (Historial, `useReportStore`, autoguardado)
en vez del patrón `Store`/`S()` vanilla de `propuesta_tecnica`. No es una
decisión técnica unilateral — si se plantea "por qué no vanilla como los
otros", la respuesta es que así lo pidió el cliente para este documento en
particular.

**Por qué `reicon-react` y no `lucide-react`:** el proyecto arrancó con
`lucide-react` (como `site/`), pero el usuario pidió explícitamente cambiar a
`reicon-react` (como `generador/`) para tener más variedad de íconos
temáticos por capítulo. Se migró completo, no quedan imports de `lucide-react`.
Íconos siempre `weight="Outline"` (default), importados por ícono
(`reicon-react/icons/Nombre`), nunca desde el barrel — ver "Bugs ya cazados"
más abajo, agregar muchos de golpe rompe el dev server.

**Por qué un Worker + KV y no localStorage puro:** ver "Arquitectura de
datos" — resumen: `localStorage` está atado al navegador de una sola persona
en un solo dispositivo, y este informe lo tiene que poder ver/editar más de
un técnico de Alto Test desde donde sea que estén.

**Código en inglés, comentarios en español:** instrucción explícita del
usuario — todo identificador (variables, funciones, tipos, nombres de
archivo/componente) va en inglés; los comentarios van en español; el
**contenido del documento** (lo que lee el cliente: títulos, textos de
ejemplo, placeholders) va en español porque es lo que se le entrega a un
cliente chileno. No mezclar estos tres registros. Aplica también al Worker.

## Arquitectura

```
src/
  App.tsx                  portón de acceso: pide/verifica la clave compartida contra el
                            Worker (ver "Acceso") y sólo entonces monta ReportEditor
  ReportEditor.tsx           lo que antes era App.tsx entero: Toolbar + panel de
                             capítulos + .sheet con Cover, TOC, Alcance y metodología
                             (inline), capítulos, Síntesis, Conclusiones
  index.css                  @theme (paleta Alto Test) + toda la paginación de
                              impresión + estilos de cada bloque
  types.ts                    ReportState, ChapterState, SpecRow, PhotoItem, Severity
  lib/
    template.ts                initialTemplate() — el documento en blanco, con los 4
                                capítulos de inspección; "anchors" viene con contenido
                                de ejemplo ya escrito (es el capítulo de referencia)
    store.ts                    useReportStore: estado activo, autoguardado (debounce
                                3 s + guard de no-op) hacia el Worker, mirror local de
                                resiliencia, Nueva/Deshacer — ver "Nube como fuente de verdad"
    api.ts                       lib/api.ts: fetchReport/saveReport/listReports/
                                 deleteReport/verifyAccessKey — el único lugar que le
                                 habla al Worker
    chapters.ts                   numberDocument() — el único lugar que calcula
                                  números de sección, ver "Numeración" más abajo
    chapterIcons.ts                 mapa id de capítulo → ícono reicon (para el
                                    encabezado del capítulo y el índice)
    code.ts                         generateCode() (folio), generateId(), isValidCode()
    date.ts                          fecha dd/mm/aaaa: hoy, autoformato, validación
    image.ts                          compressImage() — comprime una foto antes de
                                      guardarla (ver "Fotos" más abajo)
    richtext.ts                       sanitizeRichHtml() — saneador de los campos ricos
  components/
    AccessGate.tsx, SyncStatus.tsx      portón de clave y estado de guardado — ver "Acceso"
    Toolbar.tsx, ChaptersPanel.tsx,
      HistoryMenu.tsx                    no-print, controles del documento
    Cover.tsx, TableOfContents.tsx        portada y índice
    Chapter.tsx, SpecTable.tsx, PhotoGallery.tsx,
      SeverityBadge.tsx, IconEyebrow.tsx   un capítulo de inspección y sus piezas
    SummaryTable.tsx, Conclusions.tsx       cierre del documento
    EditableText.tsx, RichText.tsx           primitivas de edición (ver abajo)
    Logomark.tsx, Wordmark.tsx                 marca — variante propia, ver "Marca"

worker/                    proyecto npm INDEPENDIENTE (su propio package.json/
                            wrangler.jsonc), igual patrón que site/worker
  src/index.ts                fetch handler: GET/PUT/DELETE /reports(/:code), auth por
                               clave compartida, mantiene un índice de resúmenes en KV
  wrangler.jsonc                binding REPORTS (KV), var ALLOWED_ORIGINS, secreto ACCESS_KEY
  .dev.vars                      ACCESS_KEY local para `wrangler dev` (gitignored)
```

## Modelo de datos (`types.ts`)

Un solo objeto `ReportState`, autoguardado completo en cada cambio — sin
entidades separadas ni normalización (mismo criterio que
`propuesta_economica`, no el modelo aparte de `propuesta_tecnica`). Es
también, literalmente, el objeto que se guarda tal cual en KV (el Worker no
transforma nada, sólo lo indexa por `code`).

```ts
interface ChapterState {
  id: string              // slug estable: 'accessibility' | 'structural' | 'anchors' | 'lifelines'
  title: string
  included: boolean        // se excluye sin borrarse, ver "Numeración"
  severity: Severity        // 'critical' | 'needs_action' | 'observation' | 'compliant'
  specTitle: string
  spec: SpecRow[]             // ficha técnica clave-valor, filas editables
  observations: string          // HTML saneado (RichText)
  photos: PhotoItem[]
  recommendations: string        // HTML saneado (RichText)
}
```

`ReportState.chapters` es un array fijo de 4 (los capítulos de inspección);
`Alcance y metodología`, `Síntesis de hallazgos` y `Conclusiones y
continuidad` **no** son parte de ese array — son secciones fijas siempre
presentes, sin toggle de exclusión (a propósito: son parte del esqueleto del
documento, no algo que dependa de qué se inspeccionó).

## Arquitectura de datos: Worker + KV como fuente de verdad

**Decisión explícita del usuario, después de discutir las limitaciones de
`localStorage` puro:** la nube manda, el navegador es sólo una copia de
resiliencia (`MIRROR_KEY` en `store.ts`). Antes de esto se armó (y se sacó)
un Exportar/Importar manual en `.json` — se descartó porque **Camilo no va a
entender qué es un archivo `.json` ni qué hacer con él**; no era la solución
real, sólo una vía de escape para alguien técnico. Si en algún momento se
vuelve a plantear exportar/importar archivos, que sea consciente de que ya se
intentó y se sacó por esa razón, no reinventarlo sin más contexto.

**Por qué esto y no local-first con sync (la alternativa que se recomendó y
el usuario no eligió):** con local-first, un informe se puede seguir editando
sin conexión y sincroniza cuando vuelve la señal — más seguro para trabajo en
terreno (azoteas, subterráneos), pero más complejo de razonar (¿qué pasa si
dos personas editan el mismo informe offline a la vez?). El usuario prefirió
**la nube como única fuente de verdad**, simple de razonar, a cambio de que
editar sin conexión no se sincroniza solo. Mitigación que sí se construyó:
`SyncStatus.tsx` avisa en la barra si el guardado falló ("Sin conexión —
cambios no guardados" / "Error al guardar"), para que quien está editando
sepa que su trabajo no está a salvo todavía — no queda un fallo silencioso.

**El Worker es compartido con `propuesta_tecnica` y `propuesta_economica`**
(`venta/`) — se llama `altotest-documentos`, no
`altotest-informe-levantamiento`, justamente porque dejó de ser específico
de este proyecto. Vive en el mismo repo (`worker/`) por ahora sólo porque
fue donde se armó primero; el código del Worker no tiene nada específico de
"informe" — ver `worker/src/index.ts`. El tipo de documento (`kind`) es
parte de la ruta, no algo que el Worker necesite conocer de antemano: esta
app usa `kind = "informe"` (`lib/api.ts`, constante `KIND`).

**Contrato universal** (`ReportEnvelope` en `worker/src/index.ts`): el
Worker nunca interpreta la forma interna del documento de cada app —
`propuesta_tecnica` ni siquiera tiene un campo fijo de "cliente" (vive en un
bag de texto libre indexado por clave arbitraria), así que hacerlo
"entender" cada forma de documento no era viable. En cambio, cada PUT manda
`{ code, client, date, doc }` donde `doc` es opaco (lo que sea que la app
quiera guardar), y el Worker le agrega `kind` (de la URL) y `updatedAt`
antes de guardarlo. `lib/api.ts` hace el empaque/desempaque — el resto de la
app (`store.ts`, componentes) sigue trabajando con `ReportState` puro, sin
saber que existe un sobre.

**Endpoints del Worker** (`worker/src/index.ts`), todos requieren
`Authorization: Bearer <ACCESS_KEY>`:

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/reports/:kind` | Lista resúmenes de ese tipo de documento (`code`, `kind`, `client`, `date`, `updatedAt`), de más reciente a más antiguo — alimenta `HistoryMenu.tsx` |
| GET | `/reports/:kind/:code` | Un documento completo (el sobre `ReportEnvelope`, con `doc` adentro) |
| PUT | `/reports/:kind/:code` | Crea/actualiza — el cuerpo es `{ code, client, date, doc }`, `body.code` debe matchear el de la URL |
| DELETE | `/reports/:kind/:code` | Borra (usado por "Quitar" en el Historial) |

`kind` para esta app es siempre `"informe"`; `propuesta_tecnica` usaría
`"tecnica"` y `propuesta_economica` `"economica"` el día que se conecten
(ver Pendientes — todavía no están conectadas, sólo el Worker ya está listo
para recibirlas).

KV guarda cada documento bajo la llave `report:{kind}:{code}` y mantiene un
índice único compartido entre los tres tipos (`index`, un array JSON de
resúmenes con `kind` en cada uno) para que listar no signifique leer todos
los documentos completos uno por uno; el listado por tipo filtra ese índice
en el Worker antes de responder. **KV no tiene transacciones**: dos guardados casi simultáneos pueden pisarse el índice entre sí (lee-
modifica-escribe no atómico) — para un equipo chico el riesgo es bajo y se
autocorrige en el siguiente guardado; no se construyó una cola/lock para
esto todavía (ver Pendientes si el equipo crece).

**El documento se escribe SIEMPRE; el `index` sólo cuando hace falta**
(`INDEX_MAX_STALENESS_MS = 60_000` en `worker/src/index.ts`). En cada `PUT`,
el Worker reescribe la key `index` únicamente si es un `code` nuevo, cambió
`client`/`date`, o la entrada del índice tiene más de 60 s. Motivo: el plan
**free de Workers KV da 1000 escrituras `put`/día compartidas entre las tres
apps**, y el autoguardado (cada 3 s de edición, ver "Sincronización") gastaba
2 `put` por guardado —documento + índice completo— así que una sola jornada de
trabajo agotaba la cuota y KV devolvía 429 hasta el reset (00:00 UTC). Pasó de
verdad el 2026-09-01 (correo de alerta de Cloudflare, las tres apps quedaron
sin guardar en la nube hasta el reset). Costo aceptado del cambio: `updatedAt`
del listado del Historial puede quedar hasta ~1 min atrasado durante una
edición activa — el documento abierto siempre trae el valor real desde su
propio envelope. Si el equipo crece y esto vuelve a apretar, lo siguiente es
el plan pago (US$5/mes → 1M `put`/mes), no reescribir más lógica.

## Acceso (`AccessGate.tsx`, `lib/api.ts`, `worker/src/index.ts`)

**Clave compartida de equipo, no cuentas por persona** — decisión explícita
del usuario, dado que el informe trae hallazgos reales de seguridad de un
edificio (anclajes fallados, accesos sin protección) y no puede quedar en una
URL pública sin nada, pero tampoco se justifica un sistema de login real para
un equipo chico todavía.

**Sé honesto sobre qué tan "seguro" es esto si se vuelve a tocar:** la clave
se pide una vez (`AccessGate.tsx`) y se guarda en `localStorage` del navegador
de quien la usa — **nunca** se hornea en el bundle de producción como una
`VITE_*` (eso sí sería público: cualquiera que abra la app vería la clave en
el JS compilado). Aun así, esto es una clave compartida de equipo, no
autenticación por persona: no distingue quién hizo qué, y cualquiera con la
clave puede compartirla fuera del equipo sin que quede registro. Alcanza para
que el endpoint no esté abierto a cualquiera que encuentre la URL, no para
tratar el contenido como verdaderamente confidencial frente a alguien
malicioso con acceso legítimo.

`App.tsx` verifica la clave guardada contra el Worker una vez al montar
(pudo haber sido revocada desde la última visita); si el Worker devuelve 401
en cualquier momento (clave rotada a mitad de sesión), `store.ts` llama
`onAuthExpired()` y vuelve al portón — no se queda mostrando un documento que
ya no puede guardar.

**La clave real en producción son 4 dígitos** (no un secreto largo al azar)
— pedido explícito del usuario: sólo la usa Camilo, y una clave larga era
fricción sin beneficio real para ese caso. Con eso, el espacio de búsqueda es
de 10.000 combinaciones y **el Worker no tiene límite de intentos** — alguien
podría probarlas todas en segundos. Aceptado a propósito dado el contexto
(un solo usuario, equipo chico); si en algún momento se agregan más
personas o preocupa ese vector, lo primero a construir es un límite de
intentos por IP, no necesariamente volver a una clave larga.

**CORS abierto a cualquier origen (`Access-Control-Allow-Origin: *`)** — no
es un descuido, es necesario: `propuesta_tecnica`/`propuesta_economica` se
abren como archivo local (`file://`), y un `fetch()` desde ahí manda
`Origin: null`, que una lista blanca de orígenes específicos rechazaría. Como
la autenticación es el `Authorization: Bearer` (no cookies), abrir el CORS no
suma superficie de ataque real — nadie puede llamar al Worker con éxito sólo
por conocer el origen, necesita la clave.

## Sincronización (`lib/store.ts`, `SyncStatus.tsx`)

`useReportStore` ya no es dueño de "el documento" — es dueño de sincronizarlo
con el Worker. Al montar, si había un informe activo (mirror local), se
vuelve a pedir fresco (la nube manda); si eso falla por red, se sigue
trabajando con el mirror y `SyncStatus` muestra "Sin conexión". Cada cambio
dispara, después de `AUTOSAVE_DEBOUNCE_MS` (3 s) de debounce: escribir el
mirror local, `PUT` al Worker, y actualizar el estado visible
(`idle → saving → saved`, o `offline`/`error` si falla). Un `saveSeq` (número
de secuencia) descarta la respuesta de un guardado viejo si uno más nuevo ya
llegó antes — evita que una respuesta lenta pise el estado de una más reciente.

**Guard de no-op + debounce de 3 s + flush al ocultar** (2026-09-01, aplicado
a las tres apps, para no agotar el tope free de KV — ver "Arquitectura de
datos"): antes de cada `PUT` se compara `JSON.stringify(report)` contra la
firma del último guardado con éxito (`lastSavedRef`, sembrada en el primer
render y tras el fetch inicial); si es idéntica, no se llama al Worker —
mata los guardados de cambios que no tocan contenido (re-render, foco/blur).
El debounce subió de 400 ms a 3 s: un párrafo escrito de corrido es un
guardado en vez de varios. Como con 3 s un cierre abrupto podría perder los
últimos segundos, un listener de `visibilitychange → hidden` fuerza un
guardado inmediato al cambiar de pestaña/minimizar (con bump de `saveSeq`
para no pisarse con el debounce). El riesgo residual —crash o corte de luz
en los ~3 s previos al guardado— lo cubren el mirror local y el aviso de
`SyncStatus`.

**No guarda hasta la primera edición real** (fix del 2026-08-20, aplicado
también en los dos hermanos de `venta/` tras notarlo primero en
`propuesta_tecnica_react`): sin esto, `report` nace de `initialTemplate()` en
el primer render y el efecto de guardado lo persiste al vencer el debounce
aunque nadie haya tocado nada — el solo hecho de abrir la app crea un informe
permanente en el Worker. Se compara `report` contra una foto de sí mismo
tomada en el primer render (`pristineReport`, por referencia, no
`JSON.stringify`) en vez de un flag booleano de una sola consumición: React
StrictMode monta cada efecto dos veces en desarrollo (monta → limpia →
monta), y un flag se "gasta" en la pasada fantasma, dejando la real sin
protección — se confirmó el fallo antes de cambiar de enfoque. Sólo aplica
si la sesión arranca sin mirror local; una que vuelve con cambios sin
sincronizar sigue guardando como siempre.

## Numeración (`lib/chapters.ts`)

`numberDocument()` es el **único** lugar que calcula números de sección —
nunca escribir un número a mano en JSX. Numera **todo el documento corrido**,
no sólo los capítulos:

```
1. Alcance y metodología     ← siempre 1, es la primera sección fija
2. Accesibilidad...          ← capítulos incluidos, en orden
3. Elementos estructurales...
4. Puntos de anclaje...
5. Líneas de vida
6. Síntesis de hallazgos      ← siempre el número siguiente al último capítulo
7. Conclusiones y continuidad ← siempre el último
```

Si se excluye un capítulo desde el panel "Capítulos" (`ChaptersPanel.tsx`),
pierde su número (queda `null`, no se muestra) y **todo lo que viene después
se corre solo** — incluida Síntesis y Conclusiones, que no son un número fijo
sino `n + 1` / `n + 2` sobre el último capítulo incluido. El índice
(`TableOfContents.tsx`) recibe los tres números fijos como props
(`methodologyNumber`, `summaryNumber`, `conclusionsNumber`) además de la
lista de capítulos numerados — si se agrega una sección fija nueva, hay que
pasarle su número desde `ReportEditor.tsx`, no inventarlo en el componente.

## Layout del capítulo y de la portada — por qué no se parecen a VROPE

El primer diseño (ficha → observaciones → foto → recomendaciones, todo en un
bloque apilado único) resultó **visualmente casi idéntico** al informe de
referencia de la competencia (`ejemplo_vrope.pdf`) pese a tener paleta y
contenido distintos — riesgo real señalado por Matías: Alto Test trabaja con
los mismos clientes muchas veces, y dos informes con el mismo esqueleto
visual es un problema de imagen, no un detalle estético. Se rediseñó en dos
frentes:

- **Cada `Chapter.tsx` es ahora un layout de 2 columnas** (`.chapter-body`,
  `grid-template-columns: 1.9in 1fr`): `.chapter-aside` (ficha técnica +
  badge de severidad, fija, no crece con el contenido — `align-self: start`)
  a la izquierda, y `.chapter-main` (observaciones → fotos → recomendaciones)
  a la derecha. Una franja de color por severidad (`ACCENT_CLASS`, clases
  `accent-*` — **no** `severity-*` a secas, ver "Bugs ya cazados" sobre por
  qué esa colisión de nombres pintó una vez todo el bloque naranjo) corre por
  el borde izquierdo de la ficha.
- **`Cover.tsx` dejó de ser una carta formal** ("Señores.../Presente,",
  patrón que sí usa el informe de referencia) — el título abre la página
  directo, cliente/activo/contacto/fecha/folio se leen como una fichita de
  hechos (`dl.cover-facts`, mismo lenguaje visual etiqueta-arriba/valor-abajo
  que `.chapter-aside`), y el pie de portada es una **franja de estado**:
  barra segmentada por severidad de los capítulos incluidos + leyenda
  ("N sistemas relevados en terreno · N críticos · ...") — información real
  del levantamiento, no decoración, y algo que ningún informe de la
  competencia muestra en portada. La firma técnica que antes vivía ahí se
  movió al cierre del documento (`Conclusions.tsx`, `.closing-signature`).

**Texto justificado** (`text-align: justify; hyphens: auto`) vive en
`.rich-text` (no en `.lead`, que es sólo un modificador de tamaño/color) —
así alcanza a observaciones/recomendaciones de cada capítulo, no sólo a
portada/metodología/conclusiones.

## Ficha técnica (`SpecTable.tsx`)

Tabla clave-valor editable — **un solo componente** para los 4 capítulos,
sólo cambian los nombres de campo (`spec[].field`) que trae cada uno en
`lib/template.ts`. Sirve tanto para una ficha de datos (anclajes: Tipo,
Cantidad, Antecedentes...) como para un checklist comparativo (accesibilidad:
Accesos, Escaleras, Pasarelas y barandas...) — no hace falta un segundo
componente para eso, es la misma forma con otros campos. Dentro de
`.chapter-aside` (ver arriba) la tabla pasa de 2 columnas a filas apiladas
(campo chico arriba, valor debajo) vía CSS — el componente no cambia.

## Fotos (`PhotoGallery.tsx` + `lib/image.ts`)

**Intercaladas en el cuerpo de cada capítulo** (después de Observaciones,
antes de Recomendaciones) — decisión explícita del cliente, distinta del
informe de referencia de la competencia, que las agrupa todas en un anexo al
final.

Cada foto se **comprime en el navegador antes de guardarla**
(`compressImage`: `createImageBitmap` → canvas → `toDataURL('image/jpeg',
0.78)`, máximo 1600px de lado mayor). Sigue siendo necesario aunque ya no sea
`localStorage` el destino final: KV tiene un límite de 25MB **por valor**
(un informe completo con todas sus fotos es un solo valor), y el mirror local
de resiliencia sigue viviendo en `localStorage` (~5-10MB). No hay compresión
de más — si en el futuro se necesitan fotos de mayor resolución (zoom en el
PDF), hay que reconsiderar el límite de 1600px, no subirlo a ciegas.

## Campos editables (`EditableText.tsx`, `RichText.tsx`)

`contentEditable`, **no controlado en cada tecla** — el DOM manda mientras se
escribe, React sólo sincroniza el valor al perder el foco (`onBlur`) o cuando
cambia por fuera (ej. "Nueva", abrir del Historial). Si se controlara en cada
`onChange`, el cursor saltaría al principio en cada tecla (problema clásico de
`contentEditable` + React).

- `EditableText`: campo de una sola idea (título, nombre de campo, folio en
  portada). Sin Enter, sin formato, `.textContent` a secas.
- `RichText`: texto largo (observaciones, recomendaciones, introducción).
  Admite párrafos (Enter → `<div>`) y negrita/cursiva. `onPaste` fuerza texto
  plano (`document.execCommand('insertText', ...)`) y `onBlur` sanea el HTML
  con `lib/richtext.ts` (`sanitizeRichHtml` — sólo permite
  `B/STRONG/I/EM/BR/DIV`, todo lo demás se desenvuelve o se descarta). Mismo
  criterio que los campos `.rich` de `propuesta_tecnica`, reimplementado en
  React.

Ambos comparten la clase `.editable`, que entre otras cosas lleva
`overflow-wrap: anywhere` — ver "Bugs ya cazados", es la clase que evita que
un texto largo sin espacios reviente la paginación.

## Paginación de impresión (`index.css`, `components/Chapter.tsx`)

**Cada vista del documento es su propia hoja Carta**, en pantalla y en
impresión — portada, índice, "Alcance y metodología", cada capítulo, Síntesis
y Conclusiones son un `<section class="page">` distinto. A diferencia de
`propuesta_tecnica` (que fuerza que un capítulo entero quepa en una sola hoja,
recortando contenido si no cabe), acá **un capítulo puede crecer más de una
hoja** si trae varias fotos: el navegador reparte el sobrante en la hoja
siguiente de forma normal. Es la decisión correcta dado que la cantidad de
fotos por capítulo es variable — forzar una sola hoja como en
`propuesta_tecnica` recortaría fotos en silencio.

```css
@page { size: Letter; margin: 0; }   /* el margen lo da el padding de .page, no @page */
.page { min-height: 11in; padding: 0.85in 0.9in; }
.page.dark { background: var(--color-ink); }   /* portada: sangra hasta el borde físico */
```

`.page` lleva `break-after: page` en impresión (y `.page:last-child` no, para
no dejar una hoja en blanco al final).

**`.page.chapter` es la única excepción — no lleva `min-height` fijo en CSS.**
Un capítulo corto (sin fotos, recién creado) no debería forzar `11in` porque
después necesita poder crecer más allá de eso sin que ningún truco de CSS
tenga que "adivinar" cuándo dejar de aplicar el mínimo. En vez de eso,
`Chapter.tsx` mide el alto real del contenido con `useLayoutEffect` cada vez
que el capítulo cambia (texto, fotos, severidad, filas de la ficha — depende
del objeto `chapter` completo, no de un campo puntual) y aplica el resultado
como `style={{ minHeight }}` en línea sobre el propio `<section>`:

El `min-height` que se aplica es **siempre un múltiplo exacto del alto de
CADA hoja que ocupa el capítulo** (`sheetHeightPx * sheetCount`, ver abajo) —
nunca el alto "pelado" del contenido. Redondear hacia arriba, no dejar el
alto crudo: el pie va `position: absolute; bottom: 0` contra este
`min-height`, y `bottom: 0` sólo cae al borde inferior de una hoja física si
`min-height` es múltiplo redondo del alto de hoja. Con el alto crudo (que casi
nunca lo es), un capítulo de ~1,3 hojas dejaba el pie flotando a media hoja en
la segunda, con el resto en blanco (reportado por Camilo).

Cuántas hojas y de qué alto es una decisión en dos pasos (`Chapter.tsx`,
constantes `PAGE_HEIGHT_PX`, `AMBIGUOUS_ZONE_PX`, `CUSTOM_PAGE_BUFFER_PX`):

1. `strictSheetCount = Math.ceil(naturalHeight / PAGE_HEIGHT_PX)` — sin
   perdonar nada. Antes esto se resolvía restando un colchón fijo
   (`SAFETY_MARGIN_PX`) antes de dividir, pero esta sesión demostró con dos
   casos reales que **ningún valor de colchón sirve para los dos a la vez**
   (ver "Bugs ya cazados"): un capítulo de 19 recomendaciones necesitaba un
   colchón < 17px para no perdonar un desborde real, y un capítulo con una
   recomendación de texto repetitivo bajo justificado necesitaba un colchón
   > 18px para no reservar una hoja completa que en el PDF real sale en
   blanco. Es la MISMA incertidumbre de medición pantalla/impresión, sólo que
   un caso necesita perdonarla y el otro no — en pantalla no hay forma de
   distinguirlos con un solo número.
2. Si `strictSheetCount === 2` (el capítulo mide un poco más de 1 hoja) y el
   sobrante sobre esa 2ª hoja cae dentro de `AMBIGUOUS_ZONE_PX` (120px), el
   capítulo pasa a **1 sola hoja de alto CUSTOM** —no Carta, un poco más
   alta, calculada como `naturalHeight + CUSTOM_PAGE_BUFFER_PX` (90px de
   colchón, siempre SUMADO, nunca restado, así en el peor caso la hoja queda
   un poco más alta de lo necesario, nunca más baja)— en vez de reservar una
   2ª hoja Carta completa que puede salir casi en blanco. Se activó primero
   la idea de saltar a hoja Oficio chilena (8.5x13in) para cualquier
   capítulo ambiguo, sin importar cuántas hojas fueran — Matías pidió algo
   proporcional al desborde real en vez de "una hoja TAN grande cuando no
   sea necesario", y **probando el caso de 19 recomendaciones se encontró
   que reducir el número de hojas (no sólo agrandarlas) para
   `strictSheetCount >= 3` reproduce el MISMO bug del pie flotando, un nivel
   más arriba** (ver "Bugs ya cazados") — por eso el tamaño custom sólo se
   activa en el límite 1↔2 hojas, que es además el único caso real
   reportado (el informe en producción `IL-20260904-105543`) y el único
   contra el que `CUSTOM_PAGE_BUFFER_PX` está calibrado. Para
   `strictSheetCount >= 3` se usan hojas Carta normales, tantas como
   `strictSheetCount` indique, sin intentar ahorrar ninguna.
3. La hoja custom necesita su propia regla `@page` (nombrada
   `chapter-<id>-page`, alto en pulgadas) porque el tamaño físico de una hoja
   de impresión sólo se puede declarar con un at-rule `@page`, no con una
   propiedad CSS normal — `Chapter.tsx` la renderiza como un `<style>` hijo
   del propio `<section>` (confirmado con una prueba aislada: a Chromium no
   le importa dónde vive el `<style>` en el DOM, sólo que exista antes de
   imprimir) y activa esa hoja en el `<section>` vía `style={{ page:
   'chapter-<id>-page' }}` (la propiedad CSS `page` de Paged Media, no una
   clase — confirmado que Chromium sí respeta un `page` distinto por
   elemento, mezclando tamaños de hoja dentro del mismo PDF).

El pie de cada capítulo (`PageFooter`, ver más abajo) usa
`position: absolute; bottom: 0` contra ese `min-height` ya aplicado — **no**
`margin-top: auto` en un flex-column, que fue el primer intento y se sacó por
un bug real de fragmentación de Chromium (ver "Bugs ya cazados").

## Pie de página (`components/PageFooter.tsx`)

Franja `--color-steel` de 46px pegada al fondo de cada hoja de papel (no en
la portada, que ya tiene peso visual propio con la ficha y la franja de
estado) — a pedido de Camilo, que sintió las hojas "muy blancas". Contenido:
"ALTO TEST" a la izquierda + un bloque en diagonal (`clip-path`) a la derecha
en `--color-ink` con el folio y la numeración corrida del documento
(`sectionNumber / totalSections`, la misma que ya calcula `numberDocument()`
para el índice — no un contador de páginas de impresión real, porque un
capítulo puede repartirse en 2+ hojas físicas y eso descuadraría el conteo).

Pasó por **cuatro rondas de diseño** antes de este resultado — antes de
tocarlo de nuevo, revisar qué ya se descartó y por qué:
1. Franja de color lisa con texto → "muy minimal" (Camilo).
2. Franja con degradé/borde decorativo → tampoco convenció.
3. Trazo de la catenaria (el isotipo) estirado a todo el ancho → "no
   convenció para nada" (Matías) — quería formas reales, no una línea.
4. **Actual**: bloque en diagonal + texto (sin ícono), con numeración de
   página — es lo que se aprobó.

En `.page.chapter`, `PageFooter` recibe su `ref` **directamente en el
`<footer>`** (React 19, sin `forwardRef`) — nunca envolverlo en un `<div>`
intermedio sólo para poder medirlo, ver "Bugs ya cazados" (el bug del ref
envuelto) para el porqué exacto.

## Hoja de continuación de un capítulo (`Chapter.tsx`, `.chapter-cont`)

Cuando un capítulo se reparte en 2+ hojas, la(s) hoja(s) posteriores a la
primera llevan mucho blanco (el contenido que bajó + el pie abajo, nada en el
medio) — feedback de Camilo: "se siente vacía", y peor todavía si baja un solo
ítem. Dos mitigaciones, **ambas sólo de impresión** (el PDF es el entregable;
en pantalla el capítulo es un bloque continuo sin corte de hoja):

- **Rótulo de continuación:** `Chapter.tsx` sabe cuántas hojas ocupa el
  capítulo (`sheetCount`, ya redondeado a hojas enteras — ver "Paginación de
  impresión") y renderiza un `<div class="chapter-cont">` por cada hoja
  extra, con `style={{ top: k * sheetHeightPx }}` (el alto de CADA hoja de
  este capítulo — Carta normal, o el alto custom si cayó en la zona
  ambigua). Mismo mecanismo que `PageFooter`:
  `position: absolute` contra el `min-height` del capítulo, con `left/right: 0`
  para sangrar al borde físico y `top` en múltiplos exactos de hoja para caer
  al inicio de cada hoja de continuación, fuera del flujo de fragmentación.
  Cae en la banda de padding superior (los `0.85in`), así no pisa el contenido
  que fluye. Contenido: `{número} · {título} · continúa`. Estilo discreto
  (línea fina + rótulo mono), **no** una segunda franja sólida — dos bandas
  pesadas por hoja se sentía cargado. `display: none` por defecto,
  `display: flex` sólo en `@media print`.
- **Control de huérfanos:** `.chapter-main .paragraph-item:last-of-type
  { break-before: avoid }` (en `@media print`). Si el último párrafo de
  observaciones/recomendaciones quedaría solo en la hoja de continuación, el
  navegador mueve el salto una posición antes y bajan **al menos dos** juntos.
  Se verificó que Chrome lo respeta para saltos de página con este layout
  (`break-inside: avoid` en los ítems, `box-decoration-break: clone`). **`:last-of-type`
  y no `:last-child`**: el último hijo real de `.paragraph-list` es el botón
  "Agregar" (`no-print`, pero sigue en el DOM), así que `:last-child` no
  matchearía nunca el párrafo.

Sigue pendiente (ver "Pendientes"): la **primera** hoja de un capítulo
multipágina no lleva la franja del pie — el pie es un único elemento absoluto
y sólo cae en la última hoja.

## Folio (`lib/code.ts`)

`IL-aaaammdd-hhmmss` — **mismo formato** que usa Alto Test en el resto de sus
documentos (`propuesta_tecnica`: `PT-aaaammdd-hhmmss`, `propuesta_economica`:
`COT-...`). Se genera una sola vez por informe (al crearlo, o al usar
"Nueva"); no se regenera en cada carga mientras el que tiene sea válido. Es
también la llave primaria en KV (`report:{code}`) — nunca se debería poder
editar el folio de un informe que ya se guardó sin que eso cree una entrada
nueva en vez de renombrar la existente (hoy el campo del folio en la barra es
editable a mano; si se cambia, el siguiente autoguardado hace un `PUT` a un
`code` distinto y el informe original con el código viejo queda huérfano en
KV — no hay una migración automática para esto, ver Pendientes).

`isValidCode()` es la única fuente de verdad del formato — `store.ts` la usa
para migrar sesiones viejas: un folio guardado que no matchee el patrón
(por ejemplo el formato alfanumérico al azar que se probó primero, antes de
que el usuario pidiera igualarlo al de `propuesta_tecnica`) se trata como si
viniera vacío y se regenera solo. No hardcodear el patrón del folio en ningún
otro lado.

## Historial (`HistoryMenu.tsx` + `lib/api.ts`)

Ya no es un mapa en `localStorage` (esa versión se reemplazó por completo) —
es un desplegable sobre el listado del Worker (`GET /reports`). A diferencia
de "Deshacer" (que sólo cubre **un paso**, entre "Nueva" y la primera edición
siguiente), permite volver a **cualquier** informe guardado en el servidor,
**desde cualquier dispositivo** que tenga la misma clave de acceso — folio,
cliente (`clientName` + `clientAsset`), fecha y fecha de última edición de
cada uno, con opción de abrir (trae el informe completo con `fetchReport`
antes de mostrarlo) o quitar (`DELETE /reports/:code`) cada entrada.

## Marca (`Logomark.tsx`, `Wordmark.tsx`)

**Variante propia, no una copia de `site/src/components/ui/`.** El isotipo
base (la catenaria: texto + curva con un punto en cada extremo) es el mismo,
pero acá los extremos de la curva son un **glifo de punto de anclaje**
(placa clara + perno oscuro) en vez de un punto simple — pedido explícito del
usuario, porque este documento trata justamente de puntos de anclaje. Colores
del glifo fijos (`PLATE = '#F4F5F2'`, `BOLT = '#10151E'`) independientes del
`tone`, porque ambos usos actuales (`Toolbar`, `AccessGate`, `Cover`) son
sobre fondo tinta oscuro y necesitan contraste propio. **No sincronizar con
`site/`** — si en algún momento se actualiza el Logomark/Wordmark de `site/`,
este archivo no tiene que seguirlo, es una variante deliberada.

Un ícono por capítulo (`lib/chapterIcons.ts`: `Route` accesibilidad,
`Building2` estructurales, `Link` anclajes, `RouteTrack` líneas de vida) se
repite en el encabezado del capítulo y en el índice, para escanear el
documento de un vistazo. `Link` y no un ícono de ancla náutica para
"anclajes" — mismo criterio que ya documentó `site/CLAUDE.md`: Alto Test
trabaja con fijaciones mecánicas, no anclas de barco.

## Severidad (`types.ts`, `SeverityBadge.tsx`)

4 niveles, con los colores que ya existían en la paleta (nada de un verde
nuevo para "conforme"): `critical` → `--color-signal` (el naranjo pleno, la
única excepción real), `needs_action` → `--color-signal-glow`, `observation`
→ `--color-steel`, `compliant` → `--color-steel-light`. Respeta la regla de
marca "el naranjo es la excepción" (`site/CLAUDE.md`): sólo lo crítico se
lleva el color de alerta completo.

## Invariantes — romperlas rompe el documento

1. **Código en inglés, comentarios en español, contenido del documento en
   español.** No mezclar los tres registros en el mismo lugar. Aplica
   también al Worker.
2. **Toda foto se comprime antes de guardarse** (`lib/image.ts`) — nunca
   volcar el `File` crudo a base64 directo al `ReportState`.
3. **`numberDocument()` es el único lugar que numera secciones.** Nunca
   escribir un número de capítulo a mano en JSX ni en el contenido.
4. **Todo folio nuevo debe matchear `/^IL-\d{8}-\d{6}$/`** — usar
   `generateCode()`/`isValidCode()`, no reinventar el formato en otro lado.
5. **Todo campo de texto nuevo debe llevar la clase `.editable`** (vía
   `EditableText`/`RichText`) para heredar `overflow-wrap: anywhere` — un
   campo de texto armado a mano sin esas primitivas puede reventar la
   paginación con un string largo sin espacios.
6. **Cada vista del documento es un `<section class="page">`**, directo
   dentro de `.sheet`. Contenido fuera de ese contenedor rompe la paginación
   de impresión (ver "Paginación de impresión").
7. **Reglas de impresión (`@media print`) van fuera de `@layer`** a
   propósito — ver "Bugs ya cazados", es lo que les da prioridad sobre
   `@layer components`. Si se agrega una regla de impresión nueva dentro de
   un `@layer`, deja de ganar la cascada y algo se rompe en silencio.
8. **La clave de acceso nunca va en una variable `VITE_*`.** Sólo
   `VITE_REPORTS_ENDPOINT` (la URL del Worker, pública sin problema) va en
   `.env`. La clave sólo existe escrita a mano por quien la usa, guardada en
   `localStorage` de su propio navegador — ver "Acceso".
9. **`lib/api.ts` es el único lugar que le habla al Worker.** Ningún
   componente hace `fetch` directo — así el manejo de 401/errores de red
   queda en un solo sitio (`ApiError`, `SyncState`).
10. **Sin dependencias nuevas de UI/formularios en el frontend, sin framework
    en el Worker.** `reicon-react` + Tailwind + `fetch` a mano alcanza para
    todo lo que hace este proyecto.

## Bugs ya cazados — no los repitas

| Síntoma | Causa / fix |
|---|---|
| Portada oscura corta, con papel en blanco debajo dentro de la misma hoja física | `@page{margin:0.85in 0.9in}` + intento de sangrar la portada con márgenes negativos. Fix: `@page{margin:0}`, cada `.page` pone su propio padding, la portada (`.page.dark`) sangra sola porque ya no hay margen físico que se lo impida. |
| La portada corta volvió a aparecer después de mover a `.page`/`.sheet` | La regla de impresión `.page{min-height:0}` estaba en un `@media print` **sin** `@layer`, y le ganaba por prioridad de cascada a `.page{min-height:11in}` que sí estaba en `@layer components` — sin importar el orden en el archivo. Fix: sacar el `min-height:0` de la regla de impresión (ver invariante 7). |
| Texto largo sin espacios (`asdasdasd...`) se salía de la celda de la ficha técnica hacia la derecha, y de paso descuadraba dónde caía el salto de página | `table.spec-grid` sin `table-layout:fixed` deja que una celda con contenido sin puntos de corte estire la columna (y la tabla) más allá del ancho de la página. Fix: `table-layout:fixed` en las tablas + `overflow-wrap:anywhere` en `.editable` (global, cubre cualquier campo, no sólo la ficha). |
| 504 "Outdated Optimize Dep", pantalla en blanco, `net::ERR_ABORTED` en los chunks de íconos | Se agregaron ~15 imports nuevos de `reicon-react/icons/*` de una sola vez a mitad de sesión de desarrollo — el optimizador de dependencias de Vite quedó desincronizado. No es un bug de código: matar el dev server, `rm -rf node_modules/.vite`, levantar de nuevo. Documentado primero en `generador/CLAUDE.md`, se repitió acá igual. |
| Folio con formato viejo (alfanumérico al azar) seguía apareciendo después de cambiar el generador a `IL-aaaammdd-hhmmss` | `report.code` ya tenía un valor no vacío guardado en `localStorage`, y `code: report.code \|\| generateCode()` nunca lo pisa si no está vacío. Fix: `isValidCode()` + tratar un folio con formato viejo como si viniera vacío (mismo patrón de migración que documenta `generador/CLAUDE.md`). |
| `clientName` definido en `types.ts`/`template.ts` pero nunca aparecía en ningún lado editable | Quedó del diseño inicial de la portada, sin conectar a un campo real. Fix: se agregó como línea editable en `Cover.tsx`, separada de `clientAsset` (empresa/cliente vs. activo/edificio), y ahora también alimenta el nombre que se muestra en el Historial. |
| `oxlint` marcaba `react(refs)`: acceso a un ref durante el render (`onAuthExpiredRef.current = onAuthExpired` directo en el cuerpo del hook) | Aunque es un patrón común ("ref con la última versión de un callback"), React no garantiza que escribir un ref durante el render sea seguro. Fix: mover la asignación a un `useEffect` sin dependencias (corre después de cada render, sigue sin forzar que el efecto de guardado dependa del callback). |
| `oxlint` marcaba `react(set-state-in-effect)` en dos lugares (`App.tsx` y `store.ts`) por llamar `setChecking(false)`/`setBooting(false)` de forma síncrona dentro de un efecto cuando no había nada que verificar | El patrón "arranca en `true`, el efecto lo apaga si no aplica" fuerza un render extra innecesario. Fix: inicializar el estado de forma perezosa según la condición (`useState(() => !!getStoredAccessKey())`), para que el caso "no hay nada que hacer" no pase por el efecto en absoluto. |
| Pie de página de un capítulo corto/vacío quedaba pegado justo debajo del contenido, con el resto de la hoja física en blanco por debajo sin usar (reportado por Camilo y Matías con capturas reales, varias veces) | Tres causas distintas, encontradas una a la vez — no una sola: (1) primer intento usaba un spacer invisible + `getBoundingClientRect` + un acumulador de estado (`setFillerPx(prev => prev + deficit)`) que podía sobre-corregirse con contenido asíncrono, dejando capítulos cortos medidos más altos que una hoja entera — confirmado con una traza real registrando cada paso de una edición en vivo. (2) el rediseño a flex-column + `margin-top:auto` fallaba porque el `ref` de `PageFooter` estaba en un `<div>` envolvente, no en el propio `<footer>` — `margin:auto` en el eje del bloque sólo hace algo en un ítem flex **directo**, en cualquier descendiente más profundo simplemente vale 0. (3) el mismo flex-column + `margin-top:auto`, ya con el ref corregido, tenía un bug real y distinto de **Chromium**: al fragmentar la caja en 2+ hojas físicas de impresión, el algoritmo de fragmentación de flexbox con auto-margins es inconsistente — confirmado imprimiendo un solo capítulo aislado (con contenido que de sobra entraba en una hoja, con espacio libre visible) y el pie igual saltaba entero a una segunda hoja casi en blanco. Fix final: nada de flexbox para esto — `Chapter.tsx` mide el contenido con `useLayoutEffect` y aplica un `min-height` en línea (ver "Paginación de impresión"), y el pie vuelve a `position:absolute;bottom:0` — el mismo mecanismo, ya probado, que usan todas las demás páginas. Un elemento posicionado de forma absoluta queda fuera del flujo de fragmentación de CSS Paged Media, así que no puede heredar el bug (3). |
| El fix anterior (con `min-height` calculado en JS) volvió a fallar en un caso específico: un capítulo cuyo contenido real medía apenas más que el límite de una hoja terminaba con el pie solo en una segunda hoja casi vacía | La primera versión de la lógica usaba el alto "pelado" del contenido (`naturalHeight`) apenas éste no entraba con el margen de seguridad de sobra — exactamente el caso borde que más necesitaba colchón contra la diferencia entre cómo mide React en pantalla y cómo termina renderizando Chrome al imprimir de verdad terminaba con cero colchón. Fix: invertir la condición — forzar SIEMPRE una hoja completa salvo que el contenido exceda claramente el límite (`naturalHeight > PAGE_HEIGHT_PX + SAFETY_MARGIN_PX`), nunca al revés. |
| Y **volvió a fallar** un nivel más arriba: un capítulo claramente multipágina (4 recomendaciones, ~1,3 hojas) dejaba el pie flotando a ~1/3 de la segunda hoja, con el resto en blanco (reportado por Camilo con PDF real, 2026-08-30). La rama "excede claramente → usar `naturalHeight`" seguía poniendo un `min-height` **no múltiplo** de `PAGE_HEIGHT_PX`, y `position:absolute;bottom:0` cae a media hoja física cuando la caja no termina en un borde de hoja. Los capítulos de 1 hoja no lo mostraban porque ahí `min-height` era exactamente `PAGE_HEIGHT_PX`. Fix: **una sola fórmula, sin ramas** — `min-height = Math.ceil((naturalHeight - SAFETY_MARGIN_PX) / PAGE_HEIGHT_PX) * PAGE_HEIGHT_PX` (siempre múltiplo redondo de la hoja; el colchón se **resta** antes de dividir para no saltar de N a N+1 hojas por ruido de sub-píxel). Verificado con el capítulo real reconstruido en headless: antes `min-height` 1405px / pie a 349px de la 2ª hoja; después `min-height` 2112px / pie al borde. Capítulos de 1 hoja y plantilla por defecto sin cambio (siguen en 1056px). |
| Al probar el layout de 2 columnas del capítulo (`.chapter-body`), el bloque completo (ficha + narrativa) se pintó naranjo sólido | Las clases `severity-critical`/`severity-needs-action`/etc ya existían **sin scopear a su componente** — las usan `SeverityBadge.tsx` y el punto de `SummaryTable.tsx` para pintar su propio fondo. La franja de color nueva del layout de 2 columnas reusó esos mismos nombres de clase en `.chapter-aside`/`.chapter-body`, y como no están scopeadas, cualquier otro elemento con esa clase hereda el mismo fondo. Fix: prefijo `accent-*` dedicado para la franja del layout, nunca compartir nombre con clases de otro componente que no estén scopeadas. |
| Un capítulo de 3 observaciones/3 recomendaciones (sin desborde real — "Accesibilidad" y "Anclajes" del informe `IL-20260904-105543`, ya en prod) generaba en el PDF una hoja "CONTINÚA" completamente en blanco después de su hoja real, y de paso descuadraba el conteo del pie (reportado por Camilo con PDF real, 2026-09-08). Reproducido y confirmado con Playwright headless contra los datos reales del informe (fetched del Worker de prod): 9 páginas en el PDF antes del fix, 7 después. | El `useLayoutEffect` de `Chapter.tsx` mide `contentEl.offsetHeight` tal cual se ve EN PANTALLA — donde los controles `.no-print` ("Agregar observación/recomendación/fila", "Agregar fotos", botones de quitar) siguen ocupando su espacio en el flujo, porque `.no-print{display:none}` sólo aplica dentro de `@media print` (ver invariante 7). Esa altura, ~90-115px más alta que la que el capítulo va a ocupar de verdad al imprimir (confirmado comparando la misma medición con `page.emulateMedia({media:'print'})` en Playwright: 933px en pantalla vs. 842px en impresión para "Accesibilidad"), es la que decide si el capítulo "necesita" una segunda hoja — un capítulo que en el PDF cabe justo en una sola hoja quedaba, por ese sobrante de controles de edición invisibles al imprimir, del otro lado del límite de página. Fix: dentro del mismo `useLayoutEffect`, ocultar (`display:none` inline) todos los `.no-print` descendientes de `contentEl` ANTES de medir `offsetHeight`, y restaurarlos inmediatamente después — mide exactamente lo que el PDF va a mostrar, sin parpadeo (todo síncrono, antes del paint). Verificado que un capítulo genuinamente largo (13 recomendaciones, forzado a propósito) sigue repartiéndose en 2 hojas con el pie y el rótulo "continúa" en el lugar correcto — el fix no toca el caso multipágina real, sólo corrige la sobre-medición en pantalla. |
| Encontrado probando casos borde a propósito (2026-09-08, mismo día del fix anterior): un capítulo que en verdad necesitaba 2 hojas (6 recomendaciones reales) a veces quedaba reservando sólo 1 — con el pie de la hoja 1 mal puesto y sin rótulo "continúa" — si el PDF se generaba INMEDIATAMENTE después de abrir el informe desde el Historial (o al arranque, cuando `store.ts` vuelve a pedir el informe activo al Worker). Esperar un par de segundos, o tocar cualquier campo antes de imprimir, lo "arreglaba" solo — lo que lo hacía fácil de no notar en pruebas manuales normales. | `RichText.tsx` y `EditableText.tsx` sincronizan el DOM (`el.innerHTML`/`el.textContent = value`) dentro de un `useEffect` normal — que React corre DESPUÉS del paint. El `useLayoutEffect` de `Chapter.tsx` que mide el capítulo corre ANTES del paint, en el mismo commit. En la primera renderización de un capítulo con contenido nuevo (abrir del Historial, o el refetch de arranque), la medición de Chapter ocurría mientras cada campo de observaciones/recomendaciones **todavía era un `contentEditable` vacío** — el texto real recién se inyectaba un instante después, en el efecto post-paint — así que el alto medido siempre partía subestimado. Sólo se corregía si algo más disparaba un re-render más tarde (el autoguardado espurio de la fila anterior de esta tabla ocurre ~3s después y termina tapando el síntoma la mayoría de las veces, por eso no se había notado antes). Confirmado con instrumentación: `contentOffsetHeight` pasaba de 774px (primera medición, campos vacíos) a 1131px (tras cualquier re-render posterior, campos ya poblados) para el mismo capítulo sin ningún cambio real de contenido. Fix: `RichText`/`EditableText` sincronizan su `value` con `useLayoutEffect` en vez de `useEffect` — React corre los layout effects de los HIJOS antes que los del PADRE dentro del mismo commit, así que ahora el texto ya está en el DOM cuando `Chapter.tsx` mide. Verificado con Playwright: la medición ahora es correcta e idéntica desde t+50ms (la primera oportunidad real de medir) hasta t+8000ms, sin ninguna espera ni re-render adicional necesario, en tres escenarios (1 hoja, 2 hojas, varias hojas), cada uno repetido 3 veces. |
| Tercer bug de la misma sesión de pruebas de borde (2026-09-08): un capítulo con 19 recomendaciones (bastante más largo que el caso anterior) mostraba el pie flotando a media hoja física, con blanco debajo — reportado por el usuario con el PDF real generado desde el navegador (`IL-20260908-999011.pdf`), no sólo en pantalla. | `SAFETY_MARGIN_PX` (48px en ese momento) se resta del alto medido ANTES de decidir cuántas hojas hacen falta — pensado para perdonar ruido de sub-píxel entre pantalla e impresión (ver la fila de la tabla sobre el pie flotante, más arriba). Pero acá el capítulo excedía el límite de 2 hojas por sólo 17px de **contenido real** (`naturalHeight` 2129.2px vs. límite de 2112px) — no ruido, una recomendación de más que genuinamente no entraba — y el margen de 48px lo perdonó igual, dejando `min-height` en 2112 (2 hojas) mientras el contenido real, al no caber, empujaba la sección a 2224px de todos modos (min-height es un piso, no un techo — ver la sección "Paginación de impresión"). Como 2224 no es un múltiplo redondo de `PAGE_HEIGHT_PX`, el pie (`bottom:0` contra esa altura) quedaba a mitad de la 3ª hoja física en vez de en su borde. Fix: bajar `SAFETY_MARGIN_PX` de 48 a 8, apostando a que los dos fixes anteriores de esta misma sesión (medir con `.no-print` oculto, y que `RichText`/`EditableText` escriban el DOM con `useLayoutEffect`) habían reducido lo suficiente el ruido pantalla/impresión. Verificado con Playwright + PDF real: el capítulo de 19 recomendaciones pasó a `min-height: 3168px` (3 hojas) con `sectionActualHeight` **exactamente igual** a ese valor, pie al borde de la 3ª hoja. **Esta apuesta resultó equivocada — ver la fila siguiente**, encontrada en el mismo día probando un caso distinto: el ruido pantalla/impresión real puede superar los 8px con facilidad, así que bajar el margen sólo corrió el problema de dirección (de "pie flotando" a "hoja en blanco de más") en vez de eliminarlo. |
| Con `SAFETY_MARGIN_PX` ya en 8, el mismo capítulo (ahora con una 4ª recomendación repitiendo una palabra corta muchas veces, "BLA BLA BLA...", agregada por el usuario probando el caso opuesto) mostró el bug ORIGINAL de vuelta: una hoja completamente en blanco después de una hoja con harto papel libre — reportado con un video real del navegador (no sólo un PDF), y reproducido también con Playwright fresco (sin caché ni HMR de por medio, para descartar código viejo). | Medición exacta: `naturalHeight` (pantalla, con `.no-print` oculto) = 1074.2px, apenas 18.2px sobre el límite de 1056px de una hoja — de sobra menos que el margen de 8px puede perdonar. Pero forzando el `min-height` de la sección a exactamente `1056px` a mano (bypaseando el cálculo de React) y regenerando el PDF, el contenido real —las 4 recomendaciones completas, incluida la de "BLA"— entra perfecto en una sola hoja, con el pie en su lugar. Es decir: la pantalla mide el párrafo de "BLA BLA BLA..." (texto repetitivo bajo `text-align:justify`) más alto de lo que Chrome termina renderizándolo al imprimir de verdad — el mismo tipo de ruido pantalla/impresión que motivó `SAFETY_MARGIN_PX` desde el principio (ver la primera fila de "pie flotando" de esta tabla), sólo que acá el ruido real ronda los 18-70px, más que el margen de 8px reducido en la fila anterior. **Este caso y el de las 19 recomendaciones piden límites de margen que se contradicen matemáticamente** (uno necesita margen < 17px para no perdonar de más, el otro necesita margen > 18px para perdonar lo suficiente) — no existe un valor único de `SAFETY_MARGIN_PX` que resuelva ambos, y no hay forma de que JS, midiendo sólo en pantalla, prediga con certeza cómo va a envolver el texto el rasterizador de impresión de Chrome para un párrafo puntual. Se dejó `SAFETY_MARGIN_PX = 8` a propósito (no se revirtió a 48): entre los dos modos de falla — una hoja de más casi en blanco (con el pie bien puesto) vs. el pie flotando a mitad de una hoja con contenido después — el primero es notoriamente menos grave para un informe real (una hoja de sobra se nota pero no se ve "roto"; un pie flotando sí). Además, el patrón que lo dispara (una palabra corta repetida muchísimas veces bajo texto justificado) es un caso de prueba artificial — en todo el resto de las pruebas de esta sesión, con oraciones reales de largo variable, la medición en pantalla y la impresión real coincidieron sin necesitar casi margen. Si esto aparece con contenido real de un levantamiento (no texto de prueba), la mitigación es la misma que en cualquier procesador de texto con paginación automática: agregar o sacar unas pocas palabras a la recomendación que quedó justo en el borde para correrla del límite. **`SAFETY_MARGIN_PX` ya no existe — ver las dos filas siguientes para el mecanismo que lo reemplazó.** |
| Después de la fila anterior, Matías pidió una solución real (no aceptar la hoja en blanco como límite conocido): "cuando el sistema detecte este caso, ¿imprima en hoja oficio?" — se armó un primer diseño donde CUALQUIER capítulo ambiguo pasaba completo a hojas Oficio chilenas (8.5x13in) en vez de sumar una hoja Carta de más. Matías lo frenó antes de terminarlo: "no sé si oficio... printar el tamaño dependiendo de la medida que vaya creciendo el informe, para no poner una hoja TAN grande cuando no sea necesario". | No era un bug todavía (se frenó en diseño), pero vale dejarlo: un salto a tamaño FIJO (Oficio) para cualquier capítulo ambiguo, sin importar cuánto se pasara del límite, resuelve el problema pero de forma desproporcionada — un capítulo que se pasa por 18px no necesita 2 pulgadas extra de hoja. Se reemplazó por un alto de hoja CUSTOM calculado por capítulo (`naturalHeight + CUSTOM_PAGE_BUFFER_PX`, repartido entre las hojas que ya eran necesarias sin discusión) en vez de un tamaño compartido — ver "Paginación de impresión". Factibilidad confirmada antes de escribir el componente: una prueba aislada (`@page <nombre> {size:...}` + `page:<nombre>` por elemento, dos secciones del mismo documento con alturas de hoja distintas) mostró que Chromium sí mezcla tamaños de hoja físicos distintos dentro de un mismo PDF sin problema. |
| Probando el capítulo de 19 recomendaciones (`IL-20260908-999011`) contra el nuevo mecanismo de hoja custom (fila anterior): el pie volvió a flotar, esta vez a mitad de una 3ª hoja física con blanco debajo — el MISMO bug de las primeras filas de esta tabla, un nivel más arriba. Encontrado en las pruebas de verificación de esta sesión antes de que llegara a producción, no reportado por el usuario. | El diseño original reducía el número de hojas en CUALQUIER capítulo ambiguo (`strictSheetCount - 1`, con `strictSheetCount` cualquiera ≥ 2), calculando el alto custom sólo a partir de `naturalHeight` (pantalla) + un colchón fijo de 90px. Para este capítulo, `strictSheetCount` era 3 (medido en pantalla) y el mecanismo reservó sólo 2 hojas custom de ~11.56in — pero el contenido real, al imprimir, necesitó más que eso: desbordó a una 3ª hoja física de todas formas (misma incertidumbre pantalla/impresión de siempre, aquí más grande que el colchón de 90px porque el capítulo tiene mucho más texto acumulado). Como el contenedor sólo reservaba 2 hojas de alto, `bottom:0` cayó donde terminaban esas 2, a mitad de la 3ª hoja no anticipada. El colchón de 90px sólo estaba validado contra el ÚNICO caso real conocido (`IL-20260904-105543`, un capítulo que pasa de 1 a 2 hojas) — extenderlo a capítulos con mucho más contenido asumía, sin datos, que el desvío pantalla/impresión no crece con el volumen de texto, y ese supuesto quedó refutado. Fix: el tamaño custom sólo se activa cuando `strictSheetCount === 2` (el límite 1↔2 hojas, el único caso real y el único calibrado); para `strictSheetCount >= 3` se usan hojas Carta normales sin intentar ahorrar ninguna — una última hoja parcialmente en blanco en un capítulo ya largo es un problema mucho más chico que un pie flotando con contenido real perdido de vista. Verificado con Playwright + PDF real + análisis de píxeles: el capítulo de 19 recomendaciones volvió a 3 hojas Carta normales (antes: 2 hojas custom de 11.56in con el pie flotando a media 3ª hoja), pie al borde exacto de la 3ª; el caso real de producción (`IL-20260904-105543`, `strictSheetCount === 2`) se mantuvo en 1 sola hoja custom de 12.14in con el pie al borde. |

## Verificación

No hay navegador con GUI en el entorno de desarrollo — todo se verificó con
Chrome headless vía Playwright (Chromium ya está cacheado en
`~/.cache/ms-playwright/`, sólo falta `npm install playwright` en un scratch
dir si el harness no lo trae).

```bash
npx tsc -b              # type-check (frontend)
npx oxlint               # lint (frontend)
npm run build              # catch-all antes de dar por buena una sesión

cd worker && npx tsc --noEmit -p tsconfig.json   # type-check del Worker (aparte)
```

Para probar el Worker localmente **sin tocar Cloudflare de verdad**:
`cd worker && cp .dev.vars.example .dev.vars` (editar la clave), `npm install`,
`npm run dev` — `wrangler dev` simula KV en local, no hace falta un namespace
real ni una cuenta de Cloudflare para desarrollar. El frontend apunta ahí vía
`VITE_REPORTS_ENDPOINT=http://localhost:8787` en `.env` (gitignored,
`.env.example` sí versionado).

Para revisar el resultado visual y el PDF real:

```js
// Cuenta páginas y detecta huecos/desbordes reales, no supuestos
await page.pdf({ path: 'out.pdf', printBackground: true, preferCSSPageSize: true })
// pypdf para contar páginas, pypdfium2 + pillow para renderizar cada página a PNG y mirarla
// (no hay poppler/pdfinfo en este entorno) — mismo patrón que ya documentó propuesta_tecnica.
```

Para probar la sincronización de verdad (no sólo confiar en que "debería
funcionar"): dos `browser.newContext()` de Playwright con la misma clave de
acceso simulan dos dispositivos distintos — uno edita y guarda, el otro abre
el mismo folio desde el Historial y tiene que ver el mismo contenido. Para
probar el caso sin conexión: `context.route('**://localhost:8787/**', route
=> route.abort())` a mitad de sesión y confirmar que aparece el aviso
`.sync-status--offline` y el documento se sigue pudiendo editar.

Antes de dar por buena cualquier afirmación sobre paginación, desborde o
alineación: generar el PDF real y mirarlo, no confiar en cómo se ve la
captura de pantalla en modo `@media screen` — varias veces algo se veía bien
en pantalla y sólo se notaba el problema en el PDF (o al revés, ver "Bugs ya
cazados").

## Decisiones del usuario (Matías) — no revertir sin pedir

- **Stack Vite+React+TS+Tailwind**, siguiendo el patrón de `generador/` — en
  su momento (esta sesión) era distinto al de `propuesta_tecnica`/
  `propuesta_economica`, entonces vanilla; los dos se reescribieron después
  con el mismo criterio (ver "Pendientes" y `CONTEXTO.md` de la raíz).
- **Código en inglés, comentarios en español** — corregido a mitad de sesión
  después de empezar en español; no volver a mezclar.
- **Fotos intercaladas en el cuerpo de cada capítulo**, no en un anexo al
  final (el informe de referencia de la competencia sí las pone en anexo;
  acá se hizo distinto a propósito).
- **Íconos con `reicon-react`**, no `lucide-react` (con el que había
  arrancado el proyecto).
- **Numeración corrida de 1 a N para todo el documento** (Alcance,
  capítulos, Síntesis, Conclusiones) — no sólo los 4 capítulos de
  inspección, que es como había quedado antes de este pedido.
- **Folio `IL-aaaammdd-hhmmss`**, igual convención que `PT-`/`COT-` de los
  hermanos — no el formato alfanumérico al azar que se probó primero
  (inspirado en el folio de `generador/`, que sí usa ese formato para sus
  propias cotizaciones).
- **Logo con anclajes explícitos** (placa + perno) en los extremos de la
  catenaria, variante propia de este documento — no sincronizar con el
  Logomark/Wordmark de `site/`.
- **Cada vista es una hoja Carta completa**, en pantalla igual que en
  impresión — pedido explícito después de ver un primer intento que
  imprimía todo como un documento continuo sin separación real de páginas.
- **Nube (Worker + KV) como fuente de verdad, no localStorage con export
  manual.** Se probó primero un Exportar/Importar en `.json` — el usuario lo
  descartó explícitamente ("el cliente no tendrá idea de qué es esto") y
  pidió en su lugar un Worker de Cloudflare que guarde los informes en un
  lugar central. No reintroducir exportar/importar de archivos sin que se
  pida de nuevo.
- **La nube es la fuente de verdad, no un modelo local-first con
  sincronización.** Se le planteó el trade-off (local-first es más seguro
  para editar sin señal en terreno) y eligió simplicidad: si no hay
  conexión, se avisa (`SyncStatus`) pero no se garantiza que el cambio quede
  guardado hasta que vuelva la señal.
- **Clave de acceso compartida de equipo**, no login por persona — suficiente
  para un equipo chico, dado el contenido sensible del informe (hallazgos de
  seguridad reales de un edificio). Revisar si el equipo crece mucho.

## Despliegue real (ya hecho)

El Worker está desplegado en la cuenta de Cloudflare dedicada de Alto Test
(`Contacto@altotest.cl`, cuenta `127be0022568b3839ed7da1973fc8104` — separada
de la cuenta personal vieja donde vivía `altotest-contact` antes; ese Worker
también se migró a esta cuenta nueva, ver `site/CLAUDE.md`/su propio
historial). Subdominio de la cuenta: `altotest.workers.dev` (se renombró
desde el auto-generado al crear la cuenta).

- **URL real**: `https://altotest-documentos.altotest.workers.dev` — ya en
  `.env.example` como `VITE_REPORTS_ENDPOINT` (el nombre del Worker cambió
  de `altotest-informe-levantamiento` a `altotest-documentos` al
  convertirlo en el Worker compartido — ver "Arquitectura de datos"; el
  script viejo se borró de Cloudflare).
- **KV namespaces reales** (ya en `wrangler.jsonc`, no son placeholders):
  `REPORTS` = `f23fac81596e445688d0abf53a09be67`, preview =
  `312776f575894e6a99a35914113030ab`.
- **`ACCESS_KEY`**: en producción son **4 dígitos** (ver "Acceso" arriba
  para el porqué), subidos directo como secreto del script — **no está
  escrita en ningún archivo del repo, ni se puede volver a leer desde
  Cloudflare** (los secretos de Workers no son legibles después de subidos,
  sólo sobrescribibles). Pídesela a Matías si la necesitas, o rótala:
  `cd worker && npm run secret:access-key` (esto sí requiere que `wrangler`
  esté logueado contra la cuenta de Alto Test — ver "Acceso" arriba sobre el
  login por CLI vs. MCP). `worker/.dev.vars` (local, gitignored) tiene la
  misma clave que producción a propósito, para no tener que recordar dos.
- **Cómo se desplegó de verdad, para que no sorprenda**: no se usó
  `wrangler deploy` desde la terminal (el login interactivo de `wrangler`
  abría el navegador con la cuenta personal equivocada) — se usó el MCP
  oficial de Cloudflare para Claude Code (`claude plugin install
  cloudflare@cloudflare`, ver `developers.cloudflare.com/agent-setup/prompt.md`),
  autenticado por OAuth contra la cuenta de Alto Test, y se subió el script
  (compilado de TS a JS a mano con `tsc`, sin bundler porque `index.ts` no
  tiene imports) vía la API cruda de Workers
  (`PUT /accounts/{id}/workers/scripts/{name}`, multipart con
  `main_module` + `bindings`). Para el próximo deploy, más simple: dejar que
  `wrangler` (CLI, con `wrangler login` bien logueado contra la cuenta
  correcta) haga `npm run deploy` normal — el camino manual de esta vez fue
  para sortear el problema puntual del navegador equivocado, no es el
  proceso a repetir por costumbre.

## Pendientes

- **Límite conocido del cálculo de hojas de un capítulo (`Chapter.tsx`,
  `AMBIGUOUS_ZONE_PX`/`CUSTOM_PAGE_BUFFER_PX`):** la incertidumbre de fondo
  (la pantalla no predice con exactitud cómo va a envolver el texto el
  rasterizador de impresión) no se eliminó, sólo se acotó — ver "Paginación
  de impresión" y las últimas filas de "Bugs ya cazados" para la historia
  completa (colchón fijo → hoja Oficio para cualquier ambigüedad → hoja
  custom sólo en el límite 1↔2 hojas). El mecanismo de hoja custom sólo
  está calibrado (`CUSTOM_PAGE_BUFFER_PX = 90`) contra capítulos que pasan
  de 1 a 2 hojas — el único caso real conocido. Un capítulo que ya necesita
  3+ hojas Carta y cae justo en un borde ambiguo puede, en un caso raro,
  terminar con una última hoja parcialmente en blanco (el modo de falla que
  se aceptó a propósito por ser menos grave que el pie flotando — ver la
  fila de "Bugs ya cazados" sobre el capítulo de 19 recomendaciones). Si un
  informe real muestra esto, la mitigación es la misma de siempre: editar la
  recomendación/observación que quedó justo en el borde (agregar o sacar
  unas pocas palabras) para sacarla de la zona ambigua — no hace falta
  tocar código. Si se junta evidencia real de que el colchón de 90px
  tampoco alcanza para el caso 1↔2 hojas, subirlo con un dato real de por
  medio, no a ciegas.
- **Frontend en Vercel: ya importado** (Matías lo hizo después del
  2026-08-20; auto-deploy desde `main` de `Alto-Test-Spa/Condition-Survey-Report`,
  confirmado con un deploy "Ready" el 2026-09-01 tras un push). Falta
  verificar que el proyecto tenga la variable de entorno
  `VITE_REPORTS_ENDPOINT=https://altotest-documentos.altotest.workers.dev` —
  sin ella el build compila igual pero `BASE_URL` queda `undefined`
  (`src/lib/api.ts`) y no puede hablar con el Worker. Chequeo: abrir la URL
  en vivo y pasar el portón de acceso con la clave de 4 dígitos.
- ~~`propuesta_economica`/`propuesta_tecnica` conectadas al Worker~~ — hecho.
  A ninguna de las dos se le agregó el Worker al vanilla-JS existente: se
  **reescribieron completas en Vite+React** (`venta/propuesta_economica_react/`
  y `venta/propuesta_tecnica_react/`, mismo patrón que esta app) y las dos
  **ya están en producción** (`quotegenerator.altotest.cl` y el dominio de
  `propuesta_tecnica`, ambas 2026-08-20) — ver el `CLAUDE.md` de cada una,
  sección "Despliegue". Las carpetas vanilla se borraron del disco local una
  vez confirmado cada deploy (historial completo preservado en GitHub, ver
  `CONTEXTO.md` de la raíz). `propuesta_tecnica_react` sí tuvo que construir
  de cero un motor de capítulos/subtítulos con más granularidad que el de
  acá (ver el punto de exclusión más abajo) y una carta Gantt — ninguno de
  los dos existía en React todavía cuando se hizo.
- Replicar el nivel de detalle del capítulo "Puntos de anclaje unipersonales"
  (el capítulo de ejemplo, con ficha/observaciones/recomendaciones ya
  redactadas) en los otros 3 capítulos de inspección — o decidir con el
  usuario si conviene dejarlos como plantilla vacía a propósito, lista para
  llenar en cada levantamiento real.
- Editar el folio de un informe ya guardado deja huérfano el `code` viejo en
  KV (ver "Folio") — decidir si conviene bloquear la edición del folio una
  vez guardado, o migrar el registro viejo al nuevo código en el Worker.
- Exclusión más granular: hoy sólo se puede excluir un capítulo completo
  desde el panel — no una fila puntual de la ficha técnica ni el bloque de
  fotos de un capítulo (a diferencia de `propuesta_tecnica`, que sí permite
  excluir subtítulos sueltos dentro de un capítulo).
- Revisar con Camilo/Matías la redacción final de portada y cierre
  ("Próximos pasos") antes de usarlo en un levantamiento real con cliente.
- La **primera** hoja de un capítulo que se reparte en 2+ hojas no lleva la
  franja del pie (`PageFooter` es un único elemento `position: absolute` y sólo
  cae en la última hoja). Las hojas de continuación sí llevan el rótulo de
  arriba (`.chapter-cont`, ver "Hoja de continuación"). Si se quiere el pie en
  todas, hay que repetirlo por hoja física — mismo truco `top: k *
  PAGE_HEIGHT_PX` que usa `.chapter-cont`, o `@page` margin boxes.

## Repo

Este proyecto sí es un repositorio git (a diferencia de cuando se escribió
la nota anterior) — `Alto-Test-Spa/Condition-Survey-Report`, pusheado el
2026-08-20 como primer commit (`main`). El Worker vive adentro (`worker/`,
mismo repo) aunque ya no es específico de este proyecto — ver "Arquitectura
de datos" arriba sobre por qué no se separó en su propio repo por ahora.
