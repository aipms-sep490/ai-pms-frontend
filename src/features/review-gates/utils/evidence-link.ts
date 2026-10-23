/** External evidence must be an explicit HTTPS URL with a safe navigation target. */
export function safeEvidenceLink(value: string | null | undefined): string | null {
  if (!value || !/^https:\/\//i.test(value) || /[\s\\]/.test(value)) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? url.href : null
  } catch { return null }
}

export function evidenceLinkLabel(value: string): string {
  const url = new URL(value)
  const label = `${url.host}${url.pathname === '/' ? '' : url.pathname}`
  return label.length > 64 ? `${label.slice(0, 61)}…` : label
}

export function isLinkArtifact(artifact: { linkUrl?: string | null; contentType?: string }): boolean {
  return artifact.linkUrl != null || artifact.contentType === 'text/uri-list'
}

export function evidenceArtifactLabel(artifact: { filename: string; linkUrl?: string | null; contentType?: string }): string {
  if (!isLinkArtifact(artifact)) return artifact.filename
  const link = safeEvidenceLink(artifact.linkUrl ?? artifact.filename)
  return link ? evidenceLinkLabel(link) : 'Liên kết chưa hợp lệ'
}
