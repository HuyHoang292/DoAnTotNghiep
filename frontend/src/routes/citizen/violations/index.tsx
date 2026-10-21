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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
              <label className="mb-1 block text-xs font-medium text-slate-600">Từ ngày</label>
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1) }}
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Đến ngày</label>
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1) }}
                className={inputCls}
              />
            </div>
          </div>
          
          {(vehicleId !== 'all' || type !== 'all' || status !== 'all' || from || to) && (
            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setVehicleId('all')
                  setType('all')
                  setStatus('all')
                  setFrom('')
                  setTo('')
                  setPage(1)
                }}
                className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Danh sách vi phạm */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState
            title="Không có vi phạm phù hợp"
            description="Thử thay đổi bộ lọc tìm kiếm."
          />
        ) : (
          <>
            {/* Desktop: Grid layout with cards */}
            <div className="hidden gap-3 p-4 sm:grid sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {rows.map((v) => {
                const vehicle = vehicles.find((x) => x.id === v.vehicleId)
                const plate = vehicle?.licensePlate || v.detectedPlateText
                return (
                  <Link
                    key={v.id}
                    to="/citizen/violations/$id"
                    params={{ id: v.id }}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:shadow-md"
                  >
                    <div className="relative h-32 overflow-hidden bg-slate-100">
                      <img
                        src={v.evidenceImageUrl || `https://picsum.photos/seed/${v.id}/400/200`}
                        alt="Ảnh chứng cứ"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute right-2 top-2">
                        <ViolationStatusBadge status={v.status as ViolationStatus} />
                      </div>
                    </div>
                    <div className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="plate font-mono text-sm font-bold text-slate-900">
                          {plate}
                        </span>
                        {vehicle && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {vehicle.vehicleType}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {VIOLATION_TYPE_LABEL[v.violationType as ViolationType]}
                      </p>
                      <div className="space-y-0.5 text-xs text-slate-600">
                        <p>{formatDateTime(v.detectedAt)}</p>
                        <p className="line-clamp-1">{v.cameraLocation || '—'}</p>
                      </div>
                      {v.fineDefaultAmount && (
                        <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                          <span className="text-xs text-slate-500">Mức phạt</span>
                          <span className="font-bold text-red-700 text-sm">
                            {v.fineDefaultAmount.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Mobile: Compact list */}
            <ul className="divide-y divide-slate-100 sm:hidden">
              {rows.map((v) => {
                const vehicle = vehicles.find((x) => x.id === v.vehicleId)
                const plate = vehicle?.licensePlate || v.detectedPlateText
                return (
                  <li key={v.id}>
                    <Link
                      to="/citizen/violations/$id"
                      params={{ id: v.id }}
                      className="flex gap-3 p-3 hover:bg-slate-50"
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        <img
                          src={v.evidenceImageUrl || `https://picsum.photos/seed/${v.id}/400/200`}
                          alt="Ảnh chứng cứ"
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="plate font-mono text-sm font-bold">
                            {plate}
                          </span>
                          <ViolationStatusBadge status={v.status} />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {VIOLATION_TYPE_LABEL[v.violationType as ViolationType]}
                        </p>
                        <p className="text-xs text-slate-600">
                          {formatDateTime(v.detectedAt)}
                          {v.cameraLocation ? ` · ${v.cameraLocation}` : ''}
                        </p>
                        {v.fineDefaultAmount && (
                          <p className="text-sm font-bold text-red-700">
                            {v.fineDefaultAmount.toLocaleString('vi-VN')} đ
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
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
