export const getInventoryImages = item => Array.isArray(item.images) ? item.images : item.image ? [item.image] : []

export const imageFileToDataUrl = file => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) {
    reject(new Error('Choose an image file.'))
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    reject(new Error('Choose an image smaller than 10 MB.'))
    return
  }
  const reader = new FileReader()
  reader.onerror = () => reject(new Error('The selected image could not be read.'))
  reader.onload = () => {
    const image = new Image()
    image.onerror = () => reject(new Error('The selected image could not be processed.'))
    image.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Image processing is not available in this browser.'))
        return
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.78)
      if (dataUrl.length > 2 * 1024 * 1024) {
        reject(new Error('The image is too large to save in browser storage. Choose a smaller image.'))
        return
      }
      resolve(dataUrl)
    }
    image.src = reader.result
  }
  reader.readAsDataURL(file)
})
