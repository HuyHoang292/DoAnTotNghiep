import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Camera as CameraIcon,
  Film,
  ImageOff,
  Loader2,
  MapPin,
  Maximize2,
  Search,
  Wifi,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react'
import { getOfficerDashboard, updateCameraVideoRequest } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { CAMERA_STATUS_LABEL, type Camera, type CameraStatus, type Violation } from '@/lib/types'
import { EmptyState, Modal, PageHeader, StatCard } from '@/components/ui'

export const Route = createFileRoute('/officer/cameras')({
  component: OfficerCameras,
})

// Camera ảo dùng cho vi phạm do cán bộ ghi nhận trực tiếp, không phải thiết bị thật
const MANUAL_CAMERA_ID = 'cam-officer-manual'

const STATUS_TONE: Record<CameraStatus, string> = {
  ONLINE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  OFFLINE: 'border-red-200 bg-red-50 text-red-700',
  MAINTENANCE: 'border-amber-200 bg-amber-50 text-amber-700',
}

const STATUS_ICON: Record<CameraStatus, typeof Wifi> = {
  ONLINE: Wifi,
  OFFLINE: WifiOff,
  MAINTENANCE: Wrench,
}

function OfficerCameras() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [editingVideo, setEditingVideo] = useState<Camera | null>(null)
  const [watching, setWatching] = useState<Camera | null>(null)

  const replaceCamera = (next: Camera) => setCameras((prev) => prev.map((c) => (c.id === next.id ? next : c)))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const dash = await getOfficerDashboard()
        if (cancelled) return
        setCameras((dash.cameras ?? []).filter((c) => c.id !== MANUAL_CAMERA_ID))
        setViolations(dash.violations ?? [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo(() => {
    const keyword = q.trim().toLowerCase()
    return cameras
      .filter((c) =>
        `${c.locationName} ${c.roadSegment ?? ''} ${c.cameraCode ?? ''}`.toLowerCase().includes(keyword),
      )
      .map((camera) => {
        const list = violations
          .filter((v) => v.cameraId === camera.id)
          .sort((a, b) => +new Date(b.detectedAt) - +new Date(a.detectedAt))
        return { camera, count: list.length, latest: list[0] }
      })
  }, [cameras, violations, q])

  const online = cameras.filter((c) => c.status === 'ONLINE').length
  const offline = cameras.filter((c) => c.status === 'OFFLINE').length

  if (loading) return <p className="text-sm text-slate-500">Đang tải danh sách camera...</p>
  if (error) return <EmptyState title="Không tải được dữ liệu" description={error} />

  return (
    <>
      <PageHeader
        title="Camera giám sát"
        description="Thiết bị AI ghi nhận vi phạm trên các tuyến đường và khung hình vi phạm gần nhất."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Tổng camera" value={cameras.length} icon={<CameraIcon className="h-5 w-5" />} tone="info" />
        <StatCard label="Đang hoạt động" value={online} icon={<Wifi className="h-5 w-5" />} tone="success" />
        <StatCard
          label="Mất kết nối"
          value={offline}
          icon={<WifiOff className="h-5 w-5" />}
          tone="danger"
          hint={`${cameras.length - online - offline} camera đang bảo trì`}
        />
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo vị trí, tuyến đường hoặc mã camera..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {q && (
            <button type="button" onClick={() => setQ('')}>
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <EmptyState title="Không tìm thấy camera" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ camera, count, latest }) => {
            const StatusIcon = STATUS_ICON[camera.status]
            const hasCoords = camera.latitude != null && camera.longitude != null
            return (
              <article
                key={camera.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-slate-900">{camera.locationName}</h2>
                    <p className="text-xs text-slate-500">{camera.roadSegment || '—'}</p>
                    {camera.cameraCode && (
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">{camera.cameraCode}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[camera.status]}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {CAMERA_STATUS_LABEL[camera.status]}
                  </span>
                </div>

                {hasCoords ? (
                  <a
                    href={`https://www.google.com/maps?q=${camera.latitude},${camera.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-fit items-center gap-1.5 text-xs text-blue-600 hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {camera.latitude!.toFixed(5)}, {camera.longitude!.toFixed(5)}
                  </a>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin className="h-3.5 w-3.5" /> Chưa có toạ độ
                  </p>
                )}

                {/* Khung hình: video mẫu nếu có, nếu không thì ảnh vi phạm gần nhất */}
                <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900">
                  {camera.videoUrl ? (
                    <>
                      <video
                        src={camera.videoUrl}
                        muted
                        autoPlay
                        loop
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-red-400">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                        VIDEO MẪU
                      </span>
                      <button
                        type="button"
                        onClick={() => setWatching(camera)}
                        title="Xem lớn"
                        className="absolute right-2 top-2 rounded bg-black/60 p-1.5 text-white hover:bg-black/80"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : latest?.evidenceImageUrl ? (
                    <Link to="/officer/violations/$id" params={{ id: latest.id }} className="group block h-full">
                      <img
                        src={latest.evidenceImageUrl}
                        alt={`Khung hình vi phạm tại ${camera.locationName}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                        KHUNG HÌNH GẦN NHẤT
                      </span>
                    </Link>
                  ) : (
                    <span className="flex h-full flex-col items-center justify-center gap-1 text-white/60">
                      {camera.status === 'ONLINE' ? (
                        <ImageOff className="h-6 w-6" />
                      ) : (
                        <WifiOff className="h-6 w-6" />
                      )}
                      <span className="font-mono text-[11px] tracking-widest">
                        {camera.status === 'ONLINE' ? 'CHƯA CÓ KHUNG HÌNH' : 'MẤT TÍN HIỆU'}
                      </span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setEditingVideo(camera)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600"
                >
                  <Film className="h-3.5 w-3.5" />
                  {camera.videoUrl ? 'Đổi video' : 'Gắn video'}
                </button>

                <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-xs text-slate-500">Vi phạm ghi nhận</p>
                    <p className="text-xl font-bold text-slate-900">{count}</p>
                  </div>
                  <p className="text-right text-xs text-slate-500">
                    Gần nhất
                    <span className="block font-medium text-slate-900">
                      {latest ? formatDateTime(latest.detectedAt) : '—'}
                    </span>
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {watching?.videoUrl && (
        <Modal title={watching.locationName} description={watching.roadSegment} onClose={() => setWatching(null)} wide>
          <video src={watching.videoUrl} controls autoPlay muted loop playsInline className="w-full rounded-xl bg-black" />
        </Modal>
      )}

      {editingVideo && (
        <CameraVideoModal
          camera={editingVideo}
          onClose={() => setEditingVideo(null)}
          onSaved={(next) => {
            replaceCamera(next)
            setEditingVideo(null)
          }}
        />
      )}
    </>
  )
}

function CameraVideoModal({
  camera,
  onClose,
  onSaved,
}: {
  camera: Camera
  onClose: () => void
  onSaved: (camera: Camera) => void
}) {
  const [url, setUrl] = useState(camera.videoUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const save = async (videoUrl: string) => {
    setFormError('')
    setSaving(true)
    try {
      const res = await updateCameraVideoRequest(camera.id, videoUrl)
      onSaved(res.camera)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không lưu được video.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={camera.videoUrl ? 'Đổi video camera' : 'Gắn video camera'}
      description="Dán link video đã tải lên Cloudinary (Media Library → Copy URL)."
      onClose={onClose}
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!url.trim()) {
            setFormError('Vui lòng dán link video.')
            return
          }
          void save(url.trim())
        }}
      >
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
          <p className="font-semibold text-slate-900">{camera.locationName}</p>
          <p className="text-slate-500">{camera.cameraCode || camera.roadSegment}</p>
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://res.cloudinary.com/.../video/upload/....mp4"
          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {url.trim() && /^https:\/\//.test(url.trim()) && (
          <video src={url.trim()} muted controls preload="metadata" className="w-full rounded-xl bg-black" />
        )}
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <div className="flex justify-between gap-2 pt-1">
          {camera.videoUrl ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void save('')}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:border-red-400 disabled:opacity-60"
            >
              Gỡ video
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
