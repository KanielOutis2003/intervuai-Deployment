import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Mock AuthContext
const mockLogin = vi.fn()
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, loading: false }),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

import LoginPage from '../LoginPage'

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and password fields', () => {
    renderLoginPage()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('shows field-level error when submitting empty form', async () => {
    renderLoginPage()
    const submitBtn = screen.getByRole('button', { name: /sign in/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/email address is required/i)).toBeInTheDocument()
    })
  })

  it('shows email validation error for invalid email format', async () => {
    renderLoginPage()
    const emailInput = screen.getByPlaceholderText('you@example.com')
    await userEvent.type(emailInput, 'not-an-email')
    await userEvent.tab() // triggers blur via user-event (handles act() automatically)

    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument()
    })
  })

  it('toggles password visibility when eye icon is clicked', async () => {
    renderLoginPage()
    const passwordInput = screen.getByPlaceholderText('••••••••')
    expect(passwordInput).toHaveAttribute('type', 'password')

    const toggleBtn = screen.getByRole('button', { name: /show password/i })
    await userEvent.click(toggleBtn)
    expect(passwordInput).toHaveAttribute('type', 'text')
  })

  it('navigates to dashboard on successful login', async () => {
    mockLogin.mockResolvedValue({ success: true })
    renderLoginPage()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'user@test.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows server error banner when login fails', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Invalid email or password' })
    renderLoginPage()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'user@test.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpassword1')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
  })
})
