import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ShieldCheck, Lock, User as UserIcon, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { loginRequest, setToken } from '@/lib/api'

export const Route = createFileRoute('/')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, setUser, logout } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (authLoading || !user) return
    navigate({
      to: user.role === 'CITIZEN' ? '/citizen/dashboard' : '/officer/dashboard',
    })
  }, [authLoading, user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin.')
      return
    }

    setLoading(true)
    try {
      const data = await loginRequest(username.trim(), password)
      setToken(data.token)
      setUser(data.user)
      navigate({
        to: data.user.role === 'CITIZEN' ? '/citizen/dashboard' : '/officer/dashboard',
      })
    } catch (err) {
      logout()
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.')
    } finally {
      setLoading(false)
    }
  }

  const quick = (type: 'citizen' | 'officer') => {
    if (type === 'citizen') {
      setUsername('001095999888')
      setPassword('123456')
    } else {
      setUsername('officer@traffic.gov.vn')
      setPassword('123456')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1d4ed8_0%,_transparent_45%),radial-gradient(circle_at_bottom_right,_#0f172a_0%,_#020617_55%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white p-7 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">CSGT AI TRAFFIC</h1>
          <p className="mt-1 text-sm text-slate-500">
            Hệ thống xử lý vi phạm giao thông
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Tên đăng nhập / CCCD / Email
            </label>
            <div className="relative mt-1">
              <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Nhập Email hoặc CCCD"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || authLoading}
            className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:bg-blue-400"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Đăng nhập
          </button>
        </form>

        <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => quick('citizen')}
            className="rounded-xl border border-slate-200 py-2 text-slate-600 hover:bg-slate-50"
          >
            Demo công dân
          </button>
          <button
            type="button"
            onClick={() => quick('officer')}
            className="rounded-xl border border-slate-200 py-2 text-slate-600 hover:bg-slate-50"
          >
            Demo công an
          </button>
        </div>
      </div>
    </div>
  )
}
