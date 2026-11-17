import { useEffect, useState } from 'react'
import { getMyAvatarBlob, getMyAvatarMetadata } from '../api/auth-api'

export const avatarChangedEvent = 'ai-pms:avatar-changed'

export function SelfAvatarImage({ userId, initials }: { userId: number | undefined; initials: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let active = true
    let request: AbortController | null = null
    let currentUrl: string | null = null
    const refresh = async () => {
      request?.abort()
      request = new AbortController()
      const signal = request.signal
      try {
        const metadata = await getMyAvatarMetadata(signal)
        const image = metadata.hasAvatar ? await getMyAvatarBlob(signal) : null
        if (!active || signal.aborted) return
        const nextUrl = image ? URL.createObjectURL(image) : null
        if (currentUrl) URL.revokeObjectURL(currentUrl)
        currentUrl = nextUrl
        setUrl(nextUrl)
      } catch {
        if (active && !signal.aborted) {
          if (currentUrl) URL.revokeObjectURL(currentUrl)
          currentUrl = null
          setUrl(null)
        }
      }
    }
    // The sidebar is a compact fallback; profile editing owns upload errors.
    void refresh()
    const changed = () => { void refresh() }
    window.addEventListener(avatarChangedEvent, changed)
    return () => {
      active = false
      request?.abort()
      window.removeEventListener(avatarChangedEvent, changed)
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [userId])

  return url ? <img src={url} alt="" className="h-full w-full rounded-full object-cover" onError={() => setUrl(null)} />
    : <span aria-hidden="true">{initials}</span>
}
