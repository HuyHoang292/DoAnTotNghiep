import { createFileRoute } from '@tanstack/react-router'
import { Car, FileText, TriangleAlert, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState, PageHeader, StatCard, ViolationStatusBadge } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { getCitizenDashboard } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { VIOLATION_TYPE_LABEL, type Invoice, type Vehicle, type Violation } from '@/lib/types'

export const Route = createFileRoute('/citizen/dashboard')({
  component: CitizenDashboard,
})

function CitizenDashboard() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getCitizenDashboard()
        if (cancelled) return
        setVehicles(data.vehicles)
        setViolations(data.violations)
        setInvoices(data.invoices)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const unpaid = invoices.filter((i) => i.status === 'UNPAID' || i.status === 'OVERDUE')
  const unpaidIds = new Set(unpaid.map((i) => i.violationId))

  // ---- Logic tính "quá hạn" dựa trên ngày hiện tại ----
  // Một vi phạm được coi là quá hạn nếu:
  //  - có dueDate và dueDate đã qua so với thời điểm hiện tại (now)
  //  - vi phạm chưa bị từ chối (REJECTED)
  //  - vi phạm chưa được nộp phạt xong (nếu đã có hóa đơn, hóa đơn đó phải chưa PAID)
  const now = useMemo(() => new Date(), [violations, invoices])

  const isViolationOverdue = (v: Violation) => {
    if (!v.dueDate) return false
    if (v.status === 'REJECTED') return false
    // Nếu vi phạm đã lên hóa đơn, chỉ tính quá hạn khi hóa đơn đó vẫn chưa nộp
    if (v.status === 'INVOICED' && !unpaidIds.has(v.id)) return false
    return new Date(v.dueDate).getTime() < now.getTime()
  }

  const overdueViolations = violations.filter(isViolationOverdue)
  const overdueViolationIds = new Set(overdueViolations.map((v) => v.id))

  // Hóa đơn quá hạn: lấy theo trạng thái backend trả về, cộng thêm các hóa đơn
  // của những vi phạm vừa tính quá hạn theo ngày (phòng khi backend chưa kịp cập nhật status)
  const overdueInvoices = invoices.filter(
    (i) => i.status === 'OVERDUE' || (i.status === 'UNPAID' && overdueViolationIds.has(i.violationId)),
  )

  const totalOverdueCount = overdueInvoices.length
  const totalDue = unpaid.reduce((s, i) => s + i.amount, 0)

  const openViolations = violations.filter(
    (v) =>
      v.status !== 'REJECTED' &&
      (v.status !== 'INVOICED' || unpaidIds.has(v.id)),
  )

  if (loading) {
    return <p className="text-sm text-slate-500">Đang tải dữ liệu từ hệ thống...</p>
  }

  if (error) {
    return (
      <EmptyState
        title="Không tải được dữ liệu"
        description={error}
      />
    )
  }

  return (
    <>
      <PageHeader
        title={`Xin chào, ${user?.fullName}`}
        description="Tổng quan tình trạng phương tiện và vi phạm của bạn."
      />

      {totalOverdueCount > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="text-sm">
            <p className="font-semibold text-red-700">
              Bạn có {totalOverdueCount} hóa đơn đã quá hạn nộp phạt
            </p>
            <p className="text-slate-600">
              Vui lòng nộp phạt sớm để tránh bị áp dụng biện pháp cưỡng chế.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Phương tiện sở hữu"
          value={vehicles.length}
          icon={<Car className="h-5 w-5" />}
        />
        <StatCard
          label="Vi phạm chưa xử lý"
          value={openViolations.length}
          tone="pending"
          icon={<TriangleAlert className="h-5 w-5" />}
        />
        <StatCard
          label="Hóa đơn chưa nộp"
          value={unpaid.length}
          tone="danger"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          label="Tổng tiền cần nộp"
          value={formatCurrency(totalDue)}
          tone="danger"
          icon={<Wallet className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Vi phạm gần đây</h2>
          </div>
          {violations.length === 0 ? (
            <EmptyState
              title="Chưa ghi nhận vi phạm nào"
              description="Phương tiện của bạn chưa có vi phạm nào được hệ thống ghi nhận."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {violations.slice(0, 5).map((v) => {
                const veh = vehicles.find((x) => x.id === v.vehicleId)
                const overdue = overdueViolationIds.has(v.id)
                return (
                  <li key={v.id} className="flex gap-3 p-3">
                    <img
                      src={v.evidenceImageUrl}
                      alt={`Ảnh chứng cứ ${v.id}`}
                      className="h-16 w-16 shrink-0 rounded-lg bg-slate-100 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="plate">{veh?.licensePlate || v.licensePlate}</span>
                        <ViolationStatusBadge status={v.status} />
                        {overdue ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Quá hạn
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">
                        {VIOLATION_TYPE_LABEL[v.violationType] || v.violationType}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {formatDateTime(v.detectedAt)}
                        {v.cameraLocation ? ` · ${v.cameraLocation}` : ''}
                      </p>
                      {v.dueDate ? (
                        <p className={`text-xs ${overdue ? 'font-semibold text-red-700' : 'text-amber-700'}`}>
                          Hạn xử lý: {formatDate(v.dueDate)}
                          {overdue ? ' (đã quá hạn)' : ''}
                        </p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Phương tiện của bạn</h2>
          {vehicles.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Chưa có phương tiện nào được gắn với tài khoản.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {vehicles.map((v) => (
                <li key={v.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="plate">{v.licensePlate}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {v.brand} {v.model} · {v.color}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
            <p className="font-medium">Hồ sơ</p>
            <p className="mt-1">{user?.email}</p>
            <p>{user?.phone}</p>
          </div>
        </section>
      </div>
    </>
  )
}