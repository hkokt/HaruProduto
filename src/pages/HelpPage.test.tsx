import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HelpPage } from './HelpPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <HelpPage />
    </MemoryRouter>,
  )
}

describe('HelpPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders as static content without requesting operational data', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    renderPage()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('explains the complete operational flow in plain language', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Como usar o Haru', level: 1 })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'O caminho da produção, do início ao fim' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Prepare os produtos')).toBeInTheDocument()
    expect(screen.getByText('Monte a composição')).toBeInTheDocument()
    expect(screen.getByText('Registre o estoque')).toBeInTheDocument()
    expect(screen.getByText('Produza e acompanhe')).toBeInTheDocument()
  })

  it('distinguishes consultation and administrator permissions', () => {
    renderPage()

    const profiles = screen.getByRole('heading', { name: 'O que cada perfil pode fazer' })
      .parentElement?.parentElement

    expect(profiles).not.toBeNull()
    expect(
      within(profiles as HTMLElement).getByRole('heading', { name: 'Perfil Consulta' }),
    ).toBeInTheDocument()
    expect(
      within(profiles as HTMLElement).getByRole('heading', { name: 'Perfil Administrador' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Os botões dependem do seu perfil/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '1. Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '2. Criar uma conta' })).toBeInTheDocument()
    expect(screen.getByText(/Novos cadastros recebem o perfil Consulta/)).toBeInTheDocument()
  })

  it('offers accessible guide anchors and direct module links', () => {
    renderPage()

    const index = screen.getByRole('navigation', { name: 'Atalhos deste guia' })
    expect(within(index).getByRole('link', { name: 'Primeiros passos' })).toHaveAttribute(
      'href',
      '#primeiros-passos',
    )
    expect(screen.getByRole('link', { name: 'Ir para Produtos' })).toHaveAttribute(
      'href',
      '/app/products',
    )
    expect(screen.getByRole('link', { name: 'Ir para Estoque' })).toHaveAttribute(
      'href',
      '/app/inventory',
    )
    expect(screen.getByRole('link', { name: 'Ir para Produção' })).toHaveAttribute(
      'href',
      '/app/production',
    )
  })

  it('defines the main business terms and common questions', () => {
    renderPage()

    expect(screen.getByText('SKU', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('FEFO', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('Referência', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('Ordem de produção', { selector: 'dt' })).toBeInTheDocument()
    expect(
      screen.getByText('Por que não vejo o botão para cadastrar ou alterar?'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Antes de concluir uma produção' }),
    ).toBeInTheDocument()
  })
})
