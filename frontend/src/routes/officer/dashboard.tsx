import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  AuthUser,
  clearToken,
  getMeRequest,
  getToken,
} from '@/lib/api'

export const Route = createFileRoute('/officer/dashboard')({
  component: OfficerDashboard,
})

function OfficerDashboard() {
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

        if (data.user.role === 'CITIZEN') {
          navigate({ to: '/citizen/dashboard' })
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

  if (loading) return <div className="p-6">Đang tải dữ liệu...</div>
  if (error || !user) return <div className="p-6 text-red-500">{error || 'Không có dữ liệu.'}</div>

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Bảng quản trị Cảnh sát giao thông</h1>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Đăng xuất
        </button>
      </div>
      <p className="mt-2 text-gray-600">
        Cán bộ: <span className="font-semibold">{user.fullName}</span>
        {user.badgeNumber ? ` (${user.badgeNumber})` : ''}
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-blue-50 p-4">
          <h3 className="text-sm font-medium text-blue-800">Đơn vị công tác</h3>
          <p className="mt-1 text-lg font-bold text-blue-900">
            {user.unit || 'Chưa cập nhật'}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-700">Email</h3>
          <p className="mt-1 text-lg font-bold">{user.email}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-700">Vai trò</h3>
          <p className="mt-1 text-lg font-bold">{user.role}</p>
        </div>
      </div>
    </div>
  )
}
