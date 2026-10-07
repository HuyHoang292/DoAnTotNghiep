import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { getCitizenDashboard } from '@/lib/api'
import {
  EmptyState,
  PageHeader,
  ViolationStatusBadge,
} from '@/components/ui'
import { formatDateTime } from '@/lib/format'
import {
  VIOLATION_STATUS_LABEL,
  VIOLATION_TYPE_LABEL,
  type ViolationStatus,
  type ViolationType,
  type Vehicle,
  type Violation,
} from '@/lib/types'

export const Route = createFileRoute('/citizen/violations/')({
  component: CitizenViolations,
})

function CitizenViolations() {
  const [violations, setViolations] = useState<Violation[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [vehicleId, setVehicleId] = useState('all')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getCitizenDashboard()
        if (cancelled) return
        setViolations(data.violations ?? [])
        setVehicles(data.vehicles ?? [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(
    () =>
      violations
        .filter((v) => vehicleId === 'all' || v.vehicleId === vehicleId)
        .filter((v) => type === 'all' || v.violationType === type)
        .filter((v) => status === 'all' || v.status === status)
        .filter((v) => !from || new Date(v.detectedAt) >= new Date(from))
        .filter((v) => !to || new Date(v.detectedAt) <= new Date(`${to}T23:59:59`))
        .sort((a, b) => +new Date(b.detectedAt) - +new Date(a.detectedAt)),
    [violations, vehicleId, type, status, from, to],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const selectCls =
    'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500'
  const inputCls =
    'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500'

  if (loading) return <p className="text-sm text-slate-500">Đang tải danh sách vi phạm...</p>
  if (error) return <EmptyState title="Lỗi tải dữ liệu" description={error} />

  return (
    <>
      <PageHeader
        title="Lịch sử vi phạm"
        description="Toàn bộ vi phạm ghi nhận trên phương tiện của bạn."
      />

      {/* Bộ lọc */}
      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <select
          className={selectCls}
          value={vehicleId}
          onChange={(e) => { setVehicleId(e.target.value); setPage(1) }}
        >
          <option value="all">Tất cả phương tiện</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.licensePlate}</option>
          ))}
        </select>

        <select className={selectCls} value={type} onChange={(e) => { setType(e.target.value); setPage(1) }}>
          <option value="all">Tất cả loại lỗi</option>
          {Object.entries(VIOLATION_TYPE_LABEL).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>

        <select className={selectCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(VIOLATION_STATUS_LABEL).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>

        <div>
          <label className="mb-0.5 block text-xs text-slate-500">Từ ngày</label>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1) }}
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-0.5 block text-xs text-slate-500">Đến ngày</label>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1) }}
            className={inputCls}
          />
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState
            title="Không có vi phạm phù hợp"
            description="Thử thay đổi bộ lọc tìm kiếm."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Biển số</th>
                    <th className="px-4 py-3 text-left font-medium">Loại lỗi</th>
                    <th className="px-4 py-3 text-left font-medium">Thời gian</th>
                    <th className="px-4 py-3 text-left font-medium">Địa điểm</th>
                    <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          to="/citizen/violations/$id"
                          params={{ id: v.id }}
                          className="plate font-mono font-semibold text-blue-700 hover:underline"
                        >
                          {vehicles.find((x) => x.id === v.vehicleId)?.licensePlate || v.detectedPlateText}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {VIOLATION_TYPE_LABEL[v.violationType as ViolationType]}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(v.detectedAt)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {v.cameraLocation || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <ViolationStatusBadge status={v.status as ViolationStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((v) => (
                <li key={v.id}>
                  <Link
                    to="/citizen/violations/$id"
                    params={{ id: v.id }}
                    className="block space-y-1 p-4 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="plate font-mono text-sm font-semibold">
                        {vehicles.find((x) => x.id === v.vehicleId)?.licensePlate || v.detectedPlateText}
                      </span>
                      <ViolationStatusBadge status={v.status} />
                    </div>
                    <p className="text-sm font-medium text-slate-800">
                      {VIOLATION_TYPE_LABEL[v.violationType as ViolationType]}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(v.detectedAt)}
                      {v.cameraLocation ? ` · ${v.cameraLocation}` : ''}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>Tổng số: {filtered.length} vi phạm</span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={safePage === 1}
                    onClick={() => setPage(safePage - 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
                  >
                    ‹
                  </button>
                  <span className="px-3 py-1">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    disabled={safePage === totalPages}
                    onClick={() => setPage(safePage + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
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
