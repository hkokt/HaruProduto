import Keycloak from 'keycloak-js'
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import type { AuthContextValue, UserRole } from './AuthContext'

const keycloak = new Keycloak({
  url: `${window.location.origin}/auth`,
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'haru',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'haru-api',
})
let initialization: Promise<boolean> | null = null

function getRoles(): UserRole[] {
  const realmRoles = keycloak.realmAccess?.roles ?? []
  const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'haru-api'
  const clientRoles = keycloak.resourceAccess?.[clientId]?.roles ?? []
  const roles = new Set([...realmRoles, ...clientRoles].map((role) => role.toLowerCase()))
  return (['admin', 'customer'] as UserRole[]).filter((role) => roles.has(role))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    initialization ??= keycloak.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: false,
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    })
    initialization
      .then((isAuthenticated) => {
        if (!active) return
        setAuthenticated(isAuthenticated)
        setError(null)
        setVersion((current) => current + 1)
      })
      .catch(() => {
        if (!active) return
        setError('Não foi possível conectar ao serviço de autenticação. Confirme se o Docker está em execução.')
      })
      .finally(() => active && setInitializing(false))

    keycloak.onAuthSuccess = () => {
      setAuthenticated(true)
      setVersion((current) => current + 1)
    }
    keycloak.onAuthLogout = () => setAuthenticated(false)
    keycloak.onTokenExpired = () => {
      void keycloak.updateToken(30).catch(() => setAuthenticated(false))
    }
    return () => { active = false }
  }, [])

  const login = useCallback(async () => {
    await keycloak.login({ redirectUri: `${window.location.origin}/app`, locale: 'pt-BR' })
  }, [])

  const register = useCallback(async () => {
    await keycloak.register({ redirectUri: `${window.location.origin}/app`, locale: 'pt-BR' })
  }, [])

  const logout = useCallback(async () => {
    await keycloak.logout({ redirectUri: `${window.location.origin}/login` })
  }, [])

  const getAccessToken = useCallback(async () => {
    try {
      const refreshed = await keycloak.updateToken(30)
      if (refreshed) setVersion((current) => current + 1)
      if (!keycloak.token) throw new Error()
      return keycloak.token
    } catch {
      setAuthenticated(false)
      throw new Error('Sua sessão expirou. Entre novamente.')
    }
  }, [])

  const token = keycloak.tokenParsed
  const roles = getRoles()
  const value: AuthContextValue = {
    authenticated,
    initializing,
    error,
    username: String(token?.preferred_username ?? token?.sub ?? ''),
    displayName: String(token?.name ?? token?.preferred_username ?? 'Usuário'),
    roles,
    isAdmin: roles.includes('admin'),
    login,
    register,
    logout,
    getAccessToken,
  }
  void version

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
