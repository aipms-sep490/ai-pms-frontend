// Shared Google Identity Services loader, used by both the existing student/staff
// GoogleLoginButton and the industry expert enrollment flow (same client-side SDK,
// different backend challenge/exchange endpoints).

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; nonce: string; callback: (response: { credential?: string }) => void }) => void
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

let script: Promise<void> | null = null

export function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!script) {
    script = new Promise((resolve, reject) => {
      const tag = document.createElement('script')
      tag.src = 'https://accounts.google.com/gsi/client'
      tag.async = true
      const timeout = window.setTimeout(() => { script = null; tag.remove(); reject(new Error('Google Identity timed out.')) }, 15000)
      tag.onload = () => { window.clearTimeout(timeout); resolve() }
      tag.onerror = () => {
        window.clearTimeout(timeout)
        script = null
        tag.remove()
        reject(new Error('Google Identity could not load.'))
      }
      document.head.append(tag)
    })
  }
  return script
}
