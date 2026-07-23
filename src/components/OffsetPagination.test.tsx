import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OffsetPagination } from './OffsetPagination'

describe('OffsetPagination', () => {
  it('announces the visible range and requests adjacent backend offsets', () => {
    const onOffsetChange = vi.fn()

    render(
      <OffsetPagination
        offset={20}
        limit={20}
        totalElements={55}
        hasPrevious
        hasNext
        ariaLabel="Paginação de produtos"
        onOffsetChange={onOffsetChange}
        onLimitChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Paginação de produtos' })).toBeInTheDocument()
    expect(screen.getByText('21–40 de 55 · Página 2 de 3')).toHaveAttribute('aria-live', 'polite')

    fireEvent.click(screen.getByRole('button', { name: 'Ir para a página anterior' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ir para a próxima página' }))

    expect(onOffsetChange).toHaveBeenNthCalledWith(1, 0)
    expect(onOffsetChange).toHaveBeenNthCalledWith(2, 40)
  })

  it('disables unavailable directions and offers the supported limits', () => {
    const onLimitChange = vi.fn()

    render(
      <OffsetPagination
        offset={0}
        limit={20}
        totalElements={8}
        hasPrevious={false}
        hasNext={false}
        ariaLabel="Paginação de estoque"
        onOffsetChange={vi.fn()}
        onLimitChange={onLimitChange}
      />,
    )

    expect(screen.getByRole('button', { name: 'Ir para a página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Ir para a próxima página' })).toBeDisabled()

    const limit = screen.getByRole('combobox', {
      name: 'Itens por página — Paginação de estoque',
    })
    expect(limit).toHaveValue('20')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      '10',
      '20',
      '50',
    ])

    fireEvent.change(limit, { target: { value: '50' } })
    expect(onLimitChange).toHaveBeenCalledWith(50)
  })

  it('distinguishes the accessible search window from the real result total', () => {
    render(
      <OffsetPagination
        offset={9_950}
        limit={50}
        totalElements={25_000}
        hasPrevious
        hasNext={false}
        resultWindowLimit={10_000}
        ariaLabel="Paginação da busca"
        onOffsetChange={vi.fn()}
        onLimitChange={vi.fn()}
      />,
    )

    expect(
      screen.getByText('9951–10000 de 10000 acessíveis (25000 encontrados) · Página 200 de 200'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir para a próxima página' })).toBeDisabled()
  })
})
