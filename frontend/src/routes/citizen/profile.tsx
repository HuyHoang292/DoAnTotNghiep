import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { KeyRound, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { changePasswordRequest } from '@/lib/api'
import { PageHeader } from '@/components/ui'

export const Route = createFileRoute('/citizen/profile')({
  component: CitizenProfile,
})

const GENDER_LABEL: Record<string, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
}

function CitizenProfile() {
  const { user } = useAuth()
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  if (!user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    if (newPass.length < 6) {
      setMsg({ type: 'err', text: 'Mật khẩu mới tối thiểu 6 ký tự.' })
      return
    }
    if (newPass !== confirmPass) {
      setMsg({ type: 'err', text: 'Xác nhận mật khẩu không khớp.' })
      return
    }

    setSubmitting(true)
    try {
      // Mật khẩu được hash bcrypt (salt rounds=12) ở phía backend trước khi lưu DB
      const res = await changePasswordRequest(oldPass, newPass)
      setMsg({ type: 'ok', text: res.message || 'Đổi mật khẩu thành công.' })
      setOldPass('')
      setNewPass('')
      setConfirmPass('')
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Đổi mật khẩu thất bại.' })
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

  const infoRows: [string, string][] = [
    ['Họ và tên', user.fullName],
    ['Số CCCD / CMND', user.nationalId],
    ['Số điện thoại', user.phone],
    ['Email', user.email || '—'],
    ['Giới tính', user.gender ? (GENDER_LABEL[user.gender] ?? user.gender) : '—'],
    ['Địa chỉ', user.address || '—'],
    ['Phường / Xã', user.ward || '—'],
    ['Thành phố', user.city || '—'],
    ['Tỉnh', user.province || '—'],
  ]

  return (
    <>
      <PageHeader
        title="Hồ sơ cá nhân"
        description="Thông tin định danh và bảo mật tài khoản."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Thông tin cá nhân */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <User className="h-4 w-4 text-blue-600" />
            Thông tin công dân
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            {infoRows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-xs text-slate-400">
            Thông tin định danh được đồng bộ từ cơ sở dữ liệu quốc gia. Liên hệ cơ quan chức năng
            nếu cần điều chỉnh.
          </p>
        </section>

        {/* Đổi mật khẩu */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <KeyRound className="h-4 w-4 text-blue-600" />
            Đổi mật khẩu
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Mật khẩu hiện tại</label>
              <input
                type="password"
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                required
                autoComplete="current-password"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Mật khẩu mới</label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
                autoComplete="new-password"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
                autoComplete="new-password"
                className={inputCls}
              />
            </div>

            {msg && (
              <p
                className={`rounded-xl px-3 py-2 text-sm ${
                  msg.type === 'ok'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {msg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="h-10 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
            </button>
          </form>

          <p className="mt-4 text-xs text-slate-400">
            Mật khẩu được mã hoá (bcrypt) trước khi lưu. Hệ thống không lưu mật khẩu dạng văn bản.
          </p>
        </section>
      </div>
    </>
  )
}
