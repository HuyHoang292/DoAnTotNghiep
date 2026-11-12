import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { PlateBox } from '@/lib/types'

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

const UNREAD_PLATE_TEXT = 'CHUA-DOC-DUOC'

/** Ảnh cận biển số AI dùng để đọc ký tự, hiển thị riêng để người xem đối chiếu */
export function PlateCloseup({ src, className = '' }: { src?: string | null; className?: string }) {
  if (!src) return null
  return (
    <figure className={`overflow-hidden rounded-xl border border-slate-200 bg-slate-900 ${className}`}>
      <a href={src} target="_blank" rel="noreferrer" title="Mở ảnh gốc">
        <img src={src} alt="Ảnh cận biển số" className="mx-auto max-h-56 w-full object-contain" />
      </a>
      <figcaption className="bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
        Ảnh cận biển số (AI đọc ký tự từ ảnh này)
      </figcaption>
    </figure>
  )
}

/**
 * Ảnh chụp vi phạm có khung đỏ AI vẽ quanh xe. Chuỗi ký tự biển số (AI đọc từ ảnh cận biển số)
 * được gắn vào cạnh trên khung đỏ để người xem biết biển số kể cả khi ảnh chụp từ xa không rõ.
 * Ảnh giữ đúng tỉ lệ gốc để toạ độ khung (theo tỉ lệ 0..1) nằm đúng vị trí trên ảnh.
 */
export function EvidenceImage({
  src,
  plateBox,
  plateText,
  alt = 'Ảnh bằng chứng vi phạm',
  className = '',
  imgClassName = 'max-h-[500px]',
  compact = false,
}: {
  src?: string | null
  plateBox?: PlateBox | null
  plateText?: string | null
  alt?: string
  className?: string
  imgClassName?: string
  compact?: boolean
}) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className={cn('flex h-44 items-center justify-center bg-slate-100 text-sm text-slate-500', className)}>
        Không có ảnh
      </div>
    )
  }

  const raw = plateText?.trim()
  const text = raw && raw !== UNREAD_PLATE_TEXT ? raw : null
  let overlay: ReactNode = null
  if (plateBox && text) {
    // Nhãn dính vào cạnh trên khung đỏ; khung sát mép trên ảnh thì đặt nhãn vào trong khung,
    // khung lệch phải thì canh nhãn theo cạnh phải để không bị cắt
    const inside = plateBox.y1 < 0.06
    const alignRight = plateBox.x1 > 0.7
    overlay = (
      <span
        className={cn(
          'pointer-events-none absolute whitespace-nowrap bg-red-600 font-mono font-bold leading-tight tracking-wide text-white',
          compact ? 'px-1 py-px text-[10px]' : 'px-1.5 py-0.5 text-xs sm:text-sm',
        )}
        style={{
          ...(alignRight ? { right: `${(1 - plateBox.x2) * 100}%` } : { left: `${plateBox.x1 * 100}%` }),
          ...(inside ? { top: `${plateBox.y1 * 100}%` } : { bottom: `${(1 - plateBox.y1) * 100}%` }),
        }}
      >
        {text}
      </span>
    )
  }

  return (
    <div className={cn('flex justify-center bg-slate-900', className)}>
      <div className="relative inline-block max-w-full overflow-hidden">
        <a href={src} target="_blank" rel="noreferrer" title="Mở ảnh gốc">
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            className={cn('block h-auto w-auto max-w-full', imgClassName)}
          />
        </a>
        {overlay}
      </div>
    </div>
  )
}
