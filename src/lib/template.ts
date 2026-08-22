import type { ChapterState, ParagraphItem, ReportState } from '../types'
import { generateId } from './code'

function specRow(field: string, value = ''): { id: string; field: string; value: string } {
  return { id: generateId(), field, value }
}

function paragraph(text = ''): ParagraphItem {
  return { id: generateId(), text }
}

function emptyChapter(id: string, title: string, fields: string[]): ChapterState {
  return {
    id,
    title,
    included: true,
    severity: 'observation',
    specTitle: 'Elementos inspeccionados',
    spec: fields.map((field) => specRow(field)),
    // Arranca con un párrafo en blanco ya visible (igual que la ficha técnica arranca
    // con sus filas), no con la lista vacía — así hay dónde escribir sin tener que
    // apretar "Agregar" antes de la primera palabra.
    observations: [paragraph()],
    photos: [],
    recommendations: [paragraph()],
  }
}

const CHAPTER_ACCESSIBILITY = emptyChapter('accessibility', 'Accesibilidad y condiciones generales', [
  'Accesos',
  'Escaleras',
  'Pasarelas y barandas',
  'Señalética de riesgo',
])

const CHAPTER_STRUCTURAL = emptyChapter(
  'structural',
  'Elementos estructurales, postación y pescantes',
  [
    'Tipo de elemento',
    'Cantidad relevada',
    'Estado general',
    'Condición de soldaduras',
    'Etiquetado físico',
    'Última revisión o ensayo',
  ],
)

// Capítulo de ejemplo, con contenido de muestra ya cargado (el resto queda con la
// estructura lista pero sin llenar) — sirve para validar el patrón ficha+fotos+texto
// antes de replicarlo.
const CHAPTER_ANCHORS: ChapterState = {
  id: 'anchors',
  title: 'Puntos de anclaje unipersonales',
  included: true,
  severity: 'observation',
  specTitle: 'Elementos inspeccionados',
  spec: [
    specRow('Tipo', 'Químico'),
    specRow('Cantidad relevada', '—'),
    specRow('Antecedentes previos', 'Sí, con certificación registrada'),
    specRow('Etiquetado físico', 'Ausente en la mayoría de los puntos'),
    specRow('Fecha de última certificación', '—'),
  ],
  observations: [
    paragraph(
      'Los puntos de anclaje unipersonales se encuentran instalados y en uso activo. ' +
        'Sin embargo, <b>la mayoría no presenta etiquetado visible</b> pese a que fue incorporado en la ' +
        'última certificación registrada, lo que dificulta verificar en terreno su estado de vigencia y ' +
        'trazabilidad individual sin recurrir al registro documental.',
    ),
  ],
  photos: [],
  recommendations: [
    paragraph(
      '<b>Recertificación periódica:</b> gestionar la recertificación de cada punto mediante ensayos ' +
        'mecánicos no destructivos, conforme a NCh 1258 y EN 795:2012.',
    ),
    paragraph(
      '<b>Etiquetado y trazabilidad:</b> reinstalar de forma visible las etiquetas de identificación, ' +
        'con numeración correlativa de control.',
    ),
    paragraph(
      '<b>Registro documental:</b> mantener actualizados los registros de inspección, mantención y ' +
        'certificación de cada anclaje.',
    ),
  ],
}

const CHAPTER_LIFELINES = emptyChapter('lifelines', 'Líneas de vida', [
  'Tipo',
  'Cantidad relevada',
  'Condiciones generales',
  'Etiquetado físico',
  'Fecha de última certificación',
])

