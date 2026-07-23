import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmModal, Field, Modal, SearchCard } from './ui'

describe('SearchCard', () => {
  it('updates the search value and submits through the form', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchCard
        label="Localizar produto"
        placeholder="Digite nome, ID ou SKU"
        value=""
        inputMode="search"
        inputType="search"
        onChange={onChange}
        onSearch={onSearch}
      />,
    )

    const input = screen.getByRole('searchbox', { name: 'Localizar produto' })
    fireEvent.change(input, { target: { value: 'SKU-100' } })
    fireEvent.submit(input.closest('form')!)

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith('SKU-100')
    expect(onSearch).toHaveBeenCalledOnce()
  })

  it('communicates the loading state and prevents duplicate submissions', () => {
    const onSearch = vi.fn()

    render(
      <SearchCard
        label="Localizar produto"
        placeholder="Digite nome, ID ou SKU"
        value="Café"
        loading
        inputMode="search"
        inputType="search"
        onChange={vi.fn()}
        onSearch={onSearch}
      />,
    )

    const submitButton = screen.getByRole('button', { name: /Buscando/ })

    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(submitButton)
    expect(onSearch).not.toHaveBeenCalled()
  })
})

describe('Modal', () => {
  it('submits the current form values as FormData', () => {
    const onSubmit = vi.fn()

    render(
      <Modal
        title="Novo produto"
        subtitle="Preencha os dados do produto."
        onClose={vi.fn()}
        onSubmit={onSubmit}
      >
        <Field label="Nome" name="name" defaultValue="Café especial" />
        <Field label="SKU" name="sku" defaultValue="CAFE-001" />
      </Modal>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSubmit).toHaveBeenCalledOnce()
    const submittedData = onSubmit.mock.calls[0][0] as FormData
    expect(submittedData.get('name')).toBe('Café especial')
    expect(submittedData.get('sku')).toBe('CAFE-001')
  })

  it('only closes from explicit dismissal interactions', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal
        title="Editar produto"
        subtitle="Atualize os dados do produto."
        onClose={onClose}
        onSubmit={vi.fn()}
      >
        <Field label="Nome" name="name" />
      </Modal>,
    )

    fireEvent.mouseDown(screen.getByRole('heading', { name: 'Editar produto' }))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.mouseDown(container.querySelector('.modal-backdrop')!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('blocks submission until the form has a valid selection', () => {
    const onSubmit = vi.fn()

    render(
      <Modal
        title="Entrada de lote"
        subtitle="Selecione um produto."
        onClose={vi.fn()}
        onSubmit={onSubmit}
        submitDisabled
        submitLabel="Registrar lote"
      >
        <Field label="Lote" name="lotNumber" />
      </Modal>,
    )

    const submitButton = screen.getByRole('button', { name: 'Registrar lote' })
    expect(submitButton).toBeDisabled()

    fireEvent.click(submitButton)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('ConfirmModal', () => {
  it('blocks confirmation while an operation is pending', () => {
    const onConfirm = vi.fn()

    render(
      <ConfirmModal
        title="Excluir produto"
        description="Esta operação não pode ser desfeita."
        confirmLabel="Excluir"
        onClose={vi.fn()}
        onConfirm={onConfirm}
        pending
      />,
    )

    const confirmButton = screen.getByRole('button', { name: /Excluir/ })
    expect(confirmButton).toBeDisabled()

    fireEvent.click(confirmButton)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
