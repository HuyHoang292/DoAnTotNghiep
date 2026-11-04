import type { ReactNode } from 'react'
import { DRIVER_LICENSE_STATUS_LABEL, type DriverLicense, type DriverLicenseStatus } from '@/lib/types'

const STATUS_CLASS: Record<DriverLicenseStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  SUSPENDED: 'bg-amber-50 text-amber-700',
  REVOKED: 'bg-red-50 text-red-600',
  EXPIRED: 'bg-slate-100 text-slate-500',
}

export function DriverLicenseStatusBadge({ status }: { status: DriverLicenseStatus }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
      {DRIVER_LICENSE_STATUS_LABEL[status] ?? status}
    </span>
  )
}

// Ô hạng bằng nhỏ gọn (dùng trong bảng danh sách). Bằng không còn hiệu lực hiển thị gạch ngang
export function DriverLicenseClassChip({ licenseClass, status }: { licenseClass: string; status: DriverLicenseStatus }) {
  const active = status === 'ACTIVE'
  return (
    <span
      title={DRIVER_LICENSE_STATUS_LABEL[status]}
      className={`inline-flex rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold ${
        active ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400 line-through'
      }`}
    >
      {licenseClass}
    </span>
  )
}

function formatDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN') : null
}

export function DriverLicenseList({
  licenses,
  emptyText = 'Chưa có giấy phép lái xe.',
  renderActions,
}: {
  licenses: DriverLicense[]
  emptyText?: string
  renderActions?: (license: DriverLicense) => ReactNode
}) {
  if (licenses.length === 0) return <p className="text-sm text-slate-400">{emptyText}</p>

  return (
    <ul className="space-y-2">
      {licenses.map((l) => (
        <li key={l.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="rounded-lg bg-blue-600 px-2 py-0.5 font-mono text-sm font-bold text-white">
                {l.licenseClass}
              </span>
              <span className="truncate font-mono font-semibold text-slate-900">{l.licenseNumber}</span>
            </div>
            <DriverLicenseStatusBadge status={l.status} />
          </div>
          <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-slate-400">Ngày cấp</dt>
              <dd className="font-medium text-slate-700">{formatDate(l.issueDate) ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Có giá trị đến</dt>
              <dd className="font-medium text-slate-700">{formatDate(l.expiryDate) ?? 'Không thời hạn'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Nơi cấp</dt>
              <dd className="font-medium text-slate-700">{l.issuedBy || '—'}</dd>
            </div>
          </dl>
          {renderActions && <div className="mt-2 flex justify-end gap-1.5">{renderActions(l)}</div>}
        </li>
      ))}
    </ul>
  )
}
