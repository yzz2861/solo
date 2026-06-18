import CryptoJS from "crypto-js"

export async function computeImageHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const wordArray = CryptoJS.lib.WordArray.create(reader.result as ArrayBuffer)
      const hash = CryptoJS.MD5(wordArray).toString()
      resolve(hash)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
