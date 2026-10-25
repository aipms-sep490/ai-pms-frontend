const conversations = new WeakMap()
export async function readAssistantStreamResult(response, page) {
  const body = response.request().postData() ?? ''
  const id = body.match(/name="conversationId"\r?\n\r?\n(\d+)/)?.[1] ?? conversations.get(page)
  const revision = Number(body.match(/name="expectedRevision"\r?\n\r?\n(\d+)/)?.[1]) + 1
  if (!response.ok()) throw new Error(`Assistant request failed (${response.status()})`)
  if (id) conversations.set(page, id)
  await page.getByRole('button', { name: 'Gửi', exact: true }).waitFor({ state: 'visible', timeout: 90000 })
  // CDP may discard streamed response bodies; verify the persisted final response instead.
  const result = await page.evaluate(async ({ id, revision }) => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    if (!id) id = (await (await fetch('/api/v1/academic/assistant/conversations', { headers })).json())[0].id
    const response = await fetch(`/api/v1/academic/assistant/conversations/${id}`, { headers })
    const detail = await response.json()
    return Number.isFinite(revision) ? detail.turns?.find(turn => turn.response.revision === revision)?.response : detail.turns?.at(-1)?.response
  }, { id, revision })
  if (!result) throw new Error('Assistant did not persist the expected turn')
  return result
}
