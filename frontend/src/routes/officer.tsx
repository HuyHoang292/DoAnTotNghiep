import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AppShell } from '@/components/AppShell'
import { useAuth } from '@/lib/auth'

export const Route = createFileRoute('/officer')({
  component: OfficerLayout,
})

function OfficerLayout() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate({ to: '/' })
      return
    }
    if (user.role === 'CITIZEN') {
      navigate({ to: '/citizen/dashboard' })
    }
  }, [loading, user, navigate])

  if (loading || !user || user.role === 'CITIZEN') {
    return <div className="p-6 text-slate-500">Đang tải bảng điều khiển...</div>
  }

  return (
    <AppShell role={user.role}>
      <Outlet />
    </AppShell>
  )
}
