import { useNavigate } from '@tanstack/react-router'
import { Bell, CheckCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getCitizenNotifications,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
} from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import type { AppNotification } from '@/lib/types'

const POLL_INTERVAL_MS = 30_000

/** Chuông thông báo của công dân: báo vi phạm mới sau khi cán bộ CSGT xác minh */
export function NotificationBell() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const data = await getCitizenNotifications()
      setItems(data.notifications)
      setUnread(data.unreadCount)
    } catch {
      // Lỗi tải thông báo không chặn giao diện; lần thăm dò sau sẽ thử lại
    }
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const openItem = async (item: AppNotification) => {
    setOpen(false)
    if (!item.isRead) {
      setItems((list) => list.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)))
      setUnread((count) => Math.max(0, count - 1))
      markNotificationReadRequest(item.id).catch(() => {})
    }
    if (item.violationId) {
      navigate({ to: '/citizen/violations/$id', params: { id: item.violationId } })
    }
  }

  const markAll = async () => {
    setItems((list) => list.map((n) => ({ ...n, isRead: true })))
    setUnread(0)
    await markAllNotificationsReadRequest().catch(() => {})
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        aria-label={unread ? `${unread} thông báo chưa đọc` : 'Thông báo'}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-900">Thông báo</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Đánh dấu đã đọc
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Chưa có thông báo nào.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className={cn(
                    'block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50',
                    !item.isRead && 'bg-blue-50/60',
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!item.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-600">{item.message}</p>
                      {item.createdAt && (
                        <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(item.createdAt)}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
