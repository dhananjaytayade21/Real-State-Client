import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { imageFileToDataUrl } from '../../utils/images'

export default function InventoryImageAttachments({ images, onAdd, onRemove, onError, inputId }) {
  const [processing, setProcessing] = useState(false)
  const addFiles = async e => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setProcessing(true)
    try {
      for (const file of files) {
        try {
          onAdd(await imageFileToDataUrl(file))
        } catch (error) {
          onError(error.message)
          break
        }
      }
    } finally {
      setProcessing(false)
    }
  }
  return <div className="inventory-image-attachments">
    <input id={inputId} type="file" accept="image/*" multiple onChange={addFiles} disabled={processing}/>
    <label className="inventory-image-add" htmlFor={inputId}><Plus size={14}/>{processing ? 'Adding photos…' : 'Add photos'}</label>
    <span className="inventory-image-hint">Choose one or more images; they are added one at a time.</span>
    {images.length > 0 && <div className="inventory-image-previews">{images.map((image, index) => <div className="inventory-image-preview" key={`${index}-${image.slice(0, 32)}`}>
      <img src={image} alt={`Item photo ${index + 1}`}/>
      <button type="button" className="inventory-action-cancel" aria-label={`Remove photo ${index + 1}`} disabled={processing} onClick={() => onRemove(index)}>Remove</button>
    </div>)}</div>}
  </div>
}
