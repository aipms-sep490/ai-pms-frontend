/** Collect a server-paged option/history source without silently dropping later pages. */
export async function readAllPages<T>(read: (page: number) => Promise<{ items: T[]; totalCount: number }>): Promise<T[]> {
  const items: T[] = []
  for (let page = 1; ; page++) {
    const result = await read(page)
    items.push(...result.items)
    if (items.length >= (result.totalCount ?? result.items.length)) return items
    if (result.items.length === 0) throw new Error('The paged source changed or returned an incomplete page. Reload before continuing.')
  }
}