export function initialTemplate(): ReportState {
  return {
    code: '',
    date: '',

    clientName: '',
    clientAsset: '',
    clientContact: '',

    scopeTitle: 'Sistemas de Anclaje y Accesibilidad',
    introduction:
      '<div>De acuerdo con lo solicitado, se presenta el Informe de Levantamiento Inicial de los ' +
      'sistemas de anclaje y elementos asociados a los trabajos verticales del activo.</div>' +
      '<div>Este documento fue elaborado por nuestro equipo técnico, bajo referencia normativa EN 795:2012, ' +
      'EN 365:2004, NCh 1258 y el D.S. N°594 sobre Condiciones Sanitarias y Ambientales Básicas en los ' +
      'Lugares de Trabajo.</div>' +
      '<div>El objetivo de este levantamiento es entregar un diagnóstico claro del estado actual de los ' +
      'accesos, anclajes y líneas de vida, estableciendo una base técnica para definir las acciones que ' +
      'permitan garantizar la seguridad de las operaciones en el tiempo.</div>',

    methodologyTitle: 'Alcance y metodología',
    methodology:
      '<div>El levantamiento se realizó mediante inspección visual en terreno de los elementos de ' +
      'accesibilidad, estructurales y de anclaje presentes en el activo, complementada con la revisión de ' +
      'los antecedentes documentales disponibles (certificaciones, registros de mantención y etiquetado).</div>' +
      '<div>No se realizaron ensayos destructivos ni mediciones de carga: este es un diagnóstico de ' +
      'condición inicial, no un ensayo de certificación. Los hallazgos que requieren un ensayo específico se ' +
      'indican como tal en el capítulo correspondiente.</div>',

    chapters: [CHAPTER_ACCESSIBILITY, CHAPTER_STRUCTURAL, CHAPTER_ANCHORS, CHAPTER_LIFELINES],

    summaryTitle: 'Síntesis de hallazgos',
    summaryIntro:
      'Resumen de los hallazgos por capítulo, ordenado según la atención que requiere cada uno.',

    conclusionsTitle: 'Conclusiones y continuidad',
    conclusions:
      '<div>El levantamiento permitió constatar condiciones que requieren atención en los sistemas de ' +
      'anclaje y accesibilidad relevados. Estas condiciones no representan una falla inminente en todos los ' +
      'casos, pero sí una brecha respecto de la normativa aplicable que conviene resolver antes de que se ' +
      'convierta en un riesgo operativo.</div>',
    closingInvitation:
      '<div>Este informe es el primer paso del ciclo que gestionamos junto a nuestros clientes: ' +
      '<b>Diagnóstico → Diseño → Instalación → Certificación → Mantención</b>. Quedamos a disposición para ' +
      'avanzar con el diseño de ingeniería y la implementación de las soluciones aquí identificadas, de ' +
      'forma de cerrar el ciclo completo y dejar el activo con trazabilidad documentada.</div>',

    authorName: '',
    authorRole: 'Profesional en Prevención de Riesgos',
    authorEmail: '',
  }
}

// Migra un informe leído desde el mirror local o el Worker: observations/recommendations
// pasaron de un solo string con <div>s (separados a mano con Enter) a una lista de
// párrafos independientes. Un informe guardado antes de este cambio todavía trae el
// string viejo — se trata igual que el folio con formato viejo (ver isValidCode()): no
// se descarta, se reinterpreta. Cada <div> de nivel superior se vuelve un párrafo propio,
// para no perder la separación que el autor ya había hecho a mano.
export function normalizeReport(raw: ReportState): ReportState {
  return { ...raw, chapters: raw.chapters.map(normalizeChapterParagraphs) }
}

function normalizeChapterParagraphs(chapter: ChapterState): ChapterState {
  return {
    ...chapter,
    observations: toParagraphItems(chapter.observations),
    recommendations: toParagraphItems(chapter.recommendations),
  }
}

function toParagraphItems(value: ParagraphItem[] | string): ParagraphItem[] {
  if (Array.isArray(value)) return value
  if (!value) return []
  const doc = new DOMParser().parseFromString(value, 'text/html')
  const divs = [...doc.body.children].filter((el) => el.tagName === 'DIV')
  const parts = divs.length > 0 ? divs.map((el) => el.innerHTML) : [value]
  return parts.filter(Boolean).map((text) => paragraph(text))
}
