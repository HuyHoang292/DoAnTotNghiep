import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  getViolationDetail,
  verifyViolation,
  rejectViolation,
  updateViolationPlate,
  createInvoiceFromViolation,
  type ViolationDetail,
  type ViolationHistory,
} from '@/lib/api'
import { PageHeader, Modal } from '@/components/ui'
import { formatDateTime, formatDate, formatCurrency } from '@/lib/format'
import {
  VIOLATION_TYPE_LABEL,
  VIOLATION_STATUS_LABEL,
  VIOLATION_SOURCE_LABEL,
  type ViolationSource,
} from '@/lib/types'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Clock,
  MapPin,
  Car,
  AlertTriangle,
} from 'lucide-react'

export const Route = createFileRoute('/officer/violations/$id')({
  component: ViolationDetailPage,
})

function ViolationDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  
  const [violation, setViolation] = useState<ViolationDetail | null>(null)
  const [invoice, setInvoice] = useState<any>(null)
  const [history, setHistory] = useState<ViolationHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Edit states
  const [plate, setPlate] = useState('')
  const [updatingPlate, setUpdatingPlate] = useState(false)
  
  // Modals
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getViolationDetail(id)
      setViolation(data.violation ?? null)
      setInvoice(data.invoice ?? null)
      setHistory(Array.isArray(data.history) ? data.history : [])
      setPlate(data.violation?.correctedPlateText || data.violation?.detectedPlateText || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const handleUpdatePlate = async () => {
    if (!plate.trim() || !violation) return
    setUpdatingPlate(true)
    try {
      await updateViolationPlate(violation.id, plate.trim())
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể cập nhật')
    } finally {
      setUpdatingPlate(false)
    }
  }

  const handleVerify = async () => {
    if (!violation) return
    setSubmitting(true)
    try {
      await verifyViolation(violation.id, { correctedPlate: plate })
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể xác minh')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!violation || !rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối')
      return
    }
    setSubmitting(true)
    try {
      await rejectViolation(violation.id, rejectReason.trim())
      setRejectModal(false)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể từ chối')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateInvoice = async () => {
    if (!violation) return
    if (!violation.vehicleId) {
      alert('Vi phạm chưa xác định được phương tiện')
      return
    }
    setSubmitting(true)
    try {
      await createInvoiceFromViolation(violation.id)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể tạo hóa đơn')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">Đang tải...</span>
      </div>
    )
  }

  if (error || !violation) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <p className="mt-3 font-medium text-slate-900">Không tìm thấy vi phạm</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <button
          onClick={() => navigate({ to: '/officer/violations' })}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          ← Quay lại danh sách
        </button>
      </div>
    )
  }

  const canVerify = violation.status === 'AI_PENDING' && (violation.source || 'AI') === 'AI'
  const canCreateInvoice = violation.status === 'OFFICER_VERIFIED' && !invoice
  const source = (violation.source || 'AI') as ViolationSource

  return (
    <>
      <PageHeader
        title={`Vi phạm ${violation.id.substring(0, 8)}...`}
        description={VIOLATION_TYPE_LABEL[violation.violationType]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to={source === 'AI' && canVerify ? '/officer/violation_queues' : '/officer/violations'}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Link>
            {canVerify && (
              <>
                <button
                  onClick={handleVerify}
                  disabled={submitting}
                  className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Xác minh
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  disabled={submitting}
                  className="flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Từ chối
                </button>
              </>
            )}
            {canCreateInvoice && (
              <button
                onClick={handleCreateInvoice}
                disabled={submitting}
                className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Phát hành hóa đơn
              </button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-4 xl:col-span-2">
          {/* Evidence Image */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <img
              src={violation.evidenceImageUrl}
              alt="Ảnh chứng cứ"
              className="h-auto w-full max-h-[500px] bg-slate-100 object-contain"
            />
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-amber-100 px-3 py-1.5 font-mono text-sm font-bold text-amber-900">
                  {violation.correctedPlateText || violation.detectedPlateText}
                </span>
                <StatusBadge status={violation.status} />
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                    source === 'OFFICER'
                      ? 'border-slate-200 bg-slate-100 text-slate-800'
                      : 'border-sky-200 bg-sky-100 text-sky-800'
                  }`}
                >
                  {VIOLATION_SOURCE_LABEL[source]}
                </span>
                {source === 'AI' ? <ConfidenceBadge confidence={violation.ocrConfidence} /> : null}
              </div>
              
              {/* Edit Plate */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="Chỉnh sửa biển số"
                  className="h-10 flex-1 rounded-xl border border-slate-200 px-3 font-mono text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  onClick={handleUpdatePlate}
                  disabled={updatingPlate || plate === (violation.correctedPlateText || violation.detectedPlateText)}
                  className="rounded-xl bg-slate-100 px-4 text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
                >
                  {updatingPlate ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu'}
                </button>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
              <Clock className="h-4 w-4 text-blue-600" />
              Lịch sử xử lý
            </h2>
            <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
              {history.map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[26px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-blue-600" />
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{h.action}</p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {formatDateTime(h.timestamp)} · {h.actor}
                    </p>
                    {h.note && (
                      <p className="mt-2 text-sm text-slate-700">{h.note}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Right Column */}
        <aside className="space-y-4">
          {/* Violation Info */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
              <MapPin className="h-4 w-4 text-blue-600" />
              Thông tin vi phạm
            </h2>
            <dl className="space-y-2 text-sm">
              <Row label="Mã vi phạm" value={violation.id} />
              <Row label="Loại lỗi" value={VIOLATION_TYPE_LABEL[violation.violationType]} />
              <Row label="Thời gian" value={formatDateTime(violation.detectedAt)} />
              <Row label="Camera" value={violation.cameraCode || '—'} />
              <Row label="Địa điểm" value={violation.cameraLocation || '—'} />
              <Row label="Tuyến đường" value={violation.roadSegment || '—'} />
              {violation.fineTitle && (
                <>
                  <Row label="Mức phạt" value={violation.fineDefaultAmount ? formatCurrency(violation.fineDefaultAmount) : '—'} />
                  <Row label="Khoảng phạt" value={
                    violation.fineMinAmount && violation.fineMaxAmount
                      ? `${formatCurrency(violation.fineMinAmount)} - ${formatCurrency(violation.fineMaxAmount)}`
                      : '—'
                  } />
                </>
              )}
              {violation.rejectionReason && (
                <div className="rounded-lg bg-red-50 p-2">
                  <p className="text-xs font-medium text-red-800">Lý do từ chối:</p>
                  <p className="mt-1 text-sm text-red-700">{violation.rejectionReason}</p>
                </div>
              )}
            </dl>
          </section>

          {/* Vehicle & Owner */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
              <Car className="h-4 w-4 text-blue-600" />
              Phương tiện & Chủ xe
            </h2>
            {violation.licensePlate ? (
              <dl className="space-y-2 text-sm">
                <Row label="Biển số" value={violation.licensePlate} />
                <Row label="Loại xe" value={violation.vehicleType || '—'} />
                <Row label="Hãng / Dòng" value={
                  violation.brand && violation.model
                    ? `${violation.brand} ${violation.model}`
                    : '—'
                } />
                <Row label="Màu sơn" value={violation.color || '—'} />
                {violation.ownerName && (
                  <>
                    <div className="my-2 border-t border-slate-200" />
                    <Row label="Chủ xe" value={violation.ownerName} />
                    <Row label="CCCD" value={violation.ownerNationalId || '—'} />
                    <Row label="SĐT" value={violation.ownerPhone || '—'} />
                  </>
                )}
              </dl>
            ) : (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mb-1 h-4 w-4" />
                Chưa xác định được phương tiện
              </div>
            )}
          </section>

          {/* Invoice */}
          {invoice && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                <FileText className="h-4 w-4 text-blue-600" />
                Hóa đơn
              </h2>
              <dl className="space-y-2 text-sm">
                <Row label="Mã biên lai" value={invoice.invoiceCode} />
                <Row label="Số tiền" value={formatCurrency(invoice.amount)} />
                <Row label="Ngày phát hành" value={formatDate(invoice.issueDate)} />
                <Row label="Hạn nộp" value={formatDate(invoice.dueDate)} />
                <Row label="Trạng thái" value={
                  <InvoiceStatusBadge status={invoice.status} />
                } />
              </dl>
            </section>
          )}
        </aside>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <Modal
          title="Từ chối vi phạm"
          description="Nhập lý do từ chối hồ sơ này"
          onClose={() => setRejectModal(false)}
        >
          <div className="space-y-4">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Ảnh mờ, nhận diện sai, xe ưu tiên..."
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectModal(false)}
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

function Row({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, any> = {
    AI_PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
    OFFICER_VERIFIED: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    INVOICED: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  }
  const { bg, text, border } = config[status] || config.AI_PENDING
  return (
    <span className={`inline-flex rounded-full border ${border} ${bg} px-2.5 py-1 text-xs font-medium ${text}`}>
      {VIOLATION_STATUS_LABEL[status as keyof typeof VIOLATION_STATUS_LABEL]}
    </span>
  )
}

function ConfidenceBadge({ confidence }: { confidence?: number | null }) {
  const percent = Math.round(Number(confidence || 0) * 100)
  const color = percent >= 90 ? 'text-emerald-700 bg-emerald-100 border-emerald-200' :
                percent >= 70 ? 'text-amber-700 bg-amber-100 border-amber-200' :
                'text-red-700 bg-red-100 border-red-200'
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${color}`}>
      OCR: {percent}%
    </span>
  )
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<string, any> = {
    UNPAID: { bg: 'bg-amber-100', text: 'text-amber-800' },
    PAID: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    OVERDUE: { bg: 'bg-red-100', text: 'text-red-800' },
    CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-800' },
  }
  const labels: Record<string, string> = {
    UNPAID: 'Chưa thanh toán',
    PAID: 'Đã thanh toán',
    OVERDUE: 'Quá hạn',
    CANCELLED: 'Đã hủy',
  }
  const { bg, text } = config[status] || config.UNPAID
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${bg} ${text}`}>
      {labels[status] || status}
    </span>
  )
}
