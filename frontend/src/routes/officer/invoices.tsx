import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { CircleDollarSign, Clock, FileText, Loader2, Search, TriangleAlert, X } from 'lucide-react'
import { cancelInvoiceRequest, getOfficerDashboard } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { INVOICE_STATUS_LABEL, type Invoice, type Vehicle, type Violation } from '@/lib/types'
import { EmptyState, InvoiceStatusBadge, Modal, PageHeader, PlateTag, StatCard } from '@/components/ui'

export const Route = createFileRoute('/officer/invoices')({
  component: OfficerInvoices,
})

const PAGE_SIZE = 10

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  VNPAY: 'VNPay',
  MOMO: 'MoMo',
}

function OfficerInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [cancelling, setCancelling] = useState<Invoice | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const dash = await getOfficerDashboard()
        if (cancelled) return
        setInvoices(dash.invoices ?? [])
        setViolations(dash.violations ?? [])
        setVehicles(dash.vehicles ?? [])
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

  const enriched = useMemo(() => {
    const violationById = new Map(violations.map((v) => [v.id, v]))
    const vehicleById = new Map(vehicles.map((v) => [v.id, v]))
    return invoices.map((inv) => {
      const violation = violationById.get(inv.violationId)
      const vehicle = violation?.vehicleId ? vehicleById.get(violation.vehicleId) : undefined
      const plate = vehicle?.licensePlate || violation?.licensePlate || violation?.detectedPlateText || ''
      return { inv, violation, vehicle, plate }
    })
  }, [invoices, violations, vehicles])

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase()
    return enriched
      .filter((r) =>
        `${r.inv.invoiceCode ?? ''} ${r.plate} ${r.vehicle?.ownerName ?? ''}`.toLowerCase().includes(keyword),
      )
      .filter((r) => status === 'all' || r.inv.status === status)
      .sort((a, b) => +new Date(b.inv.issueDate ?? 0) - +new Date(a.inv.issueDate ?? 0))
  }, [enriched, q, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const paid = invoices.filter((i) => i.status === 'PAID')
  const collected = paid.reduce((s, i) => s + i.amount, 0)
  const outstanding = invoices
    .filter((i) => i.status === 'UNPAID' || i.status === 'OVERDUE')
    .reduce((s, i) => s + i.amount, 0)
  const overdue = invoices.filter((i) => i.status === 'OVERDUE').length

  if (loading) return <p className="text-sm text-slate-500">Đang tải danh sách hóa đơn...</p>
  if (error) return <EmptyState title="Không tải được dữ liệu" description={error} />

  return (
    <>
      <PageHeader title="Hóa đơn & Thanh toán" description="Biên lai xử phạt đã phát hành và tình trạng thu nộp." />

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng biên lai" value={invoices.length} icon={<FileText className="h-5 w-5" />} tone="info" />
        <StatCard
          label="Đã thu"
          value={formatCurrency(collected)}
          icon={<CircleDollarSign className="h-5 w-5" />}
          tone="success"
          hint={`${paid.length} biên lai`}
        />
        <StatCard label="Chưa thu" value={formatCurrency(outstanding)} icon={<Clock className="h-5 w-5" />} tone="pending" />
        <StatCard label="Quá hạn" value={overdue} icon={<TriangleAlert className="h-5 w-5" />} tone="danger" />
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
            placeholder="Tìm mã biên lai, biển số, chủ xe..."
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
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
        >
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(INVOICE_STATUS_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState title="Không có biên lai phù hợp" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Mã biên lai</th>
                    <th className="px-4 py-3 text-left">Biển số</th>
                    <th className="px-4 py-3 text-left">Chủ xe</th>
                    <th className="px-4 py-3 text-right">Số tiền</th>
                    <th className="px-4 py-3 text-left">Ngày lập</th>
                    <th className="px-4 py-3 text-left">Hạn nộp</th>
                    <th className="px-4 py-3 text-left">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(({ inv, violation, vehicle, plate }) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900">{inv.invoiceCode}</td>
                      <td className="px-4 py-3">{plate ? <PlateTag value={plate} /> : '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{vehicle?.ownerName || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(inv.amount)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {inv.issueDate ? formatDate(inv.issueDate) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceStatusBadge status={inv.status} />
                        {inv.status === 'PAID' && (inv.paymentMethod || inv.paidAt) && (
                          <span className="mt-1 block text-xs text-slate-500">
                            {inv.paymentMethod ? PAYMENT_METHOD_LABEL[inv.paymentMethod] ?? inv.paymentMethod : ''}
                            {inv.paymentMethod && inv.paidAt ? ' · ' : ''}
                            {inv.paidAt ? formatDateTime(inv.paidAt) : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {violation && (
                            <Link
                              to="/officer/violations/$id"
                              params={{ id: violation.id }}
                              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium hover:border-blue-400 hover:text-blue-600"
                            >
                              Vi phạm
                            </Link>
                          )}
                          {(inv.status === 'UNPAID' || inv.status === 'OVERDUE') && (
                            <button
                              type="button"
                              onClick={() => setCancelling(inv)}
                              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:border-red-400"
                            >
                              Huỷ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              <span>{filtered.length} biên lai</span>
              {totalPages > 1 && (
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
              )}
            </div>
          </>
        )}
      </div>

      {cancelling && (
        <CancelInvoiceModal
          invoice={cancelling}
          onClose={() => setCancelling(null)}
          onSubmit={async (reason) => {
            const res = await cancelInvoiceRequest(cancelling.id, reason)
            setInvoices((prev) => prev.map((i) => (i.id === res.invoice.id ? { ...i, ...res.invoice } : i)))
            setCancelling(null)
            setNotice(`Đã huỷ biên lai ${cancelling.invoiceCode}.`)
          }}
        />
      )}
    </>
  )
}

function CancelInvoiceModal({
  invoice,
  onClose,
  onSubmit,
}: {
  invoice: Invoice
  onClose: () => void
  onSubmit: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  return (
    <Modal title="Huỷ biên lai" description="Nhập lý do huỷ để lưu vào hồ sơ xử lý." onClose={onClose}>
      <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
        <p className="font-mono font-semibold text-slate-900">{invoice.invoiceCode}</p>
        <p className="text-slate-500">Số tiền: {formatCurrency(invoice.amount)}</p>
      </div>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setFormError('')
          if (reason.trim().length < 5) {
            setFormError('Lý do huỷ tối thiểu 5 ký tự.')
            return
          }
          setSaving(true)
          try {
            await onSubmit(reason.trim())
          } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không huỷ được biên lai.')
          } finally {
            setSaving(false)
          }
        }}
      >
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="Ví dụ: Phát hiện sai biển số sau khi phát hành."
        />
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Đóng
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Xác nhận huỷ
          </button>
        </div>
      </form>
    </Modal>
  )
}
