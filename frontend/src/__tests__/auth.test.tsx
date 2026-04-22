import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'

// ── LoginForm ─────────────────────────────────────────────────────────────────

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    render(<LoginForm onSwitchToRegister={vi.fn()} />)
    expect(screen.getByPlaceholderText(/company\.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••/)).toBeInTheDocument()
  })

  it('calls onSwitchToRegister when link clicked', async () => {
    const mock = vi.fn()
    render(<LoginForm onSwitchToRegister={mock} />)
    await userEvent.click(screen.getByText(/create one/i))
    expect(mock).toHaveBeenCalledOnce()
  })

  it('shows loading spinner on submit (positive)', async () => {
    // Mock the auth store login method
    vi.mock('@/store/authStore', () => ({
      useAuthStore: (sel: any) =>
        sel({ login: () => new Promise(() => {}), user: null, loading: false, logout: vi.fn() }),
    }))
    render(<LoginForm onSwitchToRegister={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(btn)
    // Button disabled during loading
    expect(btn).toBeDisabled()
  })

  it('requires email input (negative)', async () => {
    render(<LoginForm onSwitchToRegister={vi.fn()} />)
    const form = screen.getByRole('button', { name: /sign in/i }).closest('form')!
    fireEvent.submit(form)
    const emailInput = screen.getByPlaceholderText(/company\.com/i) as HTMLInputElement
    expect(emailInput.validity.valueMissing).toBe(true)
  })
})

// ── RegisterForm ──────────────────────────────────────────────────────────────

describe('RegisterForm', () => {
  it('renders username field in addition to email/password', () => {
    render(<RegisterForm onSwitchToLogin={vi.fn()} />)
    expect(screen.getByPlaceholderText(/yourname/i)).toBeInTheDocument()
  })

  it('switches to login mode when link clicked', async () => {
    const mock = vi.fn()
    render(<RegisterForm onSwitchToLogin={mock} />)
    await userEvent.click(screen.getByText(/sign in/i))
    expect(mock).toHaveBeenCalledOnce()
  })

  it('shows share token context message when shareToken provided', () => {
    render(<RegisterForm onSwitchToLogin={vi.fn()} shareToken="abc123" />)
    expect(screen.getByText(/register to access the shared item/i)).toBeInTheDocument()
  })
})
