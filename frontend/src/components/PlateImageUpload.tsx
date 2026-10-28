import { useRef, useState } from 'react'
import { ImagePlus, Loader2, ScanLine } from 'lucide-react'
import { uploadPlateImageRequest, type PlateImageUploadResult } from '@/lib/api'

const MAX_SIDE = 1600

// Thu nhỏ ảnh về tối đa 1600px và nén JPEG trước khi gửi để request nhẹ hơn
function fileToResizedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!ctx) {
        reject(new Error('Trình duyệt không hỗ trợ xử lý ảnh.'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Không đọc được file ảnh.'))
    }
    img.src = url
  })
}

/**
 * Ô tải ảnh biển số: ảnh được lưu lên Cloudinary và AI service đọc biển số,
 * kết quả trả về qua onUploaded để form tự điền biển số.
 */
export function PlateImageUpload({
  purpose,
  imageUrl,
  onUploaded,
  label = 'Ảnh biển số',
}: {
  purpose: 'vehicles' | 'violations'
  imageUrl?: string | null
  onUploaded: (result: PlateImageUploadResult) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.')
      return
    }
    setError('')
    setInfo('')
    setUploading(true)
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      const result = await uploadPlateImageRequest(dataUrl, purpose)
      onUploaded(result)
      setInfo(result.plateText ? `AI đọc được biển số: ${result.plateText}` : result.message || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được ảnh lên.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="relative grid h-24 w-40 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-blue-400 hover:text-blue-500 disabled:opacity-70"
        >
          {imageUrl ? (
            <img src={imageUrl} alt="Ảnh biển số" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs">
              <ImagePlus className="h-6 w-6" />
              Chọn ảnh
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 grid place-items-center bg-white/80 text-blue-600">
              <Loader2 className="h-6 w-6 animate-spin" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1 space-y-1 text-xs">
          <p className="text-slate-500">
            {uploading ? (
              <span className="inline-flex items-center gap-1 text-blue-600">
                <ScanLine className="h-3.5 w-3.5" /> Đang tải ảnh và đọc biển số...
              </span>
            ) : imageUrl ? (
              'Bấm vào ảnh để tải ảnh khác.'
            ) : (
              'Tải ảnh rõ biển số, hệ thống sẽ tự đọc và điền biển số.'
            )}
          </p>
          {info && !uploading && (
            <p className={`font-medium ${info.startsWith('AI đọc được') ? 'text-emerald-700' : 'text-amber-700'}`}>
              {info}
            </p>
          )}
          {error && <p className="text-red-600">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
