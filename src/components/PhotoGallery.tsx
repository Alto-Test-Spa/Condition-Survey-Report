import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import Camera from 'reicon-react/icons/Camera'
import X from 'reicon-react/icons/X'
import type { PhotoItem } from '../types'
import { EditableText } from './EditableText'
import { compressImage } from '../lib/image'
import { generateId } from '../lib/code'

interface Props {
  photos: PhotoItem[]
  onChange: (photos: PhotoItem[]) => void
}

// Galería de fotos intercalada en el cuerpo del capítulo (a pedido del cliente, no un
// anexo aparte al final). Cada foto se comprime al subirla — ver lib/image.ts.
export function PhotoGallery({ photos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setBusy(true)
    try {
      const added: PhotoItem[] = []
      for (const file of files) {
        const dataUrl = await compressImage(file)
        added.push({ id: generateId(), dataUrl, caption: '' })
      }
      onChange([...photos, ...added])
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function updateCaption(id: string, caption: string) {
    onChange(photos.map((p) => (p.id === id ? { ...p, caption } : p)))
  }

  function removePhoto(id: string) {
    onChange(photos.filter((p) => p.id !== id))
  }

  return (
    <div className="photo-gallery">
      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((photo) => (
            <figure key={photo.id} className="photo-card">
              <div className="photo-frame">
                <img src={photo.dataUrl} alt="" />
                <button
                  type="button"
                  className="photo-remove no-print"
                  onClick={() => removePhoto(photo.id)}
                  title="Quitar foto"
                >
                  <X size={13} strokeWidth={2} className="icon" />
                </button>
              </div>
              <EditableText
                as="figcaption"
                className="photo-caption"
                value={photo.caption}
                onChange={(caption) => updateCaption(photo.id, caption)}
                placeholder="Pie de foto (ubicación, elemento)"
              />
            </figure>
          ))}
        </div>
      )}
      <label className="photo-upload no-print">
        <Camera size={14} strokeWidth={1.8} className="icon" />
        {busy ? 'Procesando…' : 'Agregar fotos'}
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onFilesSelected} />
      </label>
    </div>
  )
}
