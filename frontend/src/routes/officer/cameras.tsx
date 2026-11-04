import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Camera as CameraIcon,
  Film,
  ImageOff,
  Loader2,
  MapPin,
  Maximize2,
  Pencil,
  Repeat,
  ScanEye,
  Search,
  Settings2,
  Square,
  TrafficCone,
  Wifi,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react'
import {
  getCameraMonitoringRequest,
  getOfficerDashboard,
  startCameraMonitoringRequest,
  stopCameraMonitoringRequest,
  updateCameraRedLightConfigRequest,
  updateCameraVideoRequest,
} from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import {
  CAMERA_STATUS_LABEL,
  type Camera,
  type CameraEvent,
  type CameraStatus,
  type MonitoringStatus,
  type NormalizedBox,
  type SimulatedSignalConfig,
  type StopLine,
  type Violation,
} from '@/lib/types'
import { EmptyState, Modal, PageHeader, StatCard } from '@/components/ui'
import { LiveFeed } from '@/components/LiveFeed'
import { RedLightVideo } from '@/components/RedLightVideo'

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
  const [configuring, setConfiguring] = useState<Camera | null>(null)

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
                  {camera.monitoring ? (
                    <button type="button" onClick={() => setWatching(camera)} className="block h-full w-full" title="Xem lớn">
                      <LiveFeed
                        cameraId={camera.id}
                        intervalMs={500}
                        alt={`Giám sát trực tiếp tại ${camera.locationName}`}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        AI ĐANG GIÁM SÁT
                      </span>
                    </button>
                  ) : camera.videoUrl ? (
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

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingVideo(camera)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600"
                  >
                    <Film className="h-3.5 w-3.5" />
                    {camera.videoUrl ? 'Đổi video' : 'Gắn video'}
                  </button>
                  {camera.videoUrl && (
                    <button
                      type="button"
                      onClick={() => setConfiguring(camera)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Vạch và đèn
                    </button>
                  )}
                </div>

                {camera.videoUrl && (
                  <MonitoringToggle camera={camera} onChanged={replaceCamera} />
                )}

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
          {cameras.find((c) => c.id === watching.id)?.monitoring ? (
            <MonitoringPanel camera={watching} />
          ) : (
            <video src={watching.videoUrl} controls autoPlay muted loop playsInline className="w-full rounded-xl bg-black" />
          )}
        </Modal>
      )}

      {configuring?.videoUrl && (
        <RedLightConfigModal
          camera={configuring}
          onClose={() => setConfiguring(null)}
          onSaved={(next) => {
            replaceCamera(next)
          }}
        />
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

function MonitoringToggle({ camera, onChanged }: { camera: Camera; onChanged: (camera: Camera) => void }) {
  const [busy, setBusy] = useState(false)
  const [toggleError, setToggleError] = useState('')

  const toggle = async () => {
    setBusy(true)
    setToggleError('')
    try {
      const res = camera.monitoring
        ? await stopCameraMonitoringRequest(camera.id)
        : await startCameraMonitoringRequest(camera.id)
      onChanged(res.camera)
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : 'Không đổi được trạng thái giám sát.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
          camera.monitoring
            ? 'border border-red-200 bg-red-50 text-red-700 hover:border-red-400'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : camera.monitoring ? (
          <Square className="h-4 w-4" />
        ) : (
          <ScanEye className="h-4 w-4" />
        )}
        {camera.monitoring ? 'Tắt AI giám sát' : 'Bật AI giám sát'}
      </button>
      {toggleError && <p className="mt-1 text-xs text-red-600">{toggleError}</p>}
    </div>
  )
}

const SIGNAL_LABEL: Record<NonNullable<MonitoringStatus['signalState']>, { text: string; tone: string }> = {
  RED: { text: 'Đèn đỏ', tone: 'text-red-600' },
  YELLOW: { text: 'Đèn vàng', tone: 'text-amber-600' },
  GREEN: { text: 'Đèn xanh', tone: 'text-emerald-600' },
  UNKNOWN: { text: 'Chưa rõ đèn', tone: 'text-slate-500' },
}

function MonitoringPanel({ camera }: { camera: Camera }) {
  const [status, setStatus] = useState<MonitoringStatus | null>(null)
  const [events, setEvents] = useState<CameraEvent[]>([])

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    const poll = async () => {
      try {
        const res = await getCameraMonitoringRequest(camera.id)
        if (cancelled) return
        setStatus(res.status)
        setEvents(res.events)
      } catch {
        // Giữ số liệu cũ và thử lại ở lần sau
      }
      if (!cancelled) timer = window.setTimeout(() => void poll(), 2000)
    }
    void poll()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [camera.id])

  const signal = SIGNAL_LABEL[status?.signalState ?? 'UNKNOWN']

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl bg-slate-900">
        <LiveFeed cameraId={camera.id} alt={`Giám sát trực tiếp tại ${camera.locationName}`} className="w-full" />
      </div>

      {status?.status === 'FAILED' && <p className="text-sm text-red-600">AI gặp lỗi: {status.error}</p>}
      {status?.status === 'AI_OFFLINE' && <p className="text-sm text-red-600">Không kết nối được AI service.</p>}

      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">Tín hiệu</dt>
          <dd className={`font-semibold ${signal.tone}`}>{signal.text}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">Qua vạch hợp lệ</dt>
          <dd className="font-semibold text-slate-900">{status?.crossedAllowed ?? 0}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">Vi phạm vòng này</dt>
          <dd className="font-semibold text-slate-900">{status?.violations ?? 0}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">Tốc độ xử lý</dt>
          <dd className="font-semibold text-slate-900">{status?.processingFps ?? 0} hình/giây</dd>
        </div>
      </dl>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Vi phạm AI vừa ghi nhận</h3>
          <Link to="/officer/violation_queues" className="text-xs font-medium text-blue-600 hover:underline">
            Xem hàng đợi
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">Chưa có vi phạm nào.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {events.map((event) => (
              <li key={event.id} className="overflow-hidden rounded-xl border border-slate-200">
                {event.snapshotUrl && (
                  <img src={event.snapshotUrl} alt="Ảnh bằng chứng vi phạm" loading="lazy" className="aspect-video w-full object-cover" />
                )}
                <div className="px-2 py-1.5 text-xs">
                  <p className="truncate font-mono font-semibold text-slate-900">{event.plate || 'Chưa đọc được biển'}</p>
                  <p className="text-slate-500">
                    {event.signalState === 'YELLOW' ? 'Đèn vàng' : 'Đèn đỏ'} · {formatDateTime(event.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const DEFAULT_SIGNAL: SimulatedSignalConfig = { mode: 'SIMULATED', green: 20, yellow: 3, red: 20, offset: 0 }

const SIGNAL_FIELDS: { key: 'green' | 'yellow' | 'red' | 'offset'; label: string }[] = [
  { key: 'green', label: 'Xanh (giây)' },
  { key: 'yellow', label: 'Vàng (giây)' },
  { key: 'red', label: 'Đỏ (giây)' },
  { key: 'offset', label: 'Lệch pha (giây)' },
]

type DrawTarget = 'line' | 'roi'

function RedLightConfigModal({
  camera,
  onClose,
  onSaved,
}: {
  camera: Camera
  onClose: () => void
  onSaved: (camera: Camera) => void
}) {
  const saved = camera.signalConfig
  const [stopLine, setStopLine] = useState<StopLine | null>(camera.stopLine ?? null)
  const [mode, setMode] = useState<'VISION' | 'SIMULATED'>(saved?.mode === 'VISION' ? 'VISION' : 'SIMULATED')
  const [roi, setRoi] = useState<NormalizedBox | null>(saved?.mode === 'VISION' ? saved.roi : null)
  const [signal, setSignal] = useState<SimulatedSignalConfig>(saved && saved.mode !== 'VISION' ? saved : DEFAULT_SIGNAL)
  const [drawing, setDrawing] = useState<DrawTarget | null>(null)
  const [draftPoint, setDraftPoint] = useState<{ x: number; y: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const startDrawing = (target: DrawTarget) => {
    setDrawing((current) => (current === target ? null : target))
    setDraftPoint(null)
  }

  const pickPoint = (x: number, y: number) => {
    if (!draftPoint) {
      setDraftPoint({ x, y })
      return
    }
    if (drawing === 'roi') {
      setRoi({
        x1: Math.min(draftPoint.x, x),
        y1: Math.min(draftPoint.y, y),
        x2: Math.max(draftPoint.x, x),
        y2: Math.max(draftPoint.y, y),
      })
    } else {
      setStopLine({ x1: draftPoint.x, y1: draftPoint.y, x2: x, y2: y, travelSide: stopLine?.travelSide ?? 1 })
    }
    setDraftPoint(null)
    setDrawing(null)
  }

  const handleSave = async () => {
    if (!stopLine) {
      setFormError('Vui lòng vẽ vạch dừng trên video.')
      return
    }
    if (mode === 'VISION' && !roi) {
      setFormError('Vui lòng khoanh vùng 3 bóng đèn trên video.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      const config = mode === 'VISION' ? { mode: 'VISION' as const, roi: roi! } : { ...signal, mode: 'SIMULATED' as const }
      const res = await updateCameraRedLightConfigRequest(camera.id, stopLine, config)
      onSaved(res.camera)
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không lưu được cấu hình.')
    } finally {
      setSaving(false)
    }
  }

  const hint = drawing
    ? draftPoint
      ? drawing === 'roi' ? 'Bấm góc đối diện của vùng đèn.' : 'Bấm điểm cuối của vạch.'
      : drawing === 'roi' ? 'Bấm một góc của vùng đèn.' : 'Bấm điểm đầu của vạch.'
    : 'Vạch chỉ áp dụng cho các làn nó phủ, nên chừa làn rẽ phải và làn ngược chiều.'

  return (
    <Modal
      title="Vạch dừng và đèn giao thông"
      description={`${camera.locationName} — xe cắt vạch theo đúng chiều mũi tên khi đèn đỏ hoặc vàng sẽ vào hàng đợi chờ duyệt.`}
      onClose={onClose}
      wide
    >
      <div className="space-y-3">
        <RedLightVideo
          src={camera.videoUrl!}
          stopLine={stopLine}
          signalConfig={mode === 'SIMULATED' ? signal : null}
          roi={mode === 'VISION' ? roi : null}
          draftPoint={draftPoint}
          drawing={Boolean(drawing)}
          onPick={pickPoint}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => startDrawing('line')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium ${
              drawing === 'line' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-400'
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            {drawing === 'line' ? 'Hủy vẽ' : 'Vẽ vạch dừng'}
          </button>
          <button
            type="button"
            disabled={!stopLine}
            onClick={() => setStopLine((line) => line && { ...line, travelSide: line.travelSide === 1 ? -1 : 1 })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-blue-400 disabled:opacity-50"
          >
            <Repeat className="h-3.5 w-3.5" />
            Đảo chiều xe
          </button>
          {mode === 'VISION' && (
            <button
              type="button"
              onClick={() => startDrawing('roi')}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium ${
                drawing === 'roi' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-400'
              }`}
            >
              <TrafficCone className="h-3.5 w-3.5" />
              {drawing === 'roi' ? 'Hủy khoanh' : 'Khoanh vùng đèn'}
            </button>
          )}
          <p className="text-xs text-slate-500">{hint}</p>
        </div>

        <label className="block text-xs font-medium text-slate-600">
          Nguồn tín hiệu đèn
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'VISION' | 'SIMULATED')}
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="VISION">Đọc đèn thật trong hình (khoanh đúng 3 bóng đèn xếp dọc)</option>
            <option value="SIMULATED">Giả lập theo chu kỳ (camera không nhìn thấy đèn)</option>
          </select>
        </label>

        {mode === 'SIMULATED' && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SIGNAL_FIELDS.map(({ key, label }) => (
              <label key={key} className="text-xs font-medium text-slate-600">
                {label}
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={signal[key]}
                  onChange={(e) => setSignal((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            ))}
          </div>
        )}

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu cấu hình
          </button>
        </div>
      </div>
    </Modal>
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
