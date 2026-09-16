import { createFileRoute } from '@tanstack/react-router'
import { CircleDollarSign, ListChecks, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState, PageHeader, StatCard, ViolationStatusBadge } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { getOfficerDashboard } from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import {
  VIOLATION_TYPE_LABEL,
  type Camera,
  type Invoice,
  type Vehicle,
  type Violation,
  type ViolationType,
} from '@/lib/types'

export const Route = createFileRoute('/officer/dashboard')({
  component: OfficerDashboard,
})

function OfficerDashboard() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [cameras, setCameras] = useState<Camera[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getOfficerDashboard()
        if (cancelled) return
        setVehicles(data.vehicles)
        setCameras(data.cameras)
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

  const pending = violations.filter((v) => v.status === 'AI_PENDING')
  const paid = invoices.filter((i) => i.status === 'PAID')
  const revenue = paid.reduce((s, i) => s + i.amount, 0)

  const byType = useMemo(
    () =>
      (Object.keys(VIOLATION_TYPE_LABEL) as ViolationType[]).map((t) => ({
        name: VIOLATION_TYPE_LABEL[t],
        value: violations.filter((v) => v.violationType === t).length,
      })),
    [violations],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, number>()
    violations.forEach((v) => {
      const d = new Date(v.detectedAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      })
      map.set(d, (map.get(d) ?? 0) + 1)
    })
    return [...map.entries()].map(([name, value]) => ({ name, value }))
  }, [violations])

  const byCamera = useMemo(
    () =>
      cameras
        .map((c) => ({
          name: c.locationName,
          value: violations.filter((v) => v.cameraId === c.id).length,
        }))
        .sort((a, b) => b.value - a.value),
    [cameras, violations],
  )

  const recent = useMemo(
    () =>
      [...violations]
        .sort((a, b) => +new Date(b.detectedAt) - +new Date(a.detectedAt))
        .slice(0, 6),
    [violations],
  )

  const maxDay = Math.max(...byDay.map((d) => d.value), 1)
  const maxCam = Math.max(...byCamera.map((d) => d.value), 1)
  const maxType = Math.max(...byType.map((d) => d.value), 1)

  if (loading) {
    return <p className="text-sm text-slate-500">Đang tải dữ liệu từ hệ thống...</p>
  }

  if (error) {
    return <EmptyState title="Không tải được dữ liệu" description={error} />
  }

  return (
    <>
      <PageHeader
        title="Tổng quan hệ thống"
        description={`Cán bộ ${user?.fullName} · ${user?.unit || 'Phòng CSGT'} · giám sát phát hiện vi phạm bằng AI.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Vi phạm chờ duyệt"
          value={pending.length}
          hint="Cần cán bộ xác minh"
          icon={<ListChecks className="h-5 w-5" />}
          tone="pending"
        />
        <StatCard
          label="Tổng vi phạm"
          value={violations.length}
          icon={<TriangleAlert className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Camera hoạt động"
          value={`${cameras.filter((c) => c.status === 'ONLINE').length}/${cameras.length}`}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Đã thu phạt"
          value={formatCurrency(revenue)}
          hint={`${paid.length} biên lai · ${vehicles.length} phương tiện quản lý`}
          icon={<CircleDollarSign className="h-5 w-5" />}
          tone="success"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <h2 className="font-semibold text-slate-900">Vi phạm theo ngày</h2>
          {byDay.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu" description="Chưa ghi nhận vi phạm theo ngày." />
          ) : (
            <div className="mt-4 flex h-56 items-end gap-3">
              {byDay.map((d) => (
                <div key={d.name} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-xs font-semibold text-slate-600">{d.value}</span>
                  <div
                    className="w-full rounded-t-lg bg-blue-600"
                    style={{ height: `${Math.max((d.value / maxDay) * 100, 8)}%` }}
                  />
                  <span className="text-[10px] text-slate-500">{d.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Cơ cấu loại vi phạm</h2>
          <ul className="mt-4 space-y-3">
            {byType.map((item) => (
              <li key={item.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-600">{item.name}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{ width: `${(item.value / maxType) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Vi phạm theo điểm camera</h2>
          {byCamera.length === 0 ? (
            <EmptyState title="Chưa có camera" description="Chưa có điểm camera nào trong hệ thống." />
          ) : (
            <ul className="mt-4 space-y-4">
              {byCamera.map((item) => (
                <li key={item.name}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-600">{item.name}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(item.value / maxCam) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-4">
            <h2 className="font-semibold text-slate-900">Vi phạm mới nhất</h2>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu" description="Hệ thống chưa ghi nhận vi phạm." />
          ) : (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {recent.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="plate">{v.detectedPlateText}</p>
                    <p className="truncate text-xs text-slate-500">
                      {VIOLATION_TYPE_LABEL[v.violationType] || v.violationType} · {formatDateTime(v.detectedAt)}
                    </p>
                  </div>
                  <ViolationStatusBadge status={v.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
