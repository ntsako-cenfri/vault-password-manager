import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareModal } from '@/components/vault/ShareModal'
import type { VaultItem } from '@/types'

const mockItem: VaultItem = {
  id: 'item-1',
  owner_id: 'user-1',
  title: 'Prod DB',
  description: null,
  fields: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// Mock the shares API
vi.mock('@/api/shares', () => ({
  sharesApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({
      data: {
        id: 'share-1', token: 'tok-abc', vault_item_id: 'item-1',
        recipient_email: null, is_strict: true, expires_at: null,
        created_at: new Date().toISOString(),
      },
    }),
    revoke: vi.fn().mockResolvedValue({}),
  },
}))

describe('ShareModal', () => {
  it('does not render when closed (negative)', () => {
    const { container } = render(<ShareModal item={mockItem} open={false} onClose={vi.fn()} />)
    // Modal content should not be visible
    expect(container.querySelector('[class*="rounded-2xl"]')).toBeNull()
  })

  it('renders when open (positive)', () => {
    render(<ShareModal item={mockItem} open={true} onClose={vi.fn()} />)
    expect(screen.getByText(/Share — Prod DB/i)).toBeInTheDocument()
  })

  it('calls onClose when Escape is pressed (positive)', async () => {
    const onClose = vi.fn()
    render(<ShareModal item={mockItem} open={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows "Login required" checkbox checked by default (positive)', () => {
    render(<ShareModal item={mockItem} open={true} onClose={vi.fn()} />)
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('shows empty state when no active links (positive)', async () => {
    render(<ShareModal item={mockItem} open={true} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/no active share links/i)).toBeInTheDocument()
    })
  })

  it('generates link on button click (positive)', async () => {
    render(<ShareModal item={mockItem} open={true} onClose={vi.fn()} />)
    await userEvent.click(screen.getByText(/generate link/i))
    await waitFor(() => {
      expect(screen.getByText(/tok-abc/i)).toBeInTheDocument()
    })
  })
})
