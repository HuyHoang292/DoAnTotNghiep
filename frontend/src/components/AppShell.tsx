import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Bell,
  Car,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
  Users,
  Video,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'

type Role = 'CITIZEN' | 'OFFICER' | 'ADMIN'

const citizenNav = [
  { to: '/citizen/dashboard', label: 'Trang chủ', icon: LayoutDashboard },
  { to: '/citizen/dashboard', label: 'Phương tiện', icon: Car, disabled: true },
  { to: '/citizen/dashboard', label: 'Vi phạm', icon: TriangleAlert, disabled: true },
  { to: '/citizen/dashboard', label: 'Hóa đơn', icon: FileText, disabled: true },
]

const officerNav = [
  { to: '/officer/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/officer/scan',      label: 'Quét biển số', icon: ScanLine },
  { to: '/officer/vehicles',  label: 'Phương tiện',  icon: Car },
  { to: '/officer/citizens',  label: 'Công dân',     icon: Users },
  { to: '/officer/dashboard', label: 'Vi phạm',      icon: TriangleAlert, disabled: true },
  { to: '/officer/dashboard', label: 'Hàng đợi AI',  icon: ListChecks, disabled: true },
  { to: '/officer/dashboard', label: 'Camera',       icon: Video, disabled: true },
]

export function AppShell({
  role,
  children,
}: {
  role: Role
  children?: ReactNode
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [open, setOpen] = useState(false)
  const nav = role === 'CITIZEN' ? citizenNav : officerNav
  const isOfficer = role !== 'CITIZEN'

  const handleLogout = () => {
    logout()
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          aria-label="Đóng menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col text-white transition-transform lg:translate-x-0',
          isOfficer ? 'bg-slate-900' : 'bg-blue-900',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-sky-300" />
            <div>
              <p className="text-sm font-bold tracking-wide">CSGT AI TRAFFIC</p>
              <p className="text-[11px] text-white/60">
                {isOfficer ? 'Cổng cán bộ' : 'Cổng công dân'}
              </p>
            </div>
          </div>
          <button type="button" className="lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const active = !item.disabled && pathname === item.to
            const Icon = item.icon
            const className = cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm',
              active
                ? 'bg-white/15 font-medium text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white',
              'disabled' in item && item.disabled && 'cursor-default opacity-50 hover:bg-transparent hover:text-white/70',
            )

            if ('disabled' in item && item.disabled) {
              return (
                <span key={item.label} className={className}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-white/40">
                    Sắp có
                  </span>
                </span>
              )
            }

            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                className={className}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium">{user?.fullName}</p>
          <p className="truncate text-xs text-white/60">
            {isOfficer
              ? `${user?.badgeNumber || 'Cán bộ'} · ${user?.unit || 'Phòng CSGT'}`
              : user?.nationalId}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-sm hover:bg-white/15"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="hidden text-sm text-slate-500 lg:block">
            Hệ thống xử lý vi phạm giao thông bằng AI
          </p>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline">
              {isOfficer ? 'CÁN BỘ' : 'CÔNG DÂN'}
            </span>
            <button type="button" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="space-y-5 p-4 md:p-6">{children ?? <Outlet />}</main>
      </div>
    </div>
  )
}
