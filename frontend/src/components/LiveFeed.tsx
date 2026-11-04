import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { fetchCameraLiveFrame } from '@/lib/api'

/** Hiển thị luồng giám sát: liên tục lấy khung hình AI vừa vẽ khung xe, vạch dừng và trạng thái đèn. */
export function LiveFeed({
  cameraId,
  intervalMs = 200,
  className = '',
  alt,
}: {
  cameraId: string
  intervalMs?: number
  className?: string
  alt: string
}) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    let currentUrl: string | null = null

    const tick = async () => {
      try {
        const blob = await fetchCameraLiveFrame(cameraId)
        if (cancelled) return
        if (blob) {
          const next = URL.createObjectURL(blob)
          setSrc(next)
          if (currentUrl) URL.revokeObjectURL(currentUrl)
          currentUrl = next
        }
      } catch {
        // Mất kết nối tạm thời thì giữ khung hình cũ và thử lại ở lần sau
      }
      if (!cancelled) timer = window.setTimeout(() => void tick(), intervalMs)
    }
    void tick()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [cameraId, intervalMs])

  if (!src) {
    return (
      <span className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-white/70">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="font-mono text-[11px] tracking-widest">AI ĐANG KHỞI ĐỘNG</span>
      </span>
    )
  }
  return <img src={src} alt={alt} className={className} />
}
