import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, Car, Loader2, Pencil, Plus, Search, X } from 'lucide-react'
import {
  createVehicleRequest,
  getOfficerDashboard,
  listCitizensRequest,
  listVehiclesRequest,
  transferVehicleRequest,
  updateVehicleRequest,
} from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/format'
import type { Vehicle, VehicleOwner, Violation } from '@/lib/types'
import { EmptyState, Modal, PageHeader, PlateTag, StatCard } from '@/components/ui'

export const Route = createFileRoute('/officer/vehicles')({
  component: OfficerVehicles,
})

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  CAR: 'Ô tô',
  MOTORBIKE: 'Xe máy',
  TRUCK: 'Xe tải',
  BUS: 'Xe khách',
  OTHER: 'Khác',
}

const VEHICLE_TYPES = ['CAR', 'MOTORBIKE', 'TRUCK', 'BUS', 'OTHER'] as const

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function todayInput() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function OfficerVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [citizens, setCitizens] = useState<VehicleOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<Vehicle | null>(null)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [creating, setCreating] = useState(false)
  const [transferring, setTransferring] = useState<Vehicle | null>(null)
  const PAGE_SIZE = 10

  const load = async () => {
    const [dash, veh, cd] = await Promise.all([
      getOfficerDashboard(),
      listVehiclesRequest(),
      listCitizensRequest(),
    ])
    setVehicles(veh.vehicles ?? [])
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

  const filtered = useMemo(
    () =>
      vehicles
        .filter((v) => {
          const key = `${v.licensePlate} ${v.brand} ${v.model} ${v.color} ${v.ownerName ?? ''}`
          return key.toLowerCase().includes(q.trim().toLowerCase())
        })
        .filter((v) => typeFilter === 'all' || v.vehicleType === typeFilter),
    [vehicles, q, typeFilter],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const carCount = vehicles.filter((v) => v.vehicleType === 'CAR').length
  const bikeCount = vehicles.filter((v) => v.vehicleType === 'MOTORBIKE').length
  const withVio = new Set(violations.map((v) => v.vehicleId).filter(Boolean)).size

  const replaceVehicle = (next: Vehicle) => {
    setVehicles((prev) => prev.map((v) => (v.id === next.id ? next : v)))
    setViewing((cur) => (cur?.id === next.id ? next : cur))
  }

  if (loading) return <p className="text-sm text-slate-500">Đang tải danh sách phương tiện...</p>
  if (error) return <EmptyState title="Không tải được dữ liệu" description={error} />

  return (
    <>
      <PageHeader
        title="Quản lý phương tiện"
        description="Đăng ký xe, cập nhật thông tin và chuyển nhượng khi bán xe hoặc thừa kế — xem chi tiết ngay trên trang."
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
            Thêm phương tiện
          </button>
        }
      />

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Tổng phương tiện" value={vehicles.length} icon={<Car className="h-5 w-5" />} tone="info" />
        <StatCard
          label="Ô tô"
          value={carCount}
          icon={<Car className="h-5 w-5" />}
          tone="default"
          hint={`${bikeCount} xe máy`}
        />
        <StatCard label="Xe có vi phạm" value={withVio} icon={<Car className="h-5 w-5" />} tone="danger" />
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Tìm biển số, hãng xe, màu sơn, chủ xe..."
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
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPage(1)
          }}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
        >
          <option value="all">Tất cả loại xe</option>
          {VEHICLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {VEHICLE_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState title="Không tìm thấy phương tiện" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Biển số</th>
                    <th className="px-4 py-3 text-left">Loại xe</th>
                    <th className="px-4 py-3 text-left">Hãng / Mẫu</th>
                    <th className="px-4 py-3 text-left">Màu</th>
                    <th className="px-4 py-3 text-left">Chủ sở hữu</th>
                    <th className="px-4 py-3 text-left">Ngày ĐK</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((v) => (
                    <tr
                      key={v.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setViewing(v)}
                    >
                      <td className="px-4 py-3">
                        <PlateTag value={v.licensePlate} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {VEHICLE_TYPE_LABEL[v.vehicleType] ?? v.vehicleType}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {v.brand} {v.model}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.color}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {v.ownerName || '—'}
                        {v.ownerPhone && (
                          <span className="block text-xs text-slate-400">{v.ownerPhone}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {v.registeredAt ? formatDate(v.registeredAt) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewing(v)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium hover:border-blue-400 hover:text-blue-600"
                          >
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(v)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium hover:border-blue-400 hover:text-blue-600"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setTransferring(v)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:border-amber-400"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" /> Chuyển nhượng
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>{filtered.length} phương tiện</span>
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
        <VehicleDetailModal
          vehicle={viewing}
          violations={violations}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing)
            setViewing(null)
          }}
          onTransfer={() => {
            setTransferring(viewing)
            setViewing(null)
          }}
        />
      )}

      {creating && (
        <VehicleFormModal
          title="Thêm phương tiện"
          description="Đăng ký xe mới và gán chủ sở hữu là công dân trong hệ thống."
          citizens={citizens}
          onClose={() => setCreating(false)}
          onSubmit={async (payload) => {
            const res = await createVehicleRequest(payload)
            await load()
            setCreating(false)
            setNotice(`Đã thêm phương tiện ${res.vehicle.licensePlate}.`)
            setViewing(res.vehicle)
          }}
        />
      )}

      {editing && (
        <VehicleFormModal
          title="Cập nhật phương tiện"
          description="Chỉ cập nhật các ô có nội dung. Ô để trống sẽ giữ nguyên dữ liệu cũ."
          vehicle={editing}
          citizens={citizens}
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            const res = await updateVehicleRequest(editing.id, payload)
            replaceVehicle(res.vehicle)
            setEditing(null)
            setNotice('Đã cập nhật thông tin phương tiện.')
            setViewing(res.vehicle)
          }}
        />
      )}

      {transferring && (
        <TransferModal
          vehicle={transferring}
          citizens={citizens}
          onClose={() => setTransferring(null)}
          onSubmit={async (ownerId) => {
            const res = await transferVehicleRequest(transferring.id, ownerId)
            replaceVehicle(res.vehicle)
            setTransferring(null)
            setNotice(res.message || 'Đã chuyển quyền sở hữu.')
            setViewing(res.vehicle)
          }}
        />
      )}
    </>
  )
}

