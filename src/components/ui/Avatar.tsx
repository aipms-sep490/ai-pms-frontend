import { useState } from 'react'
import { getAvatarTone, getInitials, type AvatarTone } from './initials'
import './avatar.css'

export interface AvatarProps {
  name?: string | null
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  shape?: 'circle' | 'rounded'
  tone?: AvatarTone
  toneSeed?: string | number | null
  className?: string
  title?: string
}

export function Avatar({
  name,
  src,
  size = 'md',
  shape = 'rounded',
  tone,
  toneSeed,
  className = '',
  title,
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const resolvedTone = tone ?? getAvatarTone(toneSeed ?? name)
  const initials = getInitials(name)
  const showImage = Boolean(src) && !imgFailed

  return (
    <span
      className={`app-avatar app-avatar--${size} app-avatar--${shape} app-avatar--tone-${resolvedTone} ${className}`.trim()}
      title={title ?? (name ?? undefined)}
      aria-hidden={!showImage && !title ? true : undefined}
    >
      {showImage ? (
        <img
          src={src!}
          alt={name ? `Ảnh đại diện ${name}` : 'Ảnh đại diện'}
          className="app-avatar__img"
          onError={() => setImgFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  )
}
