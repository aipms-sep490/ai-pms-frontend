export function ChatMessageContent({ body }: { body: string }) {
  return <>{body.split(/(https?:\/\/[^\s<>]+)/gi).map((part, index) => {
    if (!/^https?:\/\//i.test(part)) return part
    const clean = part.replace(/[.,;!?)]*$/, '')
    try {
      const url = new URL(clean)
      if (!['http:', 'https:'].includes(url.protocol)) return part
      return <span key={index}><a href={url.href} target="_blank" rel="noopener noreferrer">{clean}</a>{part.slice(clean.length)}</span>
    } catch { return part }
  })}</>
}
