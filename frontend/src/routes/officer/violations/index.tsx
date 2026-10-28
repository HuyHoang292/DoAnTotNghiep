import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  createOfficerViolationRequest,
  getAIQueue,
  getOfficerDashboard,
  getOfficerViolations,
  type ViolationDetail,
  type ViolationsQueryParams,
} from '@/lib/api'
import type { Camera } from '@/lib/types'
import { EmptyState, Modal, PageHeader, PlateTag, ViolationStatusBadge } from '@/components/ui'
import { formatDateTime, formatCurrency } from '@/lib/format'
import {
  VIOLATION_SOURCE_LABEL,
  VIOLATION_STATUS_LABEL,
  VIOLATION_TYPE_LABEL,
  type ViolationSource,
  type ViolationType,
} from '@/lib/types'
import { Loader2, Plus } from 'lucide-react'
import { PlateImageUpload } from '@/components/PlateImageUpload'

export const Route = createFileRoute('/officer/violations/')({
  component: OfficerViolations,
})

function toDatetimeLocalValue(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function OfficerViolations() {
  const [violations, setViolations] = useState<ViolationDetail[]>([])
  const [cameras, setCameras] = useState<Camera[]>([])
  const [queueTotal, setQueueTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [violationType, setViolationType] = useState('all')
  const [source, setSource] = useState('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 20 })

  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState({
    plate: '',
    violationType: 'RED_LIGHT' as ViolationType,
    cameraId: 'cam-officer-manual',
    detectedAt: toDatetimeLocalValue(),
    evidenceImageUrl: '',
  })

  const load = async (nextPage = page) => {
    setLoading(true)
    setError('')
    try {
      const params: ViolationsQueryParams = { page: nextPage, limit: 20 }
      if (status !== 'all') params.status = status
      if (violationType !== 'all') params.violationType = violationType
      if (source !== 'all') params.source = source
      if (q.trim()) params.plate = q.trim()

      const [data, queue, dash] = await Promise.all([
        getOfficerViolations(params),
        getAIQueue('time').catch(() => ({ violations: [], total: 0 })),
        getOfficerDashboard().catch(() => ({ cameras: [] as Camera[] })),
      ])

      setViolations(Array.isArray(data?.violations) ? data.violations : [])
      setPagination(
        data?.pagination ?? {
          page: nextPage,
          limit: 20,
          total: Array.isArray(data?.violations) ? data.violations.length : 0,
          totalPages: 1,
        },
      )
      setQueueTotal(queue.total ?? queue.violations?.length ?? 0)
      setCameras(dash.cameras ?? [])
    } catch (err) {
      setViolations([])
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, violationType, source])

  const handleSearch = () => {
    setPage(1)
    void load(1)
  }

  const handleCreate = async () => {
    if (!createForm.evidenceImageUrl) {
      alert('Vui lòng tải lên ảnh biển số làm bằng chứng')
      return
    }
    if (!createForm.plate.trim()) {
      alert('Vui lòng nhập biển số')
      return
    }
    setSubmitting(true)
    try {
      await createOfficerViolationRequest({
        plate: createForm.plate.trim(),
        violationType: createForm.violationType,
        cameraId: createForm.cameraId || 'cam-officer-manual',
        detectedAt: createForm.detectedAt ? new Date(createForm.detectedAt).toISOString() : undefined,
        evidenceImageUrl: createForm.evidenceImageUrl,
      })
      setCreating(false)
      setCreateForm({
        plate: '',
        violationType: 'RED_LIGHT',
        cameraId: 'cam-officer-manual',
        detectedAt: toDatetimeLocalValue(),
        evidenceImageUrl: '',
      })
      await load(1)
      setPage(1)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể thêm vi phạm')
    } finally {
      setSubmitting(false)
    }
  }

  const amountOf = (v: ViolationDetail) => v.defaultAmount ?? v.fineDefaultAmount

  return (
    <>
      <PageHeader
        title="Quản lý vi phạm"
        description={`${pagination.total} vi phạm trong hệ thống (AI phát hiện và cán bộ ghi nhận)`}
        actions={
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Thêm vi phạm
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex gap-2 sm:col-span-2">
              <input
                type="text"
                placeholder="Tìm theo biển số..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-xl bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Tìm
              </button>
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(VIOLATION_STATUS_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>

            <select
              value={violationType}
              onChange={(e) => {
                setViolationType(e.target.value)
                setPage(1)
              }}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả loại lỗi</option>
              {Object.entries(VIOLATION_TYPE_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>

            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value)
                setPage(1)
              }}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả nguồn</option>
              {Object.entries(VIOLATION_SOURCE_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
            <Link
              to="/officer/violation_queues"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-sm font-medium text-white shadow-sm transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow"
            >
              <span>Hàng đợi AI chờ duyệt</span>
              {queueTotal > 0 && (
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                  {queueTotal}
                </span>
              )}
            </Link>
            {(status !== 'all' || violationType !== 'all' || source !== 'all' || q.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setQ('')
                  setStatus('all')
                  setViolationType('all')
                  setSource('all')
                  setPage(1)
                }}
                className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">Đang tải...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-3 text-sm text-blue-600 hover:underline">
              Thử lại
            </button>
          </div>
        ) : violations.length === 0 ? (
          <EmptyState title="Không có vi phạm nào" description="Chưa có hồ sơ phù hợp với bộ lọc hiện tại." />
        ) : (
          <>
            {/* Desktop: Grid layout with cards */}
            <div className="hidden gap-3 p-4 sm:grid sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {violations.map((v) => {
                const plate = v.correctedPlateText || v.detectedPlateText || v.licensePlate || '—'
                const src = (v.source || 'AI') as ViolationSource
                return (
                  <Link
                    key={v.id}
                    to="/officer/violations/$id"
                    params={{ id: v.id }}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:shadow-md"
                  >
                    <div className="relative h-32 overflow-hidden bg-slate-100">
                      <img
                        src={v.evidenceImageUrl}
                        alt="Ảnh chứng cứ"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute right-2 top-2">
                        <ViolationStatusBadge status={v.status} />
                      </div>
                      {src === 'AI' && v.ocrConfidence != null && (
                        <div className="absolute left-2 top-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold text-white shadow-sm ${
                            v.ocrConfidence >= 0.9 ? 'bg-emerald-500' :
                            v.ocrConfidence >= 0.7 ? 'bg-amber-500' : 'bg-red-500'
                          }`}>
                            {Math.round(v.ocrConfidence * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <PlateTag value={plate} />
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            src === 'OFFICER' ? 'bg-slate-100 text-slate-800' : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {VIOLATION_SOURCE_LABEL[src]}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {VIOLATION_TYPE_LABEL[v.violationType] || v.violationType}
                      </p>
                      <div className="space-y-0.5 text-xs text-slate-600">
                        <p>{v.detectedAt ? formatDateTime(v.detectedAt) : '—'}</p>
                        <p className="line-clamp-1">{v.cameraLocation || '—'}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                        <span className="text-xs text-slate-500">Mức phạt</span>
                        <span className="font-bold text-emerald-700 text-sm">
                          {amountOf(v) ? formatCurrency(Number(amountOf(v))) : '—'}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Mobile: Compact list */}
            <ul className="divide-y divide-slate-100 sm:hidden">
              {violations.map((v) => {
                const plate = v.correctedPlateText || v.detectedPlateText || v.licensePlate || '—'
                const src = (v.source || 'AI') as ViolationSource
                return (
                  <li key={v.id}>
                    <Link
                      to="/officer/violations/$id"
                      params={{ id: v.id }}
                      className="flex gap-3 p-3 hover:bg-slate-50"
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        <img
                          src={v.evidenceImageUrl}
                          alt="Ảnh chứng cứ"
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <PlateTag value={plate} />
                          <ViolationStatusBadge status={v.status} />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {VIOLATION_TYPE_LABEL[v.violationType]}
                        </p>
                        <p className="text-xs text-slate-600">
                          {v.detectedAt ? formatDateTime(v.detectedAt) : '—'}
                        </p>
                        <p className="text-sm font-bold text-emerald-700">
                          {amountOf(v) ? formatCurrency(Number(amountOf(v))) : '—'}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm text-slate-600">
                  Hiển thị {Math.min((page - 1) * pagination.limit + 1, pagination.total)} - {Math.min(page * pagination.limit, pagination.total)} trong tổng số {pagination.total} vi phạm
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Trước
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum: number
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setPage(pageNum)}
                          className={`h-10 w-10 rounded-lg text-sm font-medium ${
                            page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-300 text-slate-700 hover:bg-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {creating && (
        <Modal
          title="Thêm vi phạm thủ công"
          description="Ghi nhận vi phạm do cán bộ phát hiện tại hiện trường. Hồ sơ này sẽ vào danh sách vi phạm, không vào hàng đợi AI."
          onClose={() => setCreating(false)}
        >
          <div className="space-y-3">
            <PlateImageUpload
              purpose="violations"
              label="Ảnh bằng chứng (bắt buộc)"
              imageUrl={createForm.evidenceImageUrl}
              onUploaded={(res) =>
                setCreateForm((f) => ({
                  ...f,
                  evidenceImageUrl: res.imageUrl,
                  plate: res.plateText || f.plate,
                }))
              }
            />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Biển số</span>
              <input
                value={createForm.plate}
                onChange={(e) => setCreateForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))}
                placeholder="30F-123.45"
                className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm uppercase outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Loại lỗi</span>
              <select
                value={createForm.violationType}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, violationType: e.target.value as ViolationType }))
                }
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              >
                {Object.entries(VIOLATION_TYPE_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Địa điểm / camera</span>
              <select
                value={createForm.cameraId}
                onChange={(e) => setCreateForm((f) => ({ ...f, cameraId: e.target.value }))}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="cam-officer-manual">Ghi nhận trực tiếp bởi cán bộ</option>
                {cameras
                  .filter((c) => c.id !== 'cam-officer-manual')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.locationName}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Thời điểm</span>
              <input
                type="datetime-local"
                value={createForm.detectedAt}
                onChange={(e) => setCreateForm((f) => ({ ...f, detectedAt: e.target.value }))}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={submitting}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Lưu vi phạm
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
