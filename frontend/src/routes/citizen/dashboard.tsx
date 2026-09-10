import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  AuthUser,
  clearToken,
  getMeRequest,
  getToken,
} from '@/lib/api'

export const Route = createFileRoute('/citizen/dashboard')({
  component: CitizenDashboard,
})

function CitizenDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const token = getToken()
      if (!token) {
        navigate({ to: '/' })
        return
      }

      try {
        const data = await getMeRequest()
        if (cancelled) return

        if (data.user.role !== 'CITIZEN') {
          navigate({ to: '/officer/dashboard' })
          return
        }

        setUser(data.user)
      } catch (err) {
        if (cancelled) return
        clearToken()
        setError(err instanceof Error ? err.message : 'Không tải được hồ sơ.')
        navigate({ to: '/' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [navigate])

  const handleLogout = () => {
    clearToken()
    navigate({ to: '/' })
  }

  if (loading) return <div className="p-6">Đang tải thông tin...</div>
  if (error || !user) return <div className="p-6 text-red-500">{error || 'Không có dữ liệu.'}</div>

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Trang chủ Công dân</h1>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Đăng xuất
        </button>
      </div>
      <p className="mt-2 text-gray-600">Xin chào, {user.fullName}!</p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700">Số CCCD</h2>
          <p className="mt-1 text-lg font-bold">{user.nationalId}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700">Email</h2>
          <p className="mt-1 text-lg font-bold">{user.email}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700">Số điện thoại</h2>
          <p className="mt-1 text-lg font-bold">{user.phone}</p>
        </div>
      </div>
    </div>
  )
}