function VehicleDetailModal({
  vehicle,
  violations,
  onClose,
  onEdit,
  onTransfer,
}: {
  vehicle: Vehicle
  violations: Violation[]
  onClose: () => void
  onEdit: () => void
  onTransfer: () => void
}) {
  const vioCount = violations.filter((x) => x.vehicleId === vehicle.id).length

  return (
    <Modal title="Thông tin phương tiện" onClose={onClose} wide>
      <div className="mb-4">
        <PlateTag value={vehicle.licensePlate} />
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <InfoRow label="Loại xe" value={VEHICLE_TYPE_LABEL[vehicle.vehicleType] ?? vehicle.vehicleType} />
        <InfoRow label="Hãng / Mẫu" value={`${vehicle.brand || '—'} ${vehicle.model || ''}`.trim()} />
        <InfoRow label="Màu sơn" value={vehicle.color || '—'} />
        <InfoRow
          label="Ngày đăng ký"
          value={vehicle.registeredAt ? formatDate(vehicle.registeredAt) : '—'}
        />
        <InfoRow label="Chủ sở hữu" value={vehicle.ownerName || '—'} />
        <InfoRow label="CCCD chủ xe" value={vehicle.ownerNationalId || '—'} />
        <InfoRow label="SĐT chủ xe" value={vehicle.ownerPhone || '—'} />
        <InfoRow label="Email chủ xe" value={vehicle.ownerEmail || '—'} />
        <InfoRow label="Số khung" value={vehicle.chassisNumber || '—'} />
        <InfoRow label="Số máy" value={vehicle.engineNumber || '—'} />
        <InfoRow
          label="Ngày tạo"
          value={vehicle.createdAt ? formatDateTime(vehicle.createdAt) : '—'}
        />
        <InfoRow
          label="Cập nhật lúc"
          value={vehicle.updatedAt ? formatDateTime(vehicle.updatedAt) : '—'}
        />
        <InfoRow label="Số vi phạm" value={String(vioCount)} />
      </dl>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Đóng
        </button>
        <button
          type="button"
          onClick={onTransfer}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Chuyển nhượng
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

function VehicleFormModal({
  title,
  description,
  vehicle,
  citizens,
  onClose,
  onSubmit,
}: {
  title: string
  description: string
  vehicle?: Vehicle
  citizens: VehicleOwner[]
  onClose: () => void
  onSubmit: (payload: {
    licensePlate: string
    ownerId: string
    vehicleType: string
    brand?: string
    model?: string
    color?: string
    registeredAt: string
  }) => Promise<void>
}) {
  const isEdit = Boolean(vehicle)
  const [licensePlate, setLicensePlate] = useState(isEdit ? '' : '')
  const [vehicleType, setVehicleType] = useState(isEdit ? '' : 'CAR')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [registeredAt, setRegisteredAt] = useState(isEdit ? '' : todayInput())
  const [ownerId, setOwnerId] = useState(isEdit ? '' : citizens[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  return (
    <Modal title={title} description={description} onClose={onClose} wide>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault()
          setFormError('')
          if (!isEdit && (!licensePlate.trim() || !ownerId || !vehicleType || !registeredAt)) {
            setFormError('Vui lòng nhập biển số, loại xe, ngày đăng ký và chọn chủ sở hữu.')
            return
          }
          setSaving(true)
          try {
            await onSubmit({
              licensePlate: licensePlate.trim().toUpperCase(),
              ownerId,
              vehicleType,
              brand: brand.trim(),
              model: model.trim(),
              color: color.trim(),
              registeredAt,
            })
          } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không lưu được phương tiện.')
          } finally {
            setSaving(false)
          }
        }}
      >
        <Field label={isEdit ? 'Biển số (để trống nếu không đổi)' : 'Biển số'}>
          <input
            className={`${inputClass} font-mono uppercase`}
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
            placeholder={vehicle?.licensePlate || '30F-123.45'}
          />
        </Field>
        <Field label={isEdit ? 'Loại xe (để trống nếu không đổi)' : 'Loại xe'}>
          <select
            className={inputClass}
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
          >
            {isEdit && <option value="">— Không đổi —</option>}
            {VEHICLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {VEHICLE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hãng xe">
          <input
            className={inputClass}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder={vehicle?.brand || 'Toyota'}
          />
        </Field>
        <Field label="Mẫu xe">
          <input
            className={inputClass}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={vehicle?.model || 'Vios'}
          />
        </Field>
        <Field label="Màu sơn">
          <input
            className={inputClass}
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder={vehicle?.color || 'Trắng'}
          />
        </Field>
        <Field label={isEdit ? 'Ngày đăng ký (để trống nếu không đổi)' : 'Ngày đăng ký'}>
          <input
            type="date"
            className={inputClass}
            value={registeredAt}
            onChange={(e) => setRegisteredAt(e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={isEdit ? 'Chủ sở hữu (để trống nếu không đổi)' : 'Chủ sở hữu'}>
            <select className={inputClass} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              {isEdit && <option value="">— Không đổi —</option>}
              {citizens.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} · {c.nationalId} · {c.phone}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {formError && <p className="sm:col-span-2 text-sm text-red-600">{formError}</p>}

        <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
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
            {isEdit ? 'Lưu thay đổi' : 'Đăng ký xe'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function TransferModal({
  vehicle,
  citizens,
  onClose,
  onSubmit,
}: {
  vehicle: Vehicle
  citizens: VehicleOwner[]
  onClose: () => void
  onSubmit: (ownerId: string) => Promise<void>
}) {
  const candidates = citizens.filter((c) => c.id !== vehicle.ownerId)
  const [ownerId, setOwnerId] = useState(candidates[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  return (
    <Modal
      title="Chuyển nhượng phương tiện"
      description="Dùng khi công dân bán xe hoặc thừa kế. Quyền sở hữu sẽ chuyển cho công dân khác."
      onClose={onClose}
    >
      <div className="mb-4 rounded-xl bg-slate-50 px-3 py-2 text-sm">
        <p className="font-mono font-semibold text-slate-900">{vehicle.licensePlate}</p>
        <p className="text-slate-500">Chủ hiện tại: {vehicle.ownerName || '—'}</p>
      </div>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setFormError('')
          if (!ownerId) {
            setFormError('Vui lòng chọn công dân nhận xe.')
            return
          }
          setSaving(true)
          try {
            await onSubmit(ownerId)
          } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không chuyển nhượng được.')
          } finally {
            setSaving(false)
          }
        }}
      >
        <Field label="Công dân nhận quyền sở hữu">
          <select className={inputClass} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            {candidates.length === 0 && <option value="">Không còn công dân khác</option>}
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} · {c.nationalId} · {c.phone}
              </option>
            ))}
          </select>
        </Field>
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
            disabled={saving || !ownerId}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Xác nhận chuyển nhượng
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
