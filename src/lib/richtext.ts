// Saneador de texto enriquecido para los campos `contentEditable`: sólo se permite
// negrita/cursiva/párrafos, nunca el HTML crudo que llega al pegar desde Word u otra
// fuente (colores, fuentes, spans anidados). Mismo criterio que usa propuesta_tecnica
// para sus campos `.rich`.
const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'BR', 'DIV'])

export function sanitizeRichHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  cleanNode(doc.body)
  return doc.body.innerHTML
}

function cleanNode(node: Node) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.TEXT_NODE) continue
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.parentNode?.removeChild(child)
      continue
    }
    const el = child as HTMLElement
    cleanNode(el)
    if (!ALLOWED_TAGS.has(el.tagName)) {
      while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el)
      el.parentNode?.removeChild(el)
    } else {
      for (const attr of [...el.attributes]) el.removeAttribute(attr.name)
    }
  }
}
