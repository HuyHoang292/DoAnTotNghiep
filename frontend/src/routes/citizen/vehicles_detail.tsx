import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { getCitizenDashboard } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/format'
import type { Vehicle, Violation } from '@/lib/types'
import { VIOLATION_TYPE_LABEL } from '@/lib/types'
import { EmptyState, PageHeader, PlateTag, ViolationStatusBadge } from '@/components/ui'

export const Route = createFileRoute('/citizen/vehicles_detail')({
  component: VehicleDetail,
})

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  CAR: 'Ô tô',
  MOTORBIKE: 'Xe máy',
  TRUCK: 'Xe tải',
  BUS: 'Xe khách',
  OTHER: 'Khác',
}

function VehicleDetail() {
  const { id } = Route.useParams()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
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
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

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

  const vioList = violations
    .filter((v) => v.vehicleId === vehicle.id)
    .sort((a, b) => +new Date(b.detectedAt) - +new Date(a.detectedAt))

  return (
    <>
      <PageHeader
        title={vehicle.licensePlate}
        description={`${vehicle.brand} ${vehicle.model}`}
        actions={
          <Link
            to="/citizen/vehicles"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Link>
        }
      />

      {/* Thông tin xe */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <PlateTag value={vehicle.licensePlate} />
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ['Loại phương tiện', VEHICLE_TYPE_LABEL[vehicle.vehicleType] ?? vehicle.vehicleType],
            ['Hãng / Model', `${vehicle.brand} ${vehicle.model}`],
            ['Màu sơn', vehicle.color],
            ['Số khung', vehicle.chassisNumber ?? '—'],
            ['Số máy', vehicle.engineNumber ?? '—'],
            ['Ngày đăng ký', vehicle.registeredAt ? formatDate(vehicle.registeredAt) : '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Lịch sử vi phạm */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-900">
          Lịch sử vi phạm ({vioList.length})
        </h2>
        {vioList.length === 0 ? (
          <EmptyState title="Xe chưa có vi phạm nào" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {vioList.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
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
    </>
  )
}
