import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  getAIQueue,
  verifyViolation,
  rejectViolation,
  createInvoiceFromViolation,
  lookupPlateRequest,
  type ViolationDetail,
} from '@/lib/api'
import { PageHeader, Modal } from '@/components/ui'
import { formatDateTime, formatCurrency } from '@/lib/format'
import { VIOLATION_TYPE_LABEL } from '@/lib/types'
import { CheckCircle, Loader2, XCircle, AlertTriangle } from 'lucide-react'

export const Route = createFileRoute('/officer/violation_queues')({
  component: QueuePage,
})

function QueuePage() {
  const [violations, setViolations] = useState<ViolationDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState<'time' | 'confidence'>('time')
  
  // Modal states
  const [activeViolation, setActiveViolation] = useState<ViolationDetail | null>(null)
  const [plate, setPlate] = useState('')
  const [vehicleInfo, setVehicleInfo] = useState<any>(null)
  const [loadingVehicle, setLoadingVehicle] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Reject modal
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAIQueue(sortBy)
      const rows = Array.isArray(data?.violations) ? data.violations : []
      setViolations(
        rows.filter((v) => v.status === 'AI_PENDING' && (v.source || 'AI') === 'AI'),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [sortBy])

  const openVerifyModal = (violation: ViolationDetail) => {
    setActiveViolation(violation)
    setPlate(violation.detectedPlateText)
    setVehicleInfo(null)
    // Auto lookup nếu đã có license_plate trong data
    if (violation.licensePlate) {
      lookupVehicle(violation.licensePlate)
    }
  }

  const lookupVehicle = async (plateText: string) => {
    if (!plateText.trim()) return
    setLoadingVehicle(true)
    try {
      const result = await lookupPlateRequest(plateText)
      setVehicleInfo(result)
    } catch (err) {
      setVehicleInfo(null)
    } finally {
      setLoadingVehicle(false)
    }
  }

  const handleVerify = async () => {
    if (!activeViolation) return
    setSubmitting(true)
    try {
      await verifyViolation(activeViolation.id, { 
        correctedPlate: plate,
        vehicleId: vehicleInfo?.vehicle?.id
      })
      setActiveViolation(null)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể xác minh')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerifyAndInvoice = async () => {
    if (!activeViolation || !vehicleInfo?.vehicle) {
      alert('Cần xác định được phương tiện trước khi phát hành hóa đơn')
      return
    }
    setSubmitting(true)
    try {
      await verifyViolation(activeViolation.id, { 
        correctedPlate: plate,
        vehicleId: vehicleInfo.vehicle.id
      })
      await createInvoiceFromViolation(activeViolation.id)
      setActiveViolation(null)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể xử lý')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectId) return
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối')
      return
    }
    setSubmitting(true)
    try {
      await rejectViolation(rejectId, rejectReason.trim())
      setRejectId(null)
      setRejectReason('')
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể từ chối')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Hàng đợi vi phạm AI"
        description={`${violations.length} hồ sơ do AI phát hiện, đang chờ cán bộ duyệt`}
        actions={
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'time' | 'confidence')}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="time">Mới nhất trước</option>
            <option value="confidence">Độ tin cậy thấp trước</option>
          </select>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-500">Đang tải...</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={load} className="mt-3 text-sm text-blue-600 hover:underline">
            Thử lại
          </button>
        </div>
      ) : violations.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
          <p className="mt-3 font-medium text-slate-900">Hàng đợi trống</p>
          <p className="mt-1 text-sm text-slate-500">Không còn vi phạm AI nào chờ duyệt</p>
          <Link to="/officer/violations" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Xem toàn bộ danh sách vi phạm
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {violations.map((v) => (
            <article key={v.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg">
              <div className="relative">
                <img
                  src={v.evidenceImageUrl}
                  alt="Ảnh chứng cứ"
                  className="h-44 w-full bg-slate-100 object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src =
                      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-size="14">Không có ảnh</text></svg>'
                  }}
                />
                <div className="absolute right-2 top-2 flex gap-2">
                  <ConfidenceBadge confidence={v.ocrConfidence} />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-xs text-white/90">{formatDateTime(v.detectedAt)}</p>
                </div>
              </div>
              
              <div className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate rounded-lg bg-amber-100 px-2.5 py-1.5 font-mono text-sm font-bold text-amber-900">
                    {v.detectedPlateText}
                  </span>
                  <Link
                    to="/officer/violations/$id"
                    params={{ id: v.id }}
                    className="shrink-0 text-xs text-blue-600 hover:underline"
                  >
                    Chi tiết →
                  </Link>
                </div>
                
                <div className="space-y-1.5">
                  <p className="font-semibold text-slate-900">
                    {VIOLATION_TYPE_LABEL[v.violationType]}
                  </p>
                  <p className="line-clamp-1 text-xs text-slate-600">{v.cameraLocation || '—'}</p>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="text-xs text-slate-500">Mức phạt</span>
                    <span className="font-bold text-emerald-700">
                      {v.defaultAmount ? formatCurrency(v.defaultAmount) : '—'}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => openVerifyModal(v)}
                    className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Xác minh
                  </button>
                  <button
                    onClick={() => {
                      setRejectId(v.id)
                      setRejectReason('')
                    }}
                    className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Từ chối
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Verify Modal */}
      {activeViolation && (
        <Modal
          title="Xác minh vi phạm"
          description="Kiểm tra biển số và thông tin phương tiện"
          onClose={() => setActiveViolation(null)}
        >
          <div className="space-y-4">
            <img
              src={activeViolation.evidenceImageUrl}
              alt="Ảnh chứng cứ"
              className="h-48 w-full rounded-lg bg-slate-100 object-cover"
            />
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Biển số (chỉnh sửa nếu OCR sai)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="30F-123.45"
                  className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-mono uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  onClick={() => lookupVehicle(plate)}
                  disabled={loadingVehicle}
                  className="rounded-xl bg-slate-100 px-4 text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
                >
                  {loadingVehicle ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tra cứu'}
                </button>
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              {loadingVehicle ? (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tra cứu...
                </div>
              ) : vehicleInfo?.vehicle ? (
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-slate-900">
                    {vehicleInfo.vehicle.brand} {vehicleInfo.vehicle.model} · {vehicleInfo.vehicle.color}
                  </p>
                  {vehicleInfo.owner && (
                    <>
                      <p className="text-slate-700">
                        Chủ xe: {vehicleInfo.owner.fullName}
                      </p>
                      <p className="text-slate-600">CCCD: {vehicleInfo.owner.nationalId}</p>
                      <p className="text-slate-600">SĐT: {vehicleInfo.owner.phone}</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-2 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Không tìm thấy phương tiện trong cơ sở dữ liệu</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveViolation(null)}
                disabled={submitting}
                className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                onClick={handleVerify}
                disabled={submitting}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Xác minh
              </button>
              {vehicleInfo?.vehicle && (
                <button
                  onClick={handleVerifyAndInvoice}
                  disabled={submitting}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Xác minh & Phát hóa đơn
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <Modal
          title="Từ chối vi phạm"
          description="Nhập lý do từ chối hồ sơ này"
          onClose={() => setRejectId(null)}
        >
          <div className="space-y-4">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Ảnh mờ, nhận diện sai, xe ưu tiên..."
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectId(null)}
                disabled={submitting}
                className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleReject}
                disabled={submitting || !rejectReason.trim()}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

function ConfidenceBadge({ confidence }: { confidence?: number | null }) {
  const percent = Math.round(Number(confidence || 0) * 100)
  const color = percent >= 90 ? 'bg-emerald-500' : percent >= 70 ? 'bg-amber-500' : 'bg-red-500'
  
  return (
    <span className={`inline-flex items-center rounded-full ${color} px-2.5 py-1 text-xs font-bold text-white shadow-sm`}>
      {percent}%
    </span>
  )
}
