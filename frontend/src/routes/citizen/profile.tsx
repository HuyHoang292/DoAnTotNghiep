import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { KeyRound, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/ui'

export const Route = createFileRoute('/citizen/profile')({
  component: CitizenProfile,
})

function CitizenProfile() {
  const { user } = useAuth()
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  if (!user) return null

  const handleSubmit = (e: React.FormEvent) => {
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
    // Chức năng đổi mật khẩu cần API endpoint — hiển thị thông báo chờ tích hợp
    setMsg({ type: 'err', text: 'Tính năng đổi mật khẩu đang được phát triển, vui lòng liên hệ cán bộ.' })
  }

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
            {[
              ['Họ và tên', user.fullName],
              ['Số CCCD', user.nationalId],
              ['Số điện thoại', user.phone],
              ['Email', user.email || '—'],
              ['Vai trò', user.role === 'CITIZEN' ? 'Công dân' : user.role],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-400">
            Thông tin định danh được đồng bộ từ cơ sở dữ liệu. Liên hệ cơ quan chức năng nếu cần
            điều chỉnh.
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
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Mật khẩu mới</label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              className="h-10 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Cập nhật mật khẩu
            </button>
          </form>
        </section>
      </div>
    </>
  )
}
