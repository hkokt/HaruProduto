import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Boxes,
  Factory,
  PackagePlus,
  Server,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/ui'

interface ModuleLinkProps {
  to: string
  icon: ReactNode
  title: string
  description: string
}

export function DashboardPage() {
  const auth = useAuth()
  const health = useQuery({
    queryKey: ['nginx-health'],
    queryFn: async () => {
      const response = await fetch('/nginx-health')
      if (!response.ok) throw new Error('O ambiente local não respondeu.')
      return response.text()
    },
    refetchInterval: 30_000,
  })
  return (
    <>
      <PageHeader
        eyebrow="Ambiente local"
        title={`Olá, ${auth.displayName.split(' ')[0]}`}
        description="Acesse os módulos conectados ao backend local."
      />
      <div className="metric-grid dashboard-status-grid">
        <article className="metric-card">
          <div className="metric-icon">
            <Server />
          </div>
          <span>Backend Docker</span>
          <strong className="metric-text">
            {health.isPending ? 'Verificando' : health.isSuccess ? 'Disponível' : 'Indisponível'}
          </strong>
          <small>Atualização automática a cada 30 segundos</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon">
            <ShieldCheck />
          </div>
          <span>Autenticação</span>
          <strong className="metric-text">Conectada</strong>
          <small>Authorization Code com PKCE</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon">
            <UserRound />
          </div>
          <span>Perfil atual</span>
          <strong className="metric-text">{auth.isAdmin ? 'Administrador' : 'Consulta'}</strong>
          <small>{auth.username}</small>
        </article>
      </div>
      <section className="card">
        <div className="card-header">
          <div>
            <span className="eyebrow">Módulos</span>
            <h3>O que você quer fazer?</h3>
          </div>
        </div>
        <div className="module-grid">
          <ModuleLink
            to="/app/products"
            icon={<Boxes />}
            title="Produtos"
            description="Consulte cadastros e fichas técnicas por nome, ID ou SKU."
          />
          <ModuleLink
            to="/app/inventory"
            icon={<PackagePlus />}
            title="Estoque"
            description="Veja disponibilidade, lotes e movimentações."
          />
          <ModuleLink
            to="/app/production"
            icon={<Factory />}
            title="Produção"
            description="Crie e acompanhe ordens de produção."
          />
        </div>
      </section>
      <section className="api-limitation">
        <strong>Sobre os indicadores</strong>
        <p>
          A API ainda não fornece listagens gerais ou totais agregados. Por isso, esta visão exibe
          apenas informações verificadas no ambiente, sem estimativas ou dados demonstrativos.
        </p>
      </section>
    </>
  )
}

function ModuleLink({ to, icon, title, description }: ModuleLinkProps) {
  return (
    <NavLink className="module-link" to={to}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      <ArrowRight size={18} />
    </NavLink>
  )
}
