import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle, Loader2, XCircle } from 'lucide-react'
import { approveVehicleRequest, getCitizenDashboard, rejectVehicleRequest, requestVehicleRevisionRequest } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/format'
import type { Vehicle } from '@/lib/types'
import { VEHICLE_VERIFICATION_STATUS_LABEL } from '@/lib/types'
import { EmptyState, Modal, PageHeader, PlateTag } from '@/components/ui'

export const Route = createFileRoute('/citizen/vehicles/$id')({
  component: VehicleDetail,
})

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  CAR: 'Ô tô',
  MOTORBIKE: 'Xe máy',
  TRUCK: 'Xe tải',
  BUS: 'Xe khách',
  OTHER: 'Khác',
}

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function VehicleDetail() {
  const { id } = Route.useParams()
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showFeedbackModal, setShowFeedbackModal] = useState<'revision' | 'reject' | null>(null)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    const data = await getCitizenDashboard()
    setVehicles(data.vehicles)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await load()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  if (loading) return <p className="text-sm text-slate-500">Đang tải...</p>
  if (error) return <EmptyState title="Lỗi tải dữ liệu" description={error} />

  const vehicle = vehicles.find((v) => v.id === id)

  if (!vehicle) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white">
        <EmptyState title="Không tìm thấy phương tiện" />
      </div>
    )
  }

  const isPending = vehicle.verificationStatus === 'PENDING'
  const isRevisionRequested = vehicle.verificationStatus === 'REVISION_REQUESTED'
  const isApproved = vehicle.verificationStatus === 'APPROVED'
  const isRejected = vehicle.verificationStatus === 'REJECTED'
  const canTakeAction = isPending || isRevisionRequested

  const handleApprove = async () => {
    setNotice('')
    setSubmitting(true)
    try {
      const res = await approveVehicleRequest(vehicle.id)
      setNotice(res.message || 'Đã xác nhận thông tin phương tiện.')
      await load()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không duyệt được phương tiện.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestRevision = async () => {
    setFeedbackError('')
    if (!feedback.trim()) {
      setFeedbackError('Vui lòng nhập nội dung cần chỉnh sửa.')
      return
    }
    setSubmitting(true)
    try {
      const res = await requestVehicleRevisionRequest(vehicle.id, feedback.trim())
      setNotice(res.message || 'Đã gửi yêu cầu chỉnh sửa.')
      setShowFeedbackModal(null)
      setFeedback('')
      await load()
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Không gửi được yêu cầu.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    setFeedbackError('')
    if (!feedback.trim()) {
      setFeedbackError('Vui lòng nhập lý do từ chối.')
      return
    }
    setSubmitting(true)
    try {
      const res = await rejectVehicleRequest(vehicle.id, feedback.trim())
      setNotice(res.message || 'Đã từ chối thông tin phương tiện.')
      setShowFeedbackModal(null)
      setFeedback('')
      await load()
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Không từ chối được phương tiện.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Thông tin phương tiện"
        description="Chi tiết thông tin phương tiện của bạn."
        actions={
          <Link
            to="/citizen/vehicles"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Link>
        }
      />

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {/* Trạng thái xác minh */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900">Trạng thái xác minh</h3>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-800'
                    : isPending
                    ? 'bg-amber-100 text-amber-800'
                    : isRevisionRequested
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {VEHICLE_VERIFICATION_STATUS_LABEL[vehicle.verificationStatus || 'PENDING']}
              </span>
              {vehicle.verifiedAt && (
                <span className="text-xs text-slate-500">
                  {formatDateTime(vehicle.verifiedAt)}
                </span>
              )}
            </div>
            {canTakeAction && (
              <p className="mt-2 text-sm text-slate-600">
                Vui lòng kiểm tra thông tin phương tiện bên dưới và xác nhận.
              </p>
            )}
            {vehicle.citizenFeedback && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Phản hồi của bạn:</p>
                <p className="mt-1 text-sm text-slate-900">{vehicle.citizenFeedback}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Thông tin xe */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {vehicle.plateImageUrl && (
          <img
            src={vehicle.plateImageUrl}
            alt={`Ảnh biển số ${vehicle.licensePlate}`}
            className="mb-4 max-h-64 w-full rounded-xl border border-slate-200 bg-slate-100 object-contain"
          />
        )}
        <div className="mb-4">
          <PlateTag value={vehicle.licensePlate} />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <InfoRow label="Loại xe" value={VEHICLE_TYPE_LABEL[vehicle.vehicleType] ?? vehicle.vehicleType} />
          <InfoRow label="Hãng / Mẫu" value={`${vehicle.brand || '—'} ${vehicle.model || ''}`.trim()} />
          <InfoRow label="Màu sơn" value={vehicle.color || '—'} />
          <InfoRow
            label="Ngày đăng ký"
            value={vehicle.registeredAt ? formatDate(vehicle.registeredAt) : '—'}
          />
          <InfoRow label="Chủ sở hữu" value={vehicle.ownerName || '—'} />
          <InfoRow label="CCCD chủ xe" value={vehicle.ownerNationalId || '—'} />
          <InfoRow label="SĐT chủ xe" value={vehicle.ownerPhone || '—'} />
          <InfoRow label="Email chủ xe" value={vehicle.ownerEmail || '—'} />
          <InfoRow label="Số khung" value={vehicle.chassisNumber || '—'} />
          <InfoRow label="Số máy" value={vehicle.engineNumber || '—'} />
          <InfoRow label="Số bảo hiểm" value={vehicle.insuranceNumber || '—'} />
          <InfoRow
            label="Ngày tạo"
            value={vehicle.createdAt ? formatDateTime(vehicle.createdAt) : '—'}
          />
          <InfoRow
            label="Cập nhật lúc"
            value={vehicle.updatedAt ? formatDateTime(vehicle.updatedAt) : '—'}
          />
        </dl>
      </section>

      {/* Các nút hành động */}
      {canTakeAction && (
        <section className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setShowFeedbackModal('reject')
              setFeedback('')
              setFeedbackError('')
            }}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" />
            Từ chối
          </button>
          <button
            type="button"
            onClick={() => {
              setShowFeedbackModal('revision')
              setFeedback('')
              setFeedbackError('')
            }}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-60"
          >
            Yêu cầu chỉnh sửa
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Xác nhận đúng
          </button>
        </section>
      )}

      {/* Modal yêu cầu chỉnh sửa hoặc từ chối */}
      {showFeedbackModal && (
        <Modal
          title={showFeedbackModal === 'revision' ? 'Yêu cầu chỉnh sửa' : 'Từ chối thông tin'}
          description={
            showFeedbackModal === 'revision'
              ? 'Nhập thông tin chính xác để công an cập nhật lại.'
              : 'Nhập lý do tại sao thông tin này không đúng.'
          }
          onClose={() => setShowFeedbackModal(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (showFeedbackModal === 'revision') {
                handleRequestRevision()
              } else {
                handleReject()
              }
            }}
            className="space-y-3"
          >
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                {showFeedbackModal === 'revision' ? 'Thông tin cần chỉnh sửa' : 'Lý do từ chối'}
              </span>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={
                  showFeedbackModal === 'revision'
                    ? 'Ví dụ: Biển số đúng là 30F-123.45, màu xe là đỏ...'
                    : 'Ví dụ: Đây không phải xe của tôi...'
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                rows={4}
                autoFocus
              />
            </label>

            {feedbackError && <p className="text-sm text-red-600">{feedbackError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(null)}
                disabled={submitting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                  showFeedbackModal === 'revision'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {showFeedbackModal === 'revision' ? 'Gửi yêu cầu' : 'Xác nhận từ chối'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}
