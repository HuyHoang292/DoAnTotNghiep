import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Camera,
  Car,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  Phone,
  ScanLine,
  ShieldAlert,
  User as UserIcon,
  X,
  ZapIcon,
} from 'lucide-react'
import { lookupPlateRequest, scanPlateRequest, type PlateScanResult } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { VIOLATION_TYPE_LABEL } from '@/lib/types'
import {
  EmptyState,
  InvoiceStatusBadge,
  PageHeader,
  PlateTag,
  StatCard,
  ViolationStatusBadge,
} from '@/components/ui'

export const Route = createFileRoute('/officer/scan')({
  component: OfficerScanPage,
})

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  CAR: 'Ô tô',
  MOTORBIKE: 'Xe máy',
  TRUCK: 'Xe tải',
  BUS: 'Xe khách',
  OTHER: 'Khác',
}

const AIM_INSET = 0.15

function OfficerScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)
  const cameraOpenRef = useRef(false)

  const [cameraOpen, setCameraOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [liveHint, setLiveHint] = useState('Đưa biển số vào khung xanh — hệ thống đang tự quét')
  const [manualPlate, setManualPlate] = useState('')
  const [snapshot, setSnapshot] = useState<string | null>(null)
  const [result, setResult] = useState<PlateScanResult | null>(null)
  const [scanSuccess, setScanSuccess] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    cameraOpenRef.current = false
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  const closeCamera = useCallback(() => {
    stopCamera()
    setCameraOpen(false)
    setScanning(false)
    scanningRef.current = false
  }, [stopCamera])

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh || video.readyState < 2) return null

    const side = Math.min(vw, vh)
    const inset = side * AIM_INSET
    const sx = (vw - side) / 2 + inset
    const sy = (vh - side) / 2 + inset
    const sSize = side * (1 - AIM_INSET * 2)
    if (sSize < 32) return null

    canvas.width = 640
    canvas.height = 640
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, sx, sy, sSize, sSize, 0, 0, 640, 640)
    return canvas.toDataURL('image/jpeg', 0.92)
  }, [])

  const recognizeImage = useCallback(
    async (image: string, options?: { keepCameraOnFail?: boolean }) => {
      const keepCameraOnFail = options?.keepCameraOnFail ?? false
      scanningRef.current = true
      setScanning(true)
      setError('')
      setScanSuccess(false)
      setSnapshot(image)
      try {
        const data = await scanPlateRequest(image)
        if (!cameraOpenRef.current && keepCameraOnFail) return false

        const plate = data.plate || data.plateText || ''
        const raw = data.rawText || ''
        setResult(data)
        if (plate || raw) setManualPlate(plate || raw)

        if (plate) {
          setScanSuccess(true)
          setLiveHint('')
          closeCamera()
          return true
        }

        const hint = raw
          ? `Đọc được "${raw}" nhưng chưa khớp biển số. Giữ yên hoặc bấm Quét ngay.`
          : data.message || 'Chưa đọc được biển số. Canh rõ hơn rồi hệ thống sẽ quét tiếp.'
        setLiveHint(hint)
        if (!keepCameraOnFail) {
          setScanSuccess(false)
          setError(hint)
          closeCamera()
        }
        return false
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Không nhận diện được biển số.'
        if (keepCameraOnFail && cameraOpenRef.current) {
          setLiveHint(message)
          return false
        }
        setResult(null)
        setError(message)
        closeCamera()
        return false
      } finally {
        scanningRef.current = false
        setScanning(false)
      }
    },
    [closeCamera],
  )

  const scanCameraFrame = useCallback(async () => {
    if (scanningRef.current || !cameraOpenRef.current) return false
    const image = captureFrame()
    if (!image) {
      setLiveHint('Camera chưa có hình. Đợi hình ảnh hiện ra...')
      return false
    }
    return recognizeImage(image, { keepCameraOnFail: true })
  }, [captureFrame, recognizeImage])

  const openCamera = async () => {
    setError('')
    setResult(null)
    setSnapshot(null)
    setScanSuccess(false)
    setLiveHint('Đang mở camera...')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      cameraOpenRef.current = true
      setCameraOpen(true)
    } catch {
      cameraOpenRef.current = false
      setError('Không mở được camera. Hãy cấp quyền camera cho trình duyệt hoặc chọn ảnh từ máy.')
      setCameraOpen(false)
    }
  }

  useEffect(() => {
    if (!cameraOpen) return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return

    video.srcObject = stream
    video.muted = true
    video.playsInline = true
    const play = () => {
      void video.play().catch(() => undefined)
    }
    play()
    video.addEventListener('loadedmetadata', play)

    let cancelled = false
    const waitThenLoop = async () => {
      for (let i = 0; i < 50 && !cancelled; i += 1) {
        if (video.readyState >= 2 && video.videoWidth > 0) break
        await new Promise((r) => setTimeout(r, 100))
      }
      if (cancelled) return
      setLiveHint('Đưa biển số vào khung xanh — đang tự quét')
      while (!cancelled && cameraOpenRef.current) {
        if (!scanningRef.current) {
          const ok = await scanCameraFrame()
          if (ok || cancelled) break
        }
        await new Promise((r) => setTimeout(r, 1100))
      }
    }
    void waitThenLoop()

    return () => {
      cancelled = true
      video.removeEventListener('loadedmetadata', play)
    }
  }, [cameraOpen, scanCameraFrame])

  const handleScanClick = async () => {
    if (!cameraOpen) {
      await openCamera()
      return
    }
    const ok = await scanCameraFrame()
    if (!ok && !captureFrame()) {
      setError('Camera chưa sẵn sàng. Đợi hình ảnh hiện ra rồi bấm Quét ngay.')
    }
  }

  const handleManualLookup = async (event: React.FormEvent) => {
    event.preventDefault()
    const plate = manualPlate.trim()
    if (!plate) {
      setError('Vui lòng nhập biển số để tra cứu.')
      return
    }
    setScanning(true)
    scanningRef.current = true
    setError('')
    setSnapshot(null)
    setScanSuccess(false)
    try {
      const data = await lookupPlateRequest(plate)
      setResult(data)
      setScanSuccess(true)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Không tra cứu được biển số.')
    } finally {
      scanningRef.current = false
      setScanning(false)
    }
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    closeCamera()
    const reader = new FileReader()
    reader.onload = async () => {
      const image = String(reader.result || '')
      if (image) await recognizeImage(image)
    }
    reader.readAsDataURL(file)
  }

  const handleReset = () => {
    setResult(null)
    setSnapshot(null)
    setError('')
    setManualPlate('')
    setScanSuccess(false)
  }

  const unpaid = result?.invoices.filter((i) => i.status === 'UNPAID' || i.status === 'OVERDUE') ?? []
  const hasRecord = Boolean(result?.vehicle || (result?.violations.length ?? 0) > 0)

  return (
    <>
      <PageHeader
        title="Quét biển số xe"
        description="Bước 1: Roboflow tìm khung biển số. Bước 2: OCR ký tự trong khung đó — tra cứu chủ xe và lịch sử vi phạm."
      />

      {/* ── Khung điều khiển ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          {/* Nút Quét chính */}
          <button
            type="button"
            onClick={handleScanClick}
            disabled={scanning}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-blue-400 transition-all"
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ScanLine className="h-4 w-4" />
            )}
            {cameraOpen ? 'Quét ngay' : 'Mở camera quét'}
          </button>

          {cameraOpen && (
            <button
              type="button"
              onClick={closeCamera}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Đóng camera
            </button>
          )}

          {/* Tra cứu thủ công */}
          <form onSubmit={handleManualLookup} className="flex flex-1 gap-2">
            <input
              value={manualPlate}
              onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
              placeholder="Nhập biển số: 30F-123.45"
              className="h-11 flex-1 rounded-xl border border-slate-200 px-3 font-mono uppercase tracking-widest outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
            />
            <button
              type="submit"
              disabled={scanning}
              className="h-11 rounded-xl bg-slate-800 px-5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              Tra cứu
            </button>
          </form>
        </div>

        {/* Upload ảnh */}
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
            <Camera className="h-4 w-4" />
            Chọn ảnh biển số từ máy
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>

          {(result || error) && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" />
              Xoá kết quả
            </button>
          )}

          <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
            <ZapIcon className="h-3 w-3 text-amber-400" />
            2 mô hình Roboflow: khung biển số + OCR ký tự
          </span>
        </div>
      </section>

      {/* ── Khung camera ── */}
      {cameraOpen && (
        <section className="rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {scanning ? 'Đang gửi ảnh lên AI nhận diện...' : 'Camera đang tự quét — canh biển số vào khung xanh'}
            </p>
            <button
              type="button"
              onClick={closeCamera}
              className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Viewport camera hình vuông */}
          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-black shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {/* Lớp tối bên ngoài khung nhắm */}
            <div className="pointer-events-none absolute inset-0 bg-black/40" />

            {/* Khung nhắm chính giữa */}
            <div className="pointer-events-none absolute inset-[15%] rounded-xl border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]">
              {/* 4 góc nổi bật */}
              <span className="absolute -left-[2px] -top-[2px] h-5 w-5 border-l-4 border-t-4 border-emerald-300 rounded-tl-lg" />
              <span className="absolute -right-[2px] -top-[2px] h-5 w-5 border-r-4 border-t-4 border-emerald-300 rounded-tr-lg" />
              <span className="absolute -left-[2px] -bottom-[2px] h-5 w-5 border-l-4 border-b-4 border-emerald-300 rounded-bl-lg" />
              <span className="absolute -right-[2px] -bottom-[2px] h-5 w-5 border-r-4 border-b-4 border-emerald-300 rounded-br-lg" />

              {/* Thanh laser quét (CSS animation) */}
              {!scanning && (
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan-laser" />
              )}
            </div>

            {/* Overlay đang xử lý */}
            {scanning && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                <p className="inline-flex items-center gap-2 rounded-full bg-black/75 px-3 py-1.5 text-xs font-medium text-white">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  Đang nhận diện biển số...
                </p>
              </div>
            )}
          </div>

          <p className="mt-3 text-center text-sm text-emerald-300">{liveHint}</p>
          <button
            type="button"
            onClick={() => void scanCameraFrame()}
            disabled={scanning}
            className="mx-auto mt-3 flex h-11 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            Quét ngay
          </button>
          <p className="mt-2 text-center text-xs text-white/50">
            Ảnh lấy từ khung xanh rồi gửi Roboflow (detect biển số + OCR ký tự)
          </p>
        </section>
      )}

      <canvas ref={canvasRef} className="pointer-events-none absolute h-px w-px opacity-0" aria-hidden />

      {/* ── Lỗi ── */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          {error}
        </div>
      )}

      {/* ── Đang xử lý (sau khi đóng camera) ── */}
      {scanning && !cameraOpen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-3 font-medium text-slate-700">Hệ thống AI đang phân tích biển số...</p>
          <p className="mt-1 text-sm text-slate-400">Roboflow: detect biển số · OCR ký tự</p>
        </div>
      )}

      {/* ── Ảnh snapshot + thông tin nhận diện ── */}
      {snapshot && !cameraOpen && result && (
        <div
          className={`flex flex-col items-center gap-4 rounded-2xl border p-5 sm:flex-row ${
            scanSuccess
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <img
            src={snapshot}
            alt="Ảnh biển số vừa quét"
            className={`h-36 w-36 shrink-0 rounded-xl object-cover shadow ring-2 ${
              scanSuccess ? 'ring-emerald-300' : 'ring-amber-300'
            }`}
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              {scanSuccess ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <p className={`font-semibold ${scanSuccess ? 'text-emerald-800' : 'text-amber-800'}`}>
                {scanSuccess ? 'Nhận diện thành công' : 'Cần kiểm tra lại ký tự'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-lg px-3 py-1 font-mono text-lg font-bold tracking-widest ${
                  scanSuccess
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-white text-amber-900 border border-amber-200'
                }`}
              >
                {result.plate || result.rawText || '—'}
              </span>
              {result.confidence != null && (
                <span className="rounded-lg bg-white border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">
                  Khung biển: {Math.round(result.confidence * 100)}%
                </span>
              )}
            </div>
            {result.rawText && result.rawText !== result.plate && (
              <p className="text-xs text-slate-500">
                OCR thô: <span className="font-mono">{result.rawText}</span>
              </p>
            )}
            {result.characters && result.characters.length > 0 && (
              <p className="text-xs text-slate-500">
                Ký tự OCR:{' '}
                <span className="font-mono">
                  {result.characters.map((c) => c.class).join(' ')}
                </span>
              </p>
            )}
            {result.detections && result.detections.length > 0 && (
              <p className="text-xs text-slate-500">
                Phát hiện {result.detections.length} khung biển số · confidence cao nhất:{' '}
                {Math.round(Math.max(...result.detections.map((d) => d.confidence)) * 100)}%
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Kết quả tra cứu ── */}
      {!scanning && scanSuccess && result && (
        hasRecord ? (
          <div className="space-y-4">
            {/* Tóm tắt số liệu */}
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Vi phạm liên quan"
                value={result.violations.length}
                icon={<ShieldAlert className="h-5 w-5" />}
                tone="info"
              />
              <StatCard
                label="Biên lai chưa nộp"
                value={unpaid.length}
                tone={unpaid.length > 0 ? 'danger' : 'success'}
                icon={<FileText className="h-5 w-5" />}
              />
              <StatCard
                label="Tổng tiền còn nợ"
                value={formatCurrency(unpaid.reduce((s, i) => s + i.amount, 0))}
                tone={unpaid.length > 0 ? 'pending' : 'success'}
                icon={<FileText className="h-5 w-5" />}
              />
            </div>

            {/* Xe + chủ sở hữu */}
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                  <Car className="h-4 w-4 text-blue-600" />
                  Thông tin phương tiện
                </h2>
                {result.vehicle ? (
                  <dl className="grid gap-2 text-sm">
                    <Row label="Biển kiểm soát">
                      <PlateTag value={result.vehicle.licensePlate} />
                    </Row>
                    <Row label="Loại xe">
                      {VEHICLE_TYPE_LABEL[result.vehicle.vehicleType] || result.vehicle.vehicleType}
                    </Row>
                    <Row label="Hãng / Dòng xe">
                      {result.vehicle.brand} {result.vehicle.model}
                    </Row>
                    <Row label="Màu sơn">{result.vehicle.color}</Row>
                    {result.vehicle.chassisNumber && (
                      <Row label="Số khung">{result.vehicle.chassisNumber}</Row>
                    )}
                    {result.vehicle.engineNumber && (
                      <Row label="Số máy">{result.vehicle.engineNumber}</Row>
                    )}
                    {result.vehicle.registeredAt && (
                      <Row label="Ngày đăng ký">{formatDate(result.vehicle.registeredAt)}</Row>
                    )}
                  </dl>
                ) : (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                    <p className="font-medium">Chưa đăng ký trong hệ thống</p>
                    <p className="mt-1 text-xs text-amber-700">
                      Biển số <span className="font-mono font-bold">{result.plate}</span> chưa có
                      trong cơ sở dữ liệu đăng ký phương tiện.
                      {result.violations.length > 0 &&
                        ` Vẫn tìm thấy ${result.violations.length} vi phạm do camera ghi nhận.`}
                    </p>
                  </div>
                )}
              </section>

              <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                  <UserIcon className="h-4 w-4 text-blue-600" />
                  Chủ sở hữu
                </h2>
                {result.owner ? (
                  <dl className="grid gap-2 text-sm">
                    <Row label="Họ và tên">
                      <span className="font-semibold text-slate-900">{result.owner.fullName}</span>
                    </Row>
                    <Row label="CCCD">
                      <span className="inline-flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                        {result.owner.nationalId}
                      </span>
                    </Row>
                    <Row label="Điện thoại">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {result.owner.phone}
                      </span>
                    </Row>
                    <Row label="Email">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {result.owner.email || '—'}
                      </span>
                    </Row>
                  </dl>
                ) : (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
                    Không xác định được chủ sở hữu của biển số này.
                  </div>
                )}
              </section>
            </div>

            {/* Danh sách vi phạm */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 font-semibold text-slate-900">
                <ShieldAlert className="h-4 w-4 text-blue-600" />
                Vi phạm liên quan
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {result.violations.length}
                </span>
              </h2>
              {result.violations.length === 0 ? (
                <EmptyState title="Phương tiện chưa có vi phạm nào" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {result.violations.map((v) => (
                    <li key={v.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <div className="min-w-52 flex-1">
                        <p className="font-medium text-slate-800">
                          {VIOLATION_TYPE_LABEL[v.violationType]}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(v.detectedAt)}
                          {v.cameraLocation ? ` · ${v.cameraLocation}` : ''}
                        </p>
                      </div>
                      <ViolationStatusBadge status={v.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Danh sách biên lai */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 font-semibold text-slate-900">
                <FileText className="h-4 w-4 text-blue-600" />
                Biên lai xử phạt
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {result.invoices.length}
                </span>
              </h2>
              {result.invoices.length === 0 ? (
                <EmptyState title="Chưa phát hành biên lai nào" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {result.invoices.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <div className="min-w-40 flex-1">
                        <p className="font-medium text-slate-800">{i.invoiceCode || i.id}</p>
                        {i.dueDate && (
                          <p className="text-xs text-slate-500">
                            Hạn nộp {formatDate(i.dueDate)}
                          </p>
                        )}
                      </div>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(i.amount)}
                      </span>
                      <InvoiceStatusBadge status={i.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <EmptyState
              title={`Không tìm thấy dữ liệu cho biển số "${result.plate}"`}
              description="Kiểm tra lại ký tự biển số hoặc đăng ký phương tiện vào hệ thống."
            />
          </div>
        )
      )}
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-slate-100 pb-2 last:border-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}
