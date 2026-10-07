import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, KeyRound, Loader2, MailCheck, ShieldCheck } from 'lucide-react'
import { apiFetch } from '@/lib/api'

export const Route = createFileRoute('/forgot_password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [nationalId, setNationalId] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nationalId.trim() || !email.trim()) {
      setError('Vui lòng nhập đầy đủ số CCCD và email.')
      return
    }

    setLoading(true)
    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ nationalId: nationalId.trim(), email: email.trim() }),
      })
      setSentTo(email.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi được yêu cầu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      {/* Background gradient — nhất quán với trang login */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1d4ed8_0%,_transparent_45%),radial-gradient(circle_at_bottom_right,_#0f172a_0%,_#020617_55%)]" />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white p-7 shadow-2xl">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">CSGT AI TRAFFIC</h1>
          <p className="mt-1 text-sm text-slate-500">Hệ thống xử lý vi phạm giao thông</p>
        </div>

        {sentTo ? (
          /* Trạng thái đã gửi */
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <MailCheck className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Kiểm tra email của bạn</h2>
            <p className="text-sm text-slate-500">
              Hướng dẫn đặt lại mật khẩu đã được gửi tới{' '}
              <span className="font-semibold text-slate-800">{sentTo}</span>.
              Liên kết có hiệu lực trong <span className="font-medium">30 phút</span>.
            </p>
            <p className="text-xs text-slate-400">
              Không nhận được email? Liên hệ cơ quan công an nơi đăng ký phương tiện để được hỗ trợ.
            </p>
            <Link
              to="/"
              className="flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          /* Form nhập thông tin */
          <>
            <div className="mb-5 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="font-bold text-slate-900">Quên mật khẩu</h2>
                <p className="text-xs text-slate-500">
                  Nhập số CCCD và email đã đăng ký để nhận hướng dẫn đặt lại.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Số CCCD / CMND
                </label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="Nhập số CCCD"
                  autoComplete="username"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email đã đăng ký
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  autoComplete="email"
                  className={inputCls}
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-400"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Gửi yêu cầu
              </button>
            </form>

            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại đăng nhập
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
