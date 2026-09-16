import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { CircleDollarSign, FileText, TriangleAlert } from 'lucide-react'
import { getCitizenDashboard } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Invoice, Violation } from '@/lib/types'
import { VIOLATION_TYPE_LABEL } from '@/lib/types'
import { EmptyState, InvoiceStatusBadge, PageHeader, StatCard } from '@/components/ui'

export const Route = createFileRoute('/citizen/invoices')({
  component: CitizenInvoices,
})

const STATUS_LABELS: Record<string, string> = {
  all: 'Tất cả',
  UNPAID: 'Chưa nộp',
  OVERDUE: 'Quá hạn',
  PAID: 'Đã nộp',
  CANCELLED: 'Đã hủy',
}

function isOverdue(dueDate?: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

function CitizenInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getCitizenDashboard()
        if (cancelled) return
        setInvoices(data.invoices)
        setViolations(data.violations)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const enriched = useMemo(
    () =>
      invoices.map((i) => ({
        ...i,
        effectiveStatus:
          i.status === 'UNPAID' && isOverdue(i.dueDate) ? 'OVERDUE' : i.status,
      })),
    [invoices],
  )

  const unpaid = enriched.filter((i) => i.status === 'UNPAID')
  const overdue = enriched.filter((i) => i.effectiveStatus === 'OVERDUE')
  const totalDue = unpaid.reduce((s, i) => s + i.amount, 0)

  const filtered = useMemo(
    () =>
      statusFilter === 'all'
        ? enriched
        : enriched.filter((i) => i.effectiveStatus === statusFilter),
    [enriched, statusFilter],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  if (loading) return <p className="text-sm text-slate-500">Đang tải hóa đơn...</p>
  if (error) return <EmptyState title="Lỗi tải dữ liệu" description={error} />

  return (
    <>
      <PageHeader
        title="Hóa đơn xử phạt"
        description="Theo dõi và kiểm tra các khoản phạt giao thông."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Chưa thanh toán"
          value={unpaid.length}
          icon={<FileText className="h-5 w-5" />}
          tone="pending"
        />
        <StatCard
          label="Quá hạn nộp"
          value={overdue.length}
          icon={<TriangleAlert className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          label="Tổng tiền cần nộp"
          value={formatCurrency(totalDue)}
          icon={<CircleDollarSign className="h-5 w-5" />}
          tone="info"
        />
      </div>

      {/* Bộ lọc trạng thái */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_LABELS).map(([k, label]) => (
          <button
            key={k}
            onClick={() => { setStatusFilter(k); setPage(1) }}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === k
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bảng / danh sách */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState title="Không có hóa đơn" description="Bạn chưa có hóa đơn ở trạng thái này." />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Mã biên lai</th>
                    <th className="px-4 py-3 text-left">Lỗi vi phạm</th>
                    <th className="px-4 py-3 text-right">Số tiền</th>
                    <th className="px-4 py-3 text-left">Hạn nộp</th>
                    <th className="px-4 py-3 text-left">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((i) => {
                    const vi = violations.find((v) => v.id === i.violationId)
                    return (
                      <tr key={i.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                          {i.invoiceCode || i.id}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {vi ? VIOLATION_TYPE_LABEL[vi.violationType] : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency(i.amount)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {i.dueDate ? formatDate(i.dueDate) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <InvoiceStatusBadge status={i.effectiveStatus} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((i) => (
                <li key={i.id} className="space-y-1 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-slate-900">
                      {i.invoiceCode || i.id}
                    </span>
                    <InvoiceStatusBadge status={i.effectiveStatus} />
                  </div>
                  <p className="text-base font-bold text-slate-900">{formatCurrency(i.amount)}</p>
                  {i.dueDate && (
                    <p className="text-xs text-slate-500">Hạn nộp: {formatDate(i.dueDate)}</p>
                  )}
                </li>
              ))}
            </ul>

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>{filtered.length} hóa đơn</span>
                <div className="flex gap-1">
                  <button
                    disabled={safePage === 1}
                    onClick={() => setPage(safePage - 1)}
                    className="rounded-lg border px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
                  >
                    ‹
                  </button>
                  <span className="px-3 py-1">{safePage}/{totalPages}</span>
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
