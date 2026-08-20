# CLAUDE.md — Informe de Levantamiento Inicial (Alto Test)

Contexto para retomar este proyecto sin releer todo el chat. Aquí están las
**decisiones y las trampas**, no un tutorial de React. Este proyecto vive en
`informes/` (ver `../../CONTEXTO.md` para el mapa completo de carpetas de
Alto Test). Ver también `../../venta/propuesta_tecnica/CLAUDE.md` y
`../../venta/propuesta_economica/CLAUDE.md` (mismo autor, mismas convenciones
de fondo, pero **stack distinto** — no asumir que algo de allá aplica aquí
sin revisar; a partir de esta sesión los tres comparten el mismo Worker, ver
"Arquitectura de datos" más abajo),
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
                                400ms) hacia el Worker, mirror local de resiliencia,
                                Nueva/Deshacer — ver "Nube como fuente de verdad"
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
dispara, después de 400ms de debounce: escribir el mirror local, `PUT` al
Worker, y actualizar el estado visible (`idle → saving → saved`, o
`offline`/`error` si falla). Un `saveSeq` (número de secuencia) descarta la
respuesta de un guardado viejo si uno más nuevo ya llegó antes — evita que
una respuesta lenta pise el estado de una más reciente.

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

## Ficha técnica (`SpecTable.tsx`)

Tabla clave-valor editable — **un solo componente** para los 4 capítulos,
sólo cambian los nombres de campo (`spec[].field`) que trae cada uno en
`lib/template.ts`. Sirve tanto para una ficha de datos (anclajes: Tipo,
Cantidad, Antecedentes...) como para un checklist comparativo (accesibilidad:
Accesos, Escaleras, Pasarelas y barandas...) — no hace falta un segundo
componente para eso, es la misma forma con otros campos.

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

## Paginación de impresión (`index.css`)

**Cada vista del documento es su propia hoja Carta**, en pantalla y en
impresión — portada, índice, "Alcance y metodología", cada capítulo, Síntesis
y Conclusiones son un `<section class="page">` distinto. A diferencia de
`propuesta_tecnica` (que fuerza que un capítulo entero quepa en una sola hoja,
recortando contenido si no cabe), acá **un capítulo puede crecer más de una
hoja** si trae varias fotos: `.page` tiene `min-height: 11in` pero no
`overflow: hidden`, así que si el contenido no cabe, el navegador reparte el
sobrante en la hoja siguiente de forma normal. Es la decisión correcta dado
que la cantidad de fotos por capítulo es variable — forzar una sola hoja como
en `propuesta_tecnica` recortaría fotos en silencio.

```css
@page { size: Letter; margin: 0; }   /* el margen lo da el padding de .page, no @page */
.page { min-height: 11in; padding: 0.85in 0.9in; }
.page.dark { background: var(--color-ink); }   /* portada: sangra hasta el borde físico */
```

`.page` lleva `break-after: page` en impresión (y `.page:last-child` no, para
no dejar una hoja en blanco al final).

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

- **Stack Vite+React+TS+Tailwind**, no vanilla como `propuesta_tecnica`/
  `propuesta_economica` — siguiendo el patrón de `generador/`.
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
- Conectar `venta/propuesta_tecnica` y `venta/propuesta_economica` al mismo
  Worker (`kind = "tecnica"` / `"economica"`) — el Worker ya está listo para
  recibirlas (probado con un PUT/GET/DELETE de prueba bajo `kind=tecnica`),
  falta construir el lado vanilla-JS: portón de acceso, sincronización con
  la nube como fuente de verdad (mismo modelo que esta app, no sólo
  respaldo), y un Historial equivalente a `HistoryMenu.tsx` pero sin React.
  Es trabajo grande — ver sus propios `CLAUDE.md` una vez que se haga.
- Replicar el nivel de detalle del capítulo "Puntos de anclaje unipersonales"
  (el capítulo de ejemplo, con ficha/observaciones/recomendaciones ya
  redactadas) en los otros 3 capítulos de inspección — o decidir con el
  usuario si conviene dejarlos como plantilla vacía a propósito, lista para
  llenar en cada levantamiento real.
- **Repo git**: esta carpeta no es un repositorio git todavía (a diferencia
  de `propuesta_tecnica`, `propuesta_economica`, `site`). Decidir si se
  inicializa y se sube a `Alto-Test-Spa` como los demás (el Worker, al ser
  un proyecto npm aparte, probablemente merece su propio repo — ver cómo se
  organizó `site` + `site/worker`).
- Editar el folio de un informe ya guardado deja huérfano el `code` viejo en
  KV (ver "Folio") — decidir si conviene bloquear la edición del folio una
  vez guardado, o migrar el registro viejo al nuevo código en el Worker.
- Exclusión más granular: hoy sólo se puede excluir un capítulo completo
  desde el panel — no una fila puntual de la ficha técnica ni el bloque de
  fotos de un capítulo (a diferencia de `propuesta_tecnica`, que sí permite
  excluir subtítulos sueltos dentro de un capítulo).
- Revisar con Camilo/Matías la redacción final de portada y cierre
  ("Próximos pasos") antes de usarlo en un levantamiento real con cliente.
