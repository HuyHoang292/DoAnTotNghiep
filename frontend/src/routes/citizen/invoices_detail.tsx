import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { getCitizenDashboard } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import type { Invoice, Violation } from '@/lib/types'
import { VIOLATION_TYPE_LABEL } from '@/lib/types'
import { EmptyState, InvoiceStatusBadge, PageHeader, ViolationStatusBadge } from '@/components/ui'

export const Route = createFileRoute('/citizen/invoices_detail')({
  component: InvoiceDetail,
})

function isOverdue(dueDate?: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

function InvoiceDetail() {
  const { id } = Route.useParams()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  if (loading) return <p className="text-sm text-slate-500">Đang tải...</p>
  if (error) return <EmptyState title="Lỗi tải dữ liệu" description={error} />

  const invoice = invoices.find((i) => i.id === id)
  if (!invoice) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white">
        <EmptyState title="Không tìm thấy hóa đơn" />
      </div>
    )
  }

  const violation = violations.find((v) => v.id === invoice.violationId)
  const late = invoice.status === 'UNPAID' && isOverdue(invoice.dueDate)
  const effectiveStatus = late ? 'OVERDUE' : invoice.status

  return (
    <>
      <PageHeader
        title={`Biên lai ${invoice.invoiceCode || invoice.id}`}
        description="Chi tiết khoản phạt giao thông."
        actions={
          <Link
            to="/citizen/invoices"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Thông tin hóa đơn */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">Thông tin hóa đơn</h2>
              <InvoiceStatusBadge status={effectiveStatus} />
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Số tiền phạt">
                <span className="text-xl font-bold text-slate-900">{formatCurrency(invoice.amount)}</span>
              </Row>
              <Row label="Mã biên lai">
                <span className="font-mono">{invoice.invoiceCode || invoice.id}</span>
              </Row>
              {invoice.issueDate && (
                <Row label="Ngày phát hành">{formatDate(invoice.issueDate)}</Row>
              )}
              {invoice.dueDate && (
                <Row label="Hạn nộp phạt">
                  <span className={late ? 'font-semibold text-red-600' : ''}>
                    {formatDate(invoice.dueDate)}
                    {late && ' (Quá hạn)'}
                  </span>
                </Row>
              )}
            </dl>
          </section>

          {/* Vi phạm liên quan */}
          {violation && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-slate-900">Vi phạm liên quan</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Row label="Loại vi phạm">
                  <span className="font-semibold">{VIOLATION_TYPE_LABEL[violation.violationType]}</span>
                </Row>
                <Row label="Thời điểm phát hiện">
                  {formatDateTime(violation.detectedAt)}
                </Row>
                <Row label="Biển số xe">
                  <span className="font-mono font-semibold">{violation.detectedPlateText}</span>
                </Row>
                {violation.cameraLocation && (
                  <Row label="Địa điểm">{violation.cameraLocation}</Row>
                )}
                {violation.dueDate && (
                  <Row label="Hạn xử lý vi phạm">{formatDate(violation.dueDate)}</Row>
                )}
              </dl>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-slate-500">Trạng thái:</span>
                <ViolationStatusBadge status={violation.status} />
              </div>
            </section>
          )}
        </div>

        {/* Hướng dẫn */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Hướng dẫn nộp phạt</h2>
          <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-500">
            <li>Kiểm tra kỹ thông tin biên lai và biển số phương tiện.</li>
            <li>Đến trực tiếp cơ quan CSGT hoặc sử dụng dịch vụ nộp phạt trực tuyến.</li>
            <li>Giữ lại biên lai sau khi thanh toán thành công.</li>
          </ol>
          {late && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              Hóa đơn đã quá hạn nộp. Liên hệ cơ quan chức năng để được hỗ trợ.
            </div>
          )}
          {invoice.status === 'PAID' && (
            <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
              Hóa đơn đã được thanh toán. Cảm ơn bạn đã chấp hành.
            </div>
          )}
        </aside>
      </div>
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  )
}
