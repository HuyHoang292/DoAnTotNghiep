import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type AuthUser,
  clearToken,
  getMeRequest,
  getToken,
  logoutRequest,
} from './api'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  setUser: (user: AuthUser | null) => void
  logout: () => void
  reload: () => Promise<AuthUser | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      return null
    }
    try {
      const data = await getMeRequest()
      setUser(data.user)
      return data.user
    } catch {
      clearToken()
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await reload()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [reload])

  const logout = useCallback(() => {
    // Báo server đóng phiên trong lịch sử đăng nhập (không chờ, lỗi thì bỏ qua)
    if (getToken()) logoutRequest().catch(() => {})
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, setUser, logout, reload }),
    [user, loading, logout, reload],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider')
  return ctx
}
