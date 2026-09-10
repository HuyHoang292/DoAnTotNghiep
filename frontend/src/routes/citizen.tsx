import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AppShell } from '@/components/AppShell'
import { useAuth } from '@/lib/auth'

export const Route = createFileRoute('/citizen')({
  component: CitizenLayout,
})

function CitizenLayout() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate({ to: '/' })
      return
    }
    if (user.role !== 'CITIZEN') {
      navigate({ to: '/officer/dashboard' })
    }
  }, [loading, user, navigate])

  if (loading || !user || user.role !== 'CITIZEN') {
    return <div className="p-6 text-slate-500">Đang tải trang chủ...</div>
  }

  return (
    <AppShell role="CITIZEN">
      <Outlet />
    </AppShell>
  )
}
