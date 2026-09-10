import { createFileRoute } from '@tanstack/react-router'
import { Car, FileText, TriangleAlert, Wallet } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { demoCameras, demoInvoices, demoVehicles, demoViolations } from '@/lib/demo-data'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { VIOLATION_TYPE_LABEL } from '@/lib/types'
import { EmptyState, PageHeader, StatCard, ViolationStatusBadge } from '@/components/ui'

export const Route = createFileRoute('/citizen/dashboard')({
  component: CitizenDashboard,
})

function CitizenDashboard() {
  const { user } = useAuth()
  const myVehicles = demoVehicles.filter((v) => v.ownerId === user?.id)
  const ids = new Set(myVehicles.map((v) => v.id))
  const myViolations = demoViolations
    .filter((v) => v.vehicleId && ids.has(v.vehicleId))
    .sort((a, b) => +new Date(b.detectedAt) - +new Date(a.detectedAt))
  const myInvoices = demoInvoices.filter((i) =>
    myViolations.some((v) => v.id === i.violationId),
  )
  const unpaid = myInvoices.filter((i) => i.status === 'UNPAID' || i.status === 'OVERDUE')
  const overdue = myInvoices.filter((i) => i.status === 'OVERDUE')
  const totalDue = unpaid.reduce((s, i) => s + i.amount, 0)

  return (
    <>
      <PageHeader
        title={`Xin chào, ${user?.fullName}`}
        description="Tổng quan tình trạng phương tiện và vi phạm của bạn."
      />

      {overdue.length > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="text-sm">
            <p className="font-semibold text-red-700">
              Bạn có {overdue.length} hóa đơn đã quá hạn nộp phạt
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
          value={myVehicles.length}
          icon={<Car className="h-5 w-5" />}
        />
        <StatCard
          label="Vi phạm chưa xử lý"
          value={myViolations.filter((v) => v.status !== 'PAID' && v.status !== 'REJECTED').length}
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
          {myViolations.length === 0 ? (
            <EmptyState
              title="Chưa ghi nhận vi phạm nào"
              description="Phương tiện của bạn chưa có vi phạm nào được hệ thống ghi nhận."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {myViolations.slice(0, 5).map((v) => {
                const cam = demoCameras.find((c) => c.id === v.cameraId)
                const veh = myVehicles.find((x) => x.id === v.vehicleId)
                return (
                  <li key={v.id} className="flex gap-3 p-3">
                    <img
                      src={v.evidenceImageUrl}
                      alt={`Ảnh chứng cứ ${v.id}`}
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="plate">{veh?.licensePlate}</span>
                        <ViolationStatusBadge status={v.status} />
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">
                        {VIOLATION_TYPE_LABEL[v.violationType]}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {formatDateTime(v.detectedAt)} · {cam?.locationName}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Phương tiện của bạn</h2>
          <ul className="mt-3 space-y-3">
            {myVehicles.map((v) => (
              <li key={v.id} className="rounded-xl bg-slate-50 p-3">
                <p className="plate">{v.licensePlate}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {v.brand} {v.model} · {v.color}
                </p>
              </li>
            ))}
          </ul>
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
