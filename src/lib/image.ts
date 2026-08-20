// Las fotos se guardan como base64 en localStorage (sin backend): hay que comprimirlas
// en el navegador antes de persistirlas o unas pocas fotos de cámara (4000x3000, varios MB
// cada una) llenan la cuota de localStorage (~5-10MB) casi de inmediato.
const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.78

export async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context to compress the image')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}
