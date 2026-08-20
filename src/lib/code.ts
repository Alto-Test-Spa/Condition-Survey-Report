function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

const CODE_PATTERN = /^IL-\d{8}-\d{6}$/

// Mismo formato que usa Alto Test en el resto de sus documentos (propuesta_tecnica:
// PT-aaaammdd-hhmmss, propuesta_economica: COT-...): IL-aaaammdd-hhmmss.
export function generateCode(): string {
  const d = new Date()
  const date = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
  const time = `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
  return `IL-${date}-${time}`
}

// Para migrar sesiones guardadas antes de adoptar este formato (traían un folio
// alfanumérico al azar) — un código con la forma vieja se trata como si viniera vacío.
export function isValidCode(code: string): boolean {
  return CODE_PATTERN.test(code)
}

export function generateId(): string {
  return crypto.randomUUID()
}
