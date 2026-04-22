import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CredentialFieldEditor } from '@/components/vault/CredentialFieldEditor'
import type { CredentialFieldDraft } from '@/types'

function uid() { return Math.random().toString(36).slice(2) }

function makeField(overrides: Partial<CredentialFieldDraft> = {}): CredentialFieldDraft {
  return { _key: uid(), field_type: 'username', label: 'User', value: 'admin', comment: '', order: 0, ...overrides }
}

// ── Add / remove fields ───────────────────────────────────────────────────────

describe('CredentialFieldEditor', () => {
  it('renders Add Field button', () => {
    render(<CredentialFieldEditor fields={[]} onChange={vi.fn()} />)
    expect(screen.getByText(/add field/i)).toBeInTheDocument()
  })

  it('calls onChange with new field when Add Field clicked', async () => {
    const onChange = vi.fn()
    render(<CredentialFieldEditor fields={[]} onChange={onChange} />)
    await userEvent.click(screen.getByText(/add field/i))
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange.mock.calls[0][0]).toHaveLength(1)
  })

  it('removes field when delete button clicked', async () => {
    const field = makeField()
    const onChange = vi.fn()
    render(<CredentialFieldEditor fields={[field]} onChange={onChange} />)
    await userEvent.click(document.querySelector('button[title]') ?? screen.getAllByRole('button')[1])
    // Trash button
    const trashBtn = document.querySelectorAll('button')[document.querySelectorAll('button').length - 2]
    fireEvent.click(trashBtn)
    expect(onChange).toHaveBeenCalled()
  })

  it('renders file drop zone for pem_file type (positive)', () => {
    const field = makeField({ field_type: 'pem_file', label: 'Cert' })
    render(<CredentialFieldEditor fields={[field]} onChange={vi.fn()} />)
    expect(screen.getByText(/click to select file/i)).toBeInTheDocument()
  })

  it('renders text input for username type (positive)', () => {
    const field = makeField({ field_type: 'username', label: 'Login' })
    render(<CredentialFieldEditor fields={[field]} onChange={vi.fn()} />)
    // Should NOT show "Click to select file"
    expect(screen.queryByText(/click to select file/i)).toBeNull()
  })

  it('renders password input as password type (positive)', () => {
    const field = makeField({ field_type: 'password', label: 'PW', value: 'secret' })
    render(<CredentialFieldEditor fields={[field]} onChange={vi.fn()} />)
    const inputs = document.querySelectorAll('input[type="password"]')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('shows saved file fields when provided', () => {
    render(
      <CredentialFieldEditor
        fields={[]}
        onChange={vi.fn()}
        savedFileFields={[{ id: 'f1', label: 'Key', original_filename: 'server.pem' }]}
        onDownloadField={vi.fn()}
      />
    )
    expect(screen.getByText(/server\.pem/i)).toBeInTheDocument()
  })
})
