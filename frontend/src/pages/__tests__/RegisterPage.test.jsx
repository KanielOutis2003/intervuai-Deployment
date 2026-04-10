import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const mockRegister = vi.fn()
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ register: mockRegister, loading: false }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

import RegisterPage from '../RegisterPage'

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  )
}

describe('RegisterPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders all form fields', () => {
    renderRegisterPage()
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Min. 8 characters')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Repeat password')).toBeInTheDocument()
  })

  it('shows field-level error when full name is empty on submit', async () => {
    renderRegisterPage()
    await userEvent.click(screen.getByRole('button', { name: /create free account/i }))

    await waitFor(() => {
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument()
    })
  })

  it('shows password mismatch error on blur', async () => {
    renderRegisterPage()
    const pwInput = screen.getByPlaceholderText('Min. 8 characters')
    const confirmInput = screen.getByPlaceholderText('Repeat password')

    await userEvent.type(pwInput, 'Password123!')
    await userEvent.type(confirmInput, 'DifferentPass!')
    await userEvent.tab() // triggers blur via user-event (handles act() automatically)

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('shows password strength meter when typing password', async () => {
    renderRegisterPage()
    const pwInput = screen.getByPlaceholderText('Min. 8 characters')
    await userEvent.type(pwInput, 'weak')

    // After typing, strength bar should appear (Weak label)
    await waitFor(() => {
      expect(screen.getByText('Weak')).toBeInTheDocument()
    })
  })

  it('shows success message after successful registration', async () => {
    mockRegister.mockResolvedValue({ success: true })
    renderRegisterPage()

    await userEvent.type(screen.getByPlaceholderText('John Doe'), 'Jane Doe')
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com')
    await userEvent.type(screen.getByPlaceholderText('Min. 8 characters'), 'Password123!')
    await userEvent.type(screen.getByPlaceholderText('Repeat password'), 'Password123!')

    // Check the terms checkbox
    const termsCheck = screen.getByRole('checkbox')
    await userEvent.click(termsCheck)

    await userEvent.click(screen.getByRole('button', { name: /create free account/i }))

    await waitFor(() => {
      expect(screen.getByText(/account created/i)).toBeInTheDocument()
    })
  })
})
