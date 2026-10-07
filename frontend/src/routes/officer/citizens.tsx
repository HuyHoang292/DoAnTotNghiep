import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, Search, Users, X } from 'lucide-react'
import {
  createCitizenRequest,
  getOfficerDashboard,
  listCitizensRequest,
  updateCitizenRequest,
} from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { Vehicle, VehicleOwner, Violation } from '@/lib/types'
import { EmptyState, Modal, PageHeader, StatCard, ViolationStatusBadge } from '@/components/ui'

export const Route = createFileRoute('/officer/citizens')({
  component: OfficerCitizens,
})

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function OfficerCitizens() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [citizens, setCitizens] = useState<VehicleOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [q, setQ] = useState('')
  const [searchField, setSearchField] = useState<'all' | 'fullName' | 'nationalId' | 'phone' | 'email'>('all')
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<VehicleOwner | null>(null)
  const [editing, setEditing] = useState<VehicleOwner | null>(null)
  const [creating, setCreating] = useState(false)
  const PAGE_SIZE = 10

  const load = async () => {
    const [dash, cd] = await Promise.all([getOfficerDashboard(), listCitizensRequest()])
    setVehicles(dash.vehicles ?? [])
    setViolations(dash.violations ?? [])
    setCitizens(cd.users ?? [])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await load()
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

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase()
    if (!keyword) return citizens

    return citizens.filter((c) => {
      const fullName = (c.fullName || '').toLowerCase()
      const nationalId = (c.nationalId || '').toLowerCase()
      const phone = (c.phone || '').toLowerCase()
      const email = (c.email || '').toLowerCase()

      switch (searchField) {
        case 'fullName':
          return fullName.includes(keyword)
        case 'nationalId':
          return nationalId.includes(keyword)
        case 'phone':
          return phone.includes(keyword)
        case 'email':
          return email.includes(keyword)
        default:
          return (
            fullName.includes(keyword) ||
            nationalId.includes(keyword) ||
            phone.includes(keyword) ||
            email.includes(keyword)
          )
      }
    })
  }, [citizens, q, searchField])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  if (loading) return <p className="text-sm text-slate-500">Đang tải danh sách công dân...</p>
  if (error) return <EmptyState title="Không tải được dữ liệu" description={error} />

  return (
    <>
      <PageHeader
        title="Quản lý công dân"
        description="Đăng ký tài khoản công dân, cập nhật liên hệ, địa chỉ và xem chi tiết ngay trên trang này."
        actions={
          <button
            type="button"
            onClick={() => {
              setCreating(true)
              setNotice('')
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Thêm công dân
          </button>
        }
      />

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Tổng công dân"
          value={citizens.length}
          icon={<Users className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Có phương tiện"
          value={new Set(vehicles.map((v) => v.ownerId)).size}
          icon={<Users className="h-5 w-5" />}
          tone="default"
        />
        <StatCard
          label="Có vi phạm"
          value={
            new Set(
              violations
                .map((v) => vehicles.find((x) => x.id === v.vehicleId)?.ownerId)
                .filter(Boolean),
            ).size
          }
          icon={<Users className="h-5 w-5" />}
          tone="danger"
        />
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 px-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder={
              searchField === 'fullName'
                ? 'Nhập họ tên cần tìm...'
                : searchField === 'nationalId'
                ? 'Nhập số CCCD cần tìm...'
                : searchField === 'phone'
                ? 'Nhập số điện thoại cần tìm...'
                : searchField === 'email'
                ? 'Nhập gmail (xxx@gmail.com)...'
                : 'Tìm theo họ tên, CCCD, số điện thoại, email...'
            }
            className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ('')
                setPage(1)
              }}
            >
              <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 pt-2 sm:border-t-0 sm:border-l sm:pl-3 sm:pt-0">
          <select
            value={searchField}
            onChange={(e) => {
              setSearchField(e.target.value as any)
              setPage(1)
            }}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-600 outline-none focus:border-blue-500"
          >
            <option value="all">Tất cả trường</option>
            <option value="fullName">Họ tên</option>
            <option value="nationalId">CCCD</option>
            <option value="phone">Số điện thoại</option>
            <option value="email">Gmail</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState title="Không tìm thấy công dân" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Họ tên</th>
                    <th className="px-4 py-3 text-left">CCCD</th>
                    <th className="px-4 py-3 text-left">Liên hệ</th>
                    <th className="px-4 py-3 text-left">Địa chỉ</th>
                    <th className="px-4 py-3 text-right">Xe</th>
                    <th className="px-4 py-3 text-right">Vi phạm</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((c: any) => {
                    const owned = vehicles.filter((v) => v.ownerId === c.id)
                    const vioCount = violations.filter((v) =>
                      owned.some((o) => o.id === v.vehicleId),
                    ).length
                    const shortAddress = [c.ward, c.city].filter(Boolean).join(', ')
                    return (
                      <tr
                        key={c.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => setViewing(c)}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{c.fullName}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{c.nationalId}</td>
                        <td className="px-4 py-3">
                          {c.phone}
                          {c.email && (
                            <span className="block text-xs text-slate-400">{c.email}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {shortAddress || c.address || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">{owned.length}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {vioCount > 0 ? (
                            <span className="text-red-600">{vioCount}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewing(c)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium hover:border-blue-400 hover:text-blue-600"
                            >
                              Chi tiết
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(c)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium hover:border-blue-400 hover:text-blue-600"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Sửa
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>{filtered.length} công dân</span>
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
              </div>
            )}
          </>
        )}
      </div>

      {viewing && (
        <CitizenDetailModal
          citizen={viewing}
          vehicles={vehicles}
          violations={violations}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing)
            setViewing(null)
          }}
        />
      )}

      {creating && (
        <CitizenFormModal
          title="Thêm công dân"
          description="Tài khoản được tạo với vai trò CITIZEN. Mật khẩu tạm thời: 123456."
          onClose={() => setCreating(false)}
          onSubmit={async (payload) => {
            const res = await createCitizenRequest(payload)
            await load()
            setCreating(false)
            setNotice(res.message || 'Đã thêm công dân.')
            if (res.user) setViewing(res.user)
          }}
        />
      )}

      {editing && (
        <CitizenFormModal
          title="Chỉnh sửa công dân"
          description="Cập nhật thông tin chi tiết và địa chỉ của công dân."
          citizen={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            const res = await updateCitizenRequest(editing.id, payload)
            await load()
            setEditing(null)
            setNotice('Đã cập nhật thông tin công dân.')
            if (res.user) setViewing(res.user)
          }}
        />
      )}
    </>
  )
}

