import { useState } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { changePasswordRequest } from '@/lib/api'
import { Modal } from './ui'

type ChangePasswordModalProps = {
  isRequired?: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ChangePasswordModal({ isRequired = false, onClose, onSuccess }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin.')
      return
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới và xác nhận không khớp.')
      return
    }

    if (oldPassword === newPassword) {
      setError('Mật khẩu mới phải khác mật khẩu cũ.')
      return
    }

    setSubmitting(true)
    try {
      await changePasswordRequest({ oldPassword, newPassword })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đổi mật khẩu.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={isRequired ? '🔐 Bắt buộc đổi mật khẩu' : 'Đổi mật khẩu'}
      description={
        isRequired
          ? 'Vì lý do bảo mật, bạn cần đổi mật khẩu mặc định trước khi sử dụng hệ thống.'
          : 'Nhập mật khẩu hiện tại và mật khẩu mới của bạn.'
      }
      onClose={isRequired ? undefined : onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mật khẩu hiện tại */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Mật khẩu hiện tại
          </span>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
              className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              autoFocus
              disabled={submitting}
            />
          </div>
        </label>

        {/* Mật khẩu mới */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Mật khẩu mới
          </span>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              disabled={submitting}
            />
          </div>
        </label>

        {/* Xác nhận mật khẩu */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Xác nhận mật khẩu mới
          </span>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              disabled={submitting}
            />
          </div>
        </label>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex justify-end gap-2 pt-2">
          {!isRequired && (
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Hủy
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRequired ? 'Đổi mật khẩu để tiếp tục' : 'Đổi mật khẩu'}
          </button>
        </div>

        {isRequired && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            ⚠️ Bạn không thể đóng cửa sổ này cho đến khi đổi mật khẩu thành công.
          </div>
        )}
      </form>
    </Modal>
  )
}
