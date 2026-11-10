import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NumberField } from './NumberField'

afterEach(cleanup)

describe('NumberField', () => {
  it('shows a unit next to the value stepper', () => {
    render(<NumberField label="Hạn" value={5} unit="NGÀY" onChange={() => {}} />)
    expect(screen.getByText('NGÀY')).toBeTruthy()
    expect(screen.getByRole('spinbutton', { name: 'Hạn' })).toBeTruthy()
  })

  it('passes stepper changes to the owner and respects the supplied minimum', () => {
    const onChange = vi.fn()
    render(<NumberField label="Hạn" value={5} min={5} unit="NGÀY" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Giảm Hạn' }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Tăng Hạn' }))
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('allows an empty intermediate input instead of converting it to zero', () => {
    const onChange = vi.fn()
    render(<NumberField label="Hạn" value={5} unit="NGÀY" onChange={onChange} />)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Hạn' }), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith('')
  })
})
