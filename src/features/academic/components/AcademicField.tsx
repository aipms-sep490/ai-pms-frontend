import { cloneElement, useId, type InputHTMLAttributes, type ReactElement, type SelectHTMLAttributes } from 'react'
import type { AcademicError } from '../academic-error'

/** Keeps the control's existing behavior and associates its allowlisted field correction. */
export function AcademicField({ label, field, error, children }: {
  label: string
  field: string
  error?: AcademicError | null
  children: ReactElement<InputHTMLAttributes<HTMLInputElement> | SelectHTMLAttributes<HTMLSelectElement>>
}) {
  const id = useId()
  const message = error?.fields?.[field]
  return <div className="flex min-w-0 flex-col gap-2 text-sm font-medium text-ink-soft">
    <label htmlFor={id}>{label}</label>
    {cloneElement(children, { id, 'aria-invalid': Boolean(message), 'aria-describedby': message ? `${id}-error` : undefined })}
    {message && <p id={`${id}-error`} className="text-xs font-normal text-status-error-text">{message}</p>}
  </div>
}
