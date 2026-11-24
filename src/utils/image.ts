const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise(function (resolve, reject) {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = function () {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = function () {
      URL.revokeObjectURL(url)
      reject(new Error('File tidak dapat dibaca sebagai gambar.'))
    }
    image.src = url
  })
}

/** Mengecilkan gambar agar ringan disimpan; menolak file yang bukan gambar. */
export async function resizeImage(file: File, maxSide: number, quality = 0.82): Promise<string> {
  if (ACCEPTED.indexOf(file.type) < 0) {
    throw new Error('File harus berupa gambar (PNG, JPG, atau WEBP).')
  }
  const image = await loadImage(file)
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * ratio)
  canvas.height = Math.round(image.height * ratio)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Peramban tidak mendukung pengolahan gambar.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}