function CitizenDetailModal({
  citizen,
  vehicles,
  violations,
  onClose,
  onEdit,
}: {
  citizen: VehicleOwner & {
    gender?: string
    address?: string
    ward?: string
    city?: string
    province?: string
  }
  vehicles: Vehicle[]
  violations: Violation[]
  onClose: () => void
  onEdit: () => void
}) {
  const owned = vehicles.filter((v) => v.ownerId === citizen.id)
  const ownedVios = violations.filter((v) => owned.some((o) => o.id === v.vehicleId))

  const formatGender = (g?: string) => {
    if (g === 'MALE') return 'Nam'
    if (g === 'FEMALE') return 'Nữ'
    return 'Khác'
  }

  const fullAddress = [citizen.address, citizen.ward, citizen.city, citizen.province]
    .filter(Boolean)
    .join(', ')

  return (
    <Modal title="Thông tin công dân" onClose={onClose}>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <InfoRow label="Họ và tên" value={citizen.fullName} />
        <InfoRow label="Số CCCD" value={citizen.nationalId} />
        <InfoRow label="Điện thoại" value={citizen.phone} />
        <InfoRow label="Giới tính" value={formatGender(citizen.gender)} />
        <InfoRow label="Email" value={citizen.email ?? '—'} />
        <InfoRow label="Địa chỉ đầy đủ" value={fullAddress || '—'} />
        <InfoRow label="Vai trò" value={citizen.role || 'CITIZEN'} />
        <InfoRow label="Trạng thái" value={citizen.status || 'ACTIVE'} />
        <InfoRow
          label="Ngày tạo"
          value={citizen.createdAt ? formatDateTime(citizen.createdAt) : '—'}
        />
        <InfoRow
          label="Cập nhật lúc"
          value={citizen.updatedAt ? formatDateTime(citizen.updatedAt) : '—'}
        />
      </dl>

      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-slate-700">Phương tiện</p>
        {owned.length === 0 ? (
          <p className="text-sm text-slate-400">Không có phương tiện</p>
        ) : (
          <ul className="space-y-1">
            {owned.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="font-mono font-semibold">{v.licensePlate}</span>
                <span className="text-slate-500">
                  {v.brand} {v.model}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-slate-700">Vi phạm gần đây</p>
        {ownedVios.length === 0 ? (
          <p className="text-sm text-slate-400">Không có vi phạm</p>
        ) : (
          ownedVios.slice(0, 5).map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm last:border-0"
            >
              <span className="text-slate-600">{v.detectedPlateText}</span>
              <ViolationStatusBadge status={v.status} />
            </div>
          ))
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Đóng
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Pencil className="h-3.5 w-3.5" />
          Chỉnh sửa
        </button>
      </div>
    </Modal>
  )
}

function CitizenFormModal({
  title,
  description,
  citizen,
  onClose,
  onSubmit,
}: {
  title: string
  description: string
  citizen?: VehicleOwner & {
    gender?: string
    address?: string
    ward?: string
    city?: string
    province?: string
  }
  onClose: () => void
  onSubmit: (payload: {
    fullName: string
    nationalId: string
    email: string
    phone: string
    gender: string
    address: string
    ward: string
    city: string
    province: string
  }) => Promise<void>
}) {
  const isEdit = Boolean(citizen)
  const [fullName, setFullName] = useState(citizen?.fullName ?? '')
  const [nationalId, setNationalId] = useState(citizen?.nationalId ?? '')
  const [email, setEmail] = useState(citizen?.email ?? '')
  const [phone, setPhone] = useState(citizen?.phone ?? '')
  const [gender, setGender] = useState(citizen?.gender ?? 'MALE')
  const [address, setAddress] = useState(citizen?.address ?? '')
  const [ward, setWard] = useState(citizen?.ward ?? '')
  const [city, setCity] = useState(citizen?.city ?? '')
  const [province, setProvince] = useState(citizen?.province ?? '')

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  return (
    <Modal title={title} description={description} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setFormError('')

          // Kiểm tra các trường bắt buộc
          if (
            !fullName.trim() ||
            !nationalId.trim() ||
            !phone.trim() ||
            !address.trim() ||
            !ward.trim() ||
            !city.trim() ||
            !province.trim()
          ) {
            setFormError('Vui lòng điền đầy đủ các trường bắt buộc (*).')
            return
          }

          // Ràng buộc CCCD đủ ký tự (chuẩn 12 chữ số)
          const cleanNationalId = nationalId.trim()
          if (!/^\d{12}$/.test(cleanNationalId)) {
            setFormError('Số CCCD phải bao gồm đúng 12 chữ số.')
            return
          }

          // Ràng buộc định dạng Gmail nếu có nhập
          const cleanEmail = email.trim()
          if (cleanEmail && !/^[\w.-]+@gmail\.com$/i.test(cleanEmail)) {
            setFormError('Email phải có định dạng chuẩn xxx@gmail.com')
            return
          }

          setSaving(true)
          try {
            await onSubmit({
              fullName: fullName.trim(),
              nationalId: cleanNationalId,
              email: cleanEmail,
              phone: phone.trim(),
              gender,
              address: address.trim(),
              ward: ward.trim(),
              city: city.trim(),
              province: province.trim(),
            })
          } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không lưu được thông tin.')
          } finally {
            setSaving(false)
          }
        }}
      >
        <Field label="Họ và tên *">
          <input
            className={inputClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nguyễn Văn A"
          />
        </Field>
        <Field label="Số CCCD * (Đủ 12 chữ số)">
          <input
            className={inputClass}
            maxLength={12}
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
            placeholder="0010xxxxxxxx"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Số điện thoại *">
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xxxxxxxx"
            />
          </Field>
          <Field label="Giới tính *">
            <select
              className={inputClass}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
            </select>
          </Field>
        </div>
        <Field label="Email / Gmail (xxx@gmail.com)">
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
          />
        </Field>
        <Field label="Địa chỉ (Số nhà, tên đường) *">
          <input
            className={inputClass}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Số 123, Đường ABC"
          />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Phường / Xã *">
            <input
              className={inputClass}
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              placeholder="Phường X"
            />
          </Field>
          <Field label="Thành phố / Huyện *">
            <input
              className={inputClass}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Quận Y"
            />
          </Field>
          <Field label="Tỉnh / Thành phố *">
            <input
              className={inputClass}
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="Hà Nội"
            />
          </Field>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo công dân'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}