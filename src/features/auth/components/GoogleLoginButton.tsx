import { useEffect, useRef, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { getGoogleChallenge, loginWithGoogle } from '../api/auth-api'
import { useAuthSession } from '../context/useAuthSession'
import { getHomePath } from '../utils/role-access'
import { useNavigate } from 'react-router-dom'

declare global { interface Window { google?: { accounts: { id: { initialize: (config: { client_id: string; nonce: string; callback: (response: { credential?: string }) => void }) => void; renderButton: (element: HTMLElement, options: Record<string, unknown>) => void } } } } }
let script: Promise<void> | null = null
function loadGoogleScript() { if (window.google) return Promise.resolve(); if (!script) script = new Promise((resolve, reject) => { const tag = document.createElement('script'); tag.src = 'https://accounts.google.com/gsi/client'; tag.async = true; tag.onload = () => resolve(); tag.onerror = () => reject(new Error('Google Identity could not load.')); document.head.append(tag) }); return script }
function errorMessage(error: unknown) { if (error instanceof HttpError && error.status === 403) return 'Google sign-in is not allowed for this origin.'; if (error instanceof HttpError && error.status === 401) return 'Google identity could not be verified.'; return 'Google sign-in is temporarily unavailable.' }

export function GoogleLoginButton() {
  const host = useRef<HTMLDivElement>(null); const navigate = useNavigate(); const { acceptExternalLogin } = useAuthSession(); const [error, setError] = useState<string | null>(null)
  useEffect(() => { let active = true; void (async () => { try { const challenge = await getGoogleChallenge(); await loadGoogleScript(); if (!active || !host.current || !window.google) return; window.google.accounts.id.initialize({ client_id: challenge.clientId, nonce: challenge.nonce, callback: async response => { if (!response.credential || !acceptExternalLogin) { setError('Google sign-in could not be completed.'); return } try { const session = await loginWithGoogle(challenge.challengeId, response.credential); const completed = await acceptExternalLogin(session); navigate(getHomePath(completed.user), { replace: true }) } catch (reason) { if (active) setError(errorMessage(reason)) } } }); window.google.accounts.id.renderButton(host.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' }) } catch (reason) { if (active) setError(errorMessage(reason)) } })(); return () => { active = false } }, [acceptExternalLogin, navigate])
  return <div className="auth-google"><div ref={host} aria-label="Đăng nhập với Google" />{error && <p className="auth-error" role="status">{error}</p>}</div>
}
