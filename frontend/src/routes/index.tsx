import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ShieldCheck, Lock, User as UserIcon, Loader2 } from 'lucide-react'
import { clearToken, loginRequest, setToken } from '@/lib/api'

export const Route = createFileRoute('/')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

      if (data.user.role === 'CITIZEN') {
        navigate({ to: '/citizen/dashboard' })
      } else {
        navigate({ to: '/officer/dashboard' })
      }
    } catch (err) {
      clearToken()
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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <ShieldCheck className="h-8 w-8 text-blue-600" />
          <h1 className="text-xl font-bold">CSGT AI TRAFFIC</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Tên đăng nhập / CCCD / Email
            </label>
            <div className="relative mt-1">
              <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập Email hoặc CCCD"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Mật khẩu</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:bg-blue-400"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Đăng nhập
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-gray-500">
          Demo:{' '}
          <button type="button" onClick={() => quick('citizen')} className="underline">
            Citizen
          </button>{' '}
          |{' '}
          <button type="button" onClick={() => quick('officer')} className="underline">
            Officer
          </button>
        </div>
      </div>
    </div>
  )
}
