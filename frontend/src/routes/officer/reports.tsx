import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CircleDollarSign, Download, ShieldCheck, TrendingUp, TriangleAlert } from 'lucide-react'
import { getOfficerDashboard } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { VIOLATION_TYPE_LABEL, type Camera, type Invoice, type Violation, type ViolationType } from '@/lib/types'
import { EmptyState, PageHeader, StatCard } from '@/components/ui'

export const Route = createFileRoute('/officer/reports')({
  component: OfficerReports,
})

const COLORS = ['#2563eb', '#f59e0b', '#dc2626', '#16a34a', '#7c3aed', '#0891b2']
const RANGES = [
  { key: '7', label: '7 ngày' },
  { key: '30', label: '30 ngày' },
  { key: '90', label: '90 ngày' },
  { key: 'all', label: 'Tất cả' },
] as const

const DAY = 86400000

function dayKey(value: string) {
  const d = new Date(value)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function shortLabel(text: string, max = 22) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function OfficerReports() {
  const [violations, setViolations] = useState<Violation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [cameras, setCameras] = useState<Camera[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState<string>('30')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const dash = await getOfficerDashboard()
        if (cancelled) return
        setViolations(dash.violations ?? [])
        setInvoices(dash.invoices ?? [])
        setCameras(dash.cameras ?? [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const from = useMemo(() => (range === 'all' ? 0 : Date.now() - Number(range) * DAY), [range])

  const vList = useMemo(() => violations.filter((v) => +new Date(v.detectedAt) >= from), [violations, from])
  const iList = useMemo(
    () => invoices.filter((i) => i.status !== 'CANCELLED' && +new Date(i.issueDate ?? 0) >= from),
    [invoices, from],
  )

  const paid = iList.filter((i) => i.status === 'PAID')
  const unpaid = iList.filter((i) => i.status === 'UNPAID' || i.status === 'OVERDUE')
  const revenue = paid.reduce((s, i) => s + i.amount, 0)
  const outstanding = unpaid.reduce((s, i) => s + i.amount, 0)
  const rejected = vList.filter((v) => v.status === 'REJECTED').length

  // Độ chính xác AI: trong các hồ sơ AI đã được cán bộ xem xét, bao nhiêu % được xác nhận
  const aiReviewed = vList.filter((v) => (v.source ?? 'AI') === 'AI' && v.status !== 'AI_PENDING')
  const aiConfirmed = aiReviewed.filter((v) => v.status !== 'REJECTED').length
  const accuracy = aiReviewed.length ? Math.round((aiConfirmed / aiReviewed.length) * 100) : 0
  const collectRate = iList.length ? Math.round((paid.length / iList.length) * 100) : 0

  const byDay = useMemo(() => {
    const map = new Map<number, { violations: number; paid: number }>()
    const bump = (key: number, field: 'violations' | 'paid') => {
      const cur = map.get(key) ?? { violations: 0, paid: 0 }
      cur[field] += 1
      map.set(key, cur)
    }
    vList.forEach((v) => bump(dayKey(v.detectedAt), 'violations'))
    paid.forEach((i) => i.paidAt && bump(dayKey(i.paidAt), 'paid'))
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .slice(-14)
      .map(([key, v]) => ({
        name: new Date(key).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        ...v,
      }))
  }, [vList, paid])

  const byType = useMemo(
    () =>
      (Object.keys(VIOLATION_TYPE_LABEL) as ViolationType[]).map((t) => {
        const list = vList.filter((v) => v.violationType === t)
        const amount = list.reduce((s, v) => {
          const inv = iList.find((i) => i.violationId === v.id)
          return s + (inv?.amount ?? 0)
        }, 0)
        return { type: t, name: VIOLATION_TYPE_LABEL[t], value: list.length, amount }
      }),
    [vList, iList],
  )

  const byLocation = useMemo(
    () =>
      cameras
        .map((c) => ({
          name: shortLabel(c.locationName),
          value: vList.filter((v) => v.cameraId === c.id).length,
        }))
        .filter((c) => c.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [cameras, vList],
  )

  const exportCsv = () => {
    const rows: string[][] = [
      ['Chỉ tiêu', 'Giá trị'],
      ['Kỳ báo cáo', RANGES.find((r) => r.key === range)?.label ?? ''],
      ['Tổng vi phạm', String(vList.length)],
      ['Bị từ chối', String(rejected)],
      ['Tỷ lệ AI chính xác (%)', String(accuracy)],
      ['Số biên lai', String(iList.length)],
      ['Đã thu (đ)', String(revenue)],
      ['Chưa thu (đ)', String(outstanding)],
      ['Tỷ lệ thu (%)', String(collectRate)],
      [],
      ['Loại vi phạm', 'Số vụ', 'Tiền phạt theo biên lai (đ)'],
      ...byType.map((t) => [t.name, String(t.value), String(t.amount)]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `bao-cao-vi-pham-${range}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p className="text-sm text-slate-500">Đang tải dữ liệu báo cáo...</p>
  if (error) return <EmptyState title="Không tải được dữ liệu" description={error} />

  const pieData = byType.filter((t) => t.value > 0)

  return (
    <>
      <PageHeader
        title="Báo cáo thống kê"
        description="Phân tích tình hình vi phạm giao thông và kết quả xử phạt."
        actions={
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600"
          >
            <Download className="h-4 w-4" /> Xuất CSV
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            className={`h-9 rounded-xl px-4 text-sm font-medium ${
              range === r.key
                ? 'bg-blue-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-400'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Vi phạm ghi nhận"
          value={vList.length}
          hint={`${rejected} bị từ chối`}
          icon={<TriangleAlert className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Tỷ lệ AI chính xác"
          value={`${accuracy}%`}
          hint={`${aiConfirmed}/${aiReviewed.length} hồ sơ AI được xác nhận`}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Đã thu phạt"
          value={formatCurrency(revenue)}
          hint={`${paid.length} biên lai đã nộp`}
          icon={<CircleDollarSign className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Tỷ lệ thu nộp"
          value={`${collectRate}%`}
          hint={`Còn ${formatCurrency(outstanding)} chưa thu`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="pending"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Diễn biến vi phạm và thu phạt</h2>
        {byDay.length === 0 ? (
          <EmptyState title="Không có dữ liệu trong kỳ này" />
        ) : (
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="violations" name="Vi phạm" stroke="#dc2626" strokeWidth={2} />
                <Line type="monotone" dataKey="paid" name="Biên lai đã nộp" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Cơ cấu loại vi phạm</h2>
          {pieData.length === 0 ? (
            <EmptyState title="Không có dữ liệu trong kỳ này" />
          ) : (
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                    {pieData.map((t) => (
                      <Cell key={t.type} fill={COLORS[byType.findIndex((x) => x.type === t.type) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Địa điểm nhiều vi phạm</h2>
          {byLocation.length === 0 ? (
            <EmptyState title="Không có dữ liệu trong kỳ này" />
          ) : (
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byLocation} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} fontSize={12} />
                  <YAxis type="category" dataKey="name" width={160} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" name="Vi phạm" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="p-4 font-semibold text-slate-900">Bảng tổng hợp theo loại vi phạm</h2>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Loại vi phạm</th>
                <th className="px-4 py-3">Số vụ</th>
                <th className="px-4 py-3">Tỷ trọng</th>
                <th className="px-4 py-3 text-right">Tiền phạt theo biên lai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byType.map((t) => (
                <tr key={t.type}>
                  <td className="px-4 py-3 text-slate-900">{t.name}</td>
                  <td className="px-4 py-3">{t.value}</td>
                  <td className="px-4 py-3">{vList.length ? Math.round((t.value / vList.length) * 100) : 0}%</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
