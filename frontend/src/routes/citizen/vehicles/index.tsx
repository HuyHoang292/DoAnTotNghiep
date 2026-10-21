import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Car, Search, X } from 'lucide-react'
import { getCitizenDashboard } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { Vehicle } from '@/lib/types'
import { VEHICLE_VERIFICATION_STATUS_LABEL } from '@/lib/types'
import { EmptyState, PageHeader, PlateTag, StatCard } from '@/components/ui'

export const Route = createFileRoute('/citizen/vehicles/')({
  component: CitizenVehicles,
})

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  CAR: 'Ô tô',
  MOTORBIKE: 'Xe máy',
  TRUCK: 'Xe tải',
  BUS: 'Xe khách',
  OTHER: 'Khác',
}

const VEHICLE_TYPES = ['CAR', 'MOTORBIKE', 'TRUCK', 'BUS', 'OTHER'] as const

function CitizenVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getCitizenDashboard()
        if (cancelled) return
        setVehicles(data.vehicles)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase()

    return vehicles
      .filter((v) => {
        if (!keyword) return true

        const licensePlate = (v.licensePlate ?? '').toLowerCase()
        const brandModelColor = `${v.brand ?? ''} ${v.model ?? ''} ${v.color ?? ''}`.toLowerCase()

        return licensePlate.includes(keyword) || brandModelColor.includes(keyword)
      })
      .filter((v) => typeFilter === 'all' || v.vehicleType === typeFilter)
  }, [vehicles, q, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const carCount = vehicles.filter((v) => v.vehicleType === 'CAR').length
  const bikeCount = vehicles.filter((v) => v.vehicleType === 'MOTORBIKE').length
  const pendingCount = vehicles.filter((v) => v.verificationStatus === 'PENDING' || v.verificationStatus === 'REVISION_REQUESTED').length

  if (loading) return <p className="text-sm text-slate-500">Đang tải danh sách phương tiện...</p>
  if (error) return <EmptyState title="Lỗi tải dữ liệu" description={error} />

  return (
    <>
      <PageHeader
        title="Phương tiện của tôi"
        description="Các phương tiện đã đăng ký đứng tên bạn."
      />

      {pendingCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Bạn có <strong>{pendingCount} phương tiện</strong> cần xác minh thông tin. Vui lòng kiểm tra và xác nhận.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Tổng phương tiện" value={vehicles.length} icon={<Car className="h-5 w-5" />} tone="info" />
        <StatCard
          label="Ô tô"
          value={carCount}
          icon={<Car className="h-5 w-5" />}
          tone="default"
          hint={`${bikeCount} xe máy`}
        />
        <StatCard label="Chờ xác minh" value={pendingCount} icon={<Car className="h-5 w-5" />} tone="pending" />
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Tìm theo biển số, hãng xe, mẫu xe, màu sắc..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ('')
                setPage(1)
              }}
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPage(1)
          }}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
        >
          <option value="all">Tất cả loại xe</option>
          {VEHICLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {VEHICLE_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState
            title={vehicles.length === 0 ? 'Chưa có phương tiện nào' : 'Không tìm thấy phương tiện'}
            description={vehicles.length === 0 ? 'Liên hệ cơ quan công an để đăng ký phương tiện.' : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Biển số</th>
                    <th className="px-4 py-3 text-left">Loại xe</th>
                    <th className="px-4 py-3 text-left">Hãng / Mẫu</th>
                    <th className="px-4 py-3 text-left">Màu</th>
                    <th className="px-4 py-3 text-left">Trạng thái</th>
                    <th className="px-4 py-3 text-left">Ngày ĐK</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((v) => {
                    const isPending = v.verificationStatus === 'PENDING' || v.verificationStatus === 'REVISION_REQUESTED'
                    return (
                      <tr
                        key={v.id}
                        className="cursor-pointer hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <PlateTag value={v.licensePlate} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {VEHICLE_TYPE_LABEL[v.vehicleType] ?? v.vehicleType}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {v.brand} {v.model}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{v.color}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              v.verificationStatus === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : v.verificationStatus === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : v.verificationStatus === 'REVISION_REQUESTED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {VEHICLE_VERIFICATION_STATUS_LABEL[v.verificationStatus || 'PENDING']}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {v.registeredAt ? formatDate(v.registeredAt) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to="/citizen/vehicles/$id"
                            params={{ id: v.id }}
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                              isPending
                                ? 'border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                : 'border-slate-200 hover:border-blue-400 hover:text-blue-600'
                            }`}
                          >
                            {isPending ? 'Xác minh ngay' : 'Chi tiết'}
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>{filtered.length} phương tiện</span>
                <div className="flex gap-1">
                  <button
                    disabled={safePage === 1}
                    onClick={() => setPage(safePage - 1)}
                    className="rounded-lg border px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
                  >
                    ‹
                  </button>
                  <span className="px-3 py-1">
                    {safePage}/{totalPages}
                  </span>
                  <button
                    disabled={safePage === totalPages}
                    onClick={() => setPage(safePage + 1)}
                    className="rounded-lg border px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
