import { createContext, useContext } from 'react'

export type UserRole = 'admin' | 'customer'

export interface AuthContextValue {
  authenticated: boolean
  initializing: boolean
  error: string | null
  username: string
  displayName: string
  roles: UserRole[]
  isAdmin: boolean
  login: () => Promise<void>
  register: () => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => Promise<string>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
