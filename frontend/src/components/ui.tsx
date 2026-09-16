import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string
  value: string | number
  hint?: string
  icon: ReactNode
  tone?: 'default' | 'pending' | 'danger' | 'success' | 'info'
}) {
  const tones = {
    default: 'bg-white text-blue-700',
    pending: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    success: 'bg-emerald-50 text-emerald-700',
    info: 'bg-sky-50 text-sky-700',
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        <div className={cn('rounded-xl p-2.5', tones[tone])}>{icon}</div>
      </div>
    </div>
  )
}

export function Modal({
  title,
  description,
  onClose,
  children,
  wide,
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
    </div>
  )
}

export function PlateTag({ value }: { value: string }) {
  return <span className="plate">{value}</span>
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    UNPAID: 'bg-amber-100 text-amber-800',
    OVERDUE: 'bg-red-100 text-red-800',
    PAID: 'bg-emerald-100 text-emerald-800',
    CANCELLED: 'bg-slate-100 text-slate-600',
  }
  const label: Record<string, string> = {
    UNPAID: 'Chưa nộp',
    OVERDUE: 'Quá hạn',
    PAID: 'Đã nộp',
    CANCELLED: 'Đã hủy',
  }
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        map[status] || 'bg-slate-100 text-slate-700',
      )}
    >
      {label[status] || status}
    </span>
  )
}

export function ViolationStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    AI_PENDING: 'bg-amber-100 text-amber-800',
    OFFICER_VERIFIED: 'bg-blue-100 text-blue-800',
    REJECTED: 'bg-slate-100 text-slate-600',
    INVOICED: 'bg-emerald-100 text-emerald-800',
  }
  const label: Record<string, string> = {
    AI_PENDING: 'Chờ xác minh',
    OFFICER_VERIFIED: 'Đã xác nhận',
    REJECTED: 'Đã bác bỏ',
    INVOICED: 'Đã lập biên lai',
  }
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        map[status] || 'bg-slate-100 text-slate-700',
      )}
    >
      {label[status] || status}
    </span>
  )
}
