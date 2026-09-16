import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Car, ChevronRight } from 'lucide-react'
import { getCitizenDashboard } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { Vehicle, Violation } from '@/lib/types'
import { EmptyState, PageHeader, PlateTag } from '@/components/ui'

export const Route = createFileRoute('/citizen/vehicles')({
  component: CitizenVehicles,
})

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  CAR: 'Ô tô',
  MOTORBIKE: 'Xe máy',
  TRUCK: 'Xe tải',
  BUS: 'Xe khách',
  OTHER: 'Khác',
}

function CitizenVehicles() {
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

  if (loading) return <p className="text-sm text-slate-500">Đang tải danh sách phương tiện...</p>
  if (error) return <EmptyState title="Lỗi tải dữ liệu" description={error} />

  return (
    <>
      <PageHeader
        title="Phương tiện của tôi"
        description="Các phương tiện đã đăng ký đứng tên bạn."
      />

      {vehicles.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <EmptyState
            title="Chưa có phương tiện nào"
            description="Liên hệ cơ quan công an để đăng ký phương tiện."
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {vehicles.map((v) => {
            const vioCount = violations.filter((x) => x.vehicleId === v.id).length
            return (
              <Link
                key={v.id}
                to="/citizen/vehicles/$id"
                params={{ id: v.id }}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-400"
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <Car className="h-7 w-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <PlateTag value={v.licensePlate} />
                  <p className="mt-1.5 truncate text-sm font-semibold text-slate-900">
                    {v.brand} {v.model}
                  </p>
                  <p className="text-xs text-slate-500">
                    {VEHICLE_TYPE_LABEL[v.vehicleType] ?? v.vehicleType}
                    {v.color ? ` · Màu ${v.color}` : ''}
                    {v.registeredAt ? ` · ĐK ${formatDate(v.registeredAt)}` : ''}
                  </p>
                  {vioCount > 0 ? (
                    <p className="mt-1 text-xs font-semibold text-red-600">{vioCount} vi phạm ghi nhận</p>
                  ) : (
                    <p className="mt-1 text-xs text-emerald-600">Không có vi phạm</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 self-center text-slate-400" />
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
