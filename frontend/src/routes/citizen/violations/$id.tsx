import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, MapPin, ScanLine, CalendarClock } from 'lucide-react'
import { getCitizenDashboard } from '@/lib/api'
import {
  EmptyState,
  PageHeader,
  PlateTag,
  ViolationStatusBadge,
  Modal,
} from '@/components/ui'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { VIOLATION_TYPE_LABEL } from '@/lib/types'
import type { Vehicle, Violation, Invoice } from '@/lib/types'

export const Route = createFileRoute('/citizen/violations/$id')({
  component: ViolationDetail,
})

// Mức phạt dự kiến theo loại vi phạm
const FINE_MAP: Record<string, { amount: number; law: string; code: string }> = {
  RED_LIGHT:       { amount: 4_000_000, law: 'Điều 6 Nghị định 100/2019/NĐ-CP',  code: 'ĐBT-01' },
  WRONG_LANE:      { amount: 1_000_000, law: 'Điều 5 Nghị định 100/2019/NĐ-CP',  code: 'ĐBT-02' },
  SPEEDING:        { amount: 3_000_000, law: 'Điều 7 Nghị định 100/2019/NĐ-CP',  code: 'ĐBT-03' },
  ILLEGAL_PARKING: { amount: 800_000,  law: 'Điều 8 Nghị định 100/2019/NĐ-CP',  code: 'ĐBT-04' },
  HELMET_LESS:     { amount: 300_000,  law: 'Điều 11 Nghị định 100/2019/NĐ-CP', code: 'ĐBT-05' },
  WRONG_WAY:       { amount: 5_000_000, law: 'Điều 5 Nghị định 100/2019/NĐ-CP',  code: 'ĐBT-06' },
}

function ViolationDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const [violations, setViolations] = useState<Violation[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showAppeal, setShowAppeal] = useState(false)
  const [reason, setReason] = useState('')
  const [appealing, setAppealing] = useState(false)
  const [appealError, setAppealError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getCitizenDashboard()
        if (cancelled) return
        setViolations(data.violations ?? [])
        setVehicles(data.vehicles ?? [])
        setInvoices(data.invoices ?? [])
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

  const violation = violations.find((v) => v.id === id)
  if (!violation) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <EmptyState title="Không tìm thấy vi phạm" />
      </div>
    )
  }

  const vehicle = vehicles.find((v) => v.id === violation.vehicleId)
  const invoice = invoices.find((i) => i.violationId === violation.id)
  const fine = FINE_MAP[violation.violationType]

  const handleAppeal = async () => {
    setAppealError('')
    if (reason.trim().length < 10) {
      setAppealError('Vui lòng nhập lý do khiếu nại (tối thiểu 10 ký tự).')
      return
    }
    setAppealing(true)
    try {
      // Gọi API khiếu nại nếu có
      // await appealViolationRequest(violation.id, reason.trim())
      setShowAppeal(false)
      setReason('')
    } catch (err) {
      setAppealError(err instanceof Error ? err.message : 'Không gửi được khiếu nại.')
    } finally {
      setAppealing(false)
    }
  }

  return (
    <>
      <PageHeader
        title={`Chi tiết vi phạm`}
        description={VIOLATION_TYPE_LABEL[violation.violationType]}
        actions={
          <div className="flex items-center gap-2">
            <ViolationStatusBadge status={violation.status} />
            <Link
              to="/citizen/violations"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Cột trái */}
        <div className="space-y-4 lg:col-span-2">
          {/* Ảnh chứng cứ */}
          <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <img
              src={violation.evidenceImageUrl}
              alt={`Ảnh chứng cứ vi phạm ${violation.id}`}
              className="aspect-video w-full object-cover"
            />
            <figcaption className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              Ảnh chứng cứ ghi nhận bởi hệ thống AI
              {violation.cameraLocation ? ` tại ${violation.cameraLocation}` : ''}
            </figcaption>
          </figure>

          {/* Thông tin vi phạm */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">Thông tin vi phạm</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Info
                icon={<CalendarClock className="size-4" />}
                label="Thời gian vi phạm"
                value={formatDateTime(violation.detectedAt)}
              />
              <Info
                icon={<MapPin className="size-4" />}
                label="Vị trí"
                value={violation.cameraLocation || '—'}
              />
              <Info
                icon={<ScanLine className="size-4" />}
                label="Biển số AI nhận diện"
                value={violation.detectedPlateText}
              />
              {violation.dueDate && (
                <Info
                  icon={<CalendarClock className="size-4" />}
                  label="Hạn xử lý"
                  value={formatDate(violation.dueDate)}
                />
              )}
            </div>
          </section>

          {/* Căn cứ xử phạt */}
          {fine && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-2 font-semibold text-slate-900">Căn cứ xử phạt</h2>
              <p className="text-sm text-slate-500">{fine.law}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>
                  Mã lỗi: <span className="font-medium text-slate-800">{fine.code}</span>
                </span>
                <span>
                  Mức phạt dự kiến:{' '}
                  <span className="font-semibold text-red-600">{formatCurrency(fine.amount)}</span>
                </span>
              </div>
            </section>
          )}
        </div>

        {/* Cột phải */}
        <aside className="space-y-4">
          {/* Phương tiện */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">Phương tiện</h2>
            {vehicle ? (
              <div className="space-y-2 text-sm">
                <PlateTag value={vehicle.licensePlate} />
                <p className="text-slate-700">
                  {vehicle.brand} {vehicle.model} · {vehicle.color}
                </p>
                <Link
                  to="/citizen/vehicles/$id"
                  params={{ id: vehicle.id }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Xem chi tiết xe →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Chưa xác định phương tiện.</p>
            )}
          </section>

          {/* Hóa đơn */}
          {invoice && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold text-slate-900">Hóa đơn xử phạt</h2>
              <p className="text-sm text-slate-700">
                {invoice.invoiceCode || invoice.id}
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {formatCurrency(invoice.amount)}
              </p>
              {invoice.dueDate && (
                <p className="mt-0.5 text-xs text-slate-500">
                  Hạn nộp: {formatDate(invoice.dueDate)}
                </p>
              )}
              <button
                type="button"
                onClick={() => navigate({ to: '/citizen/invoices/$id', params: { id: invoice.id } })}
                className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800"
              >
                {invoice.status === 'PAID' ? 'Xem hóa đơn' : 'Nộp phạt ngay'}
              </button>
            </section>
          )}

          {/* Khiếu nại */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 font-semibold text-slate-900">Khiếu nại</h2>
            <p className="text-sm text-slate-500">
              Nếu thông tin vi phạm không chính xác, bạn có thể gửi khiếu nại để được xem xét.
            </p>
            <button
              type="button"
              onClick={() => setShowAppeal(true)}
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Khiếu nại vi phạm này
            </button>
          </section>
        </aside>
      </div>

      {/* Modal khiếu nại */}
      {showAppeal && (
        <Modal
          title={`Khiếu nại vi phạm`}
          description="Nêu rõ lý do khiếu nại. Cán bộ xử lý sẽ phản hồi trong vòng 7 ngày làm việc."
          onClose={() => { setShowAppeal(false); setAppealError('') }}
        >
          <div className="space-y-3">
            <textarea
              rows={5}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Thời điểm ghi nhận xe đang được gửi tại bãi, biển số nhận diện sai..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {appealError && (
              <p className="text-sm text-red-600">{appealError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowAppeal(false); setAppealError('') }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleAppeal}
                disabled={appealing}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {appealing ? 'Đang gửi...' : 'Gửi khiếu nại'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-900 break-words">{value}</p>
      </div>
    </div>
  )
}
