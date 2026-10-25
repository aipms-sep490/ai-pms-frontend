import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const { ACADEMIC_TEST_EMAIL: email, ACADEMIC_TEST_PASSWORD: password, ACADEMIC_EVIDENCE_DIR: output } = process.env
if (!email || !password || !output) throw new Error('Provide dedicated test credentials through environment.')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.url().includes('/auth/') && response.status() >= 400) console.log(JSON.stringify({ path: new URL(response.url()).pathname, status: response.status() })) })
  page.on('requestfailed', request => console.log(JSON.stringify({ path: new URL(request.url()).pathname, error: request.failure()?.errorText })))
  let healthy = false
  for (let attempt = 0; attempt < 12; attempt++) {
    const response = await page.request.get('https://api-staging.khaidz.com/api/v1/system', { timeout: 5000 }).catch(() => null)
    if (response?.ok()) { healthy = true; break }
    await page.waitForTimeout(1000)
  }
  if (!healthy) throw new Error('Staging not healthy')
  await page.goto('http://localhost:5175/profile')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password)
  for (let attempt = 0; attempt < 10; attempt++) {
    const loggedIn = page.waitForResponse(r => r.url().endsWith('/auth/login'), { timeout: 15000 })
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    const response = await loggedIn
    if (response.ok()) break
    if (response.status() < 500) throw new Error(`Login rejected: ${response.status()}`)
    await page.waitForTimeout(3000)
  }
  await page.waitForURL('**/profile').catch(async () => { throw new Error(`Login failed: ${(await page.locator('body').innerText()).slice(-800)}; page errors: ${errors.join(';')}`) })
  await page.getByRole('button', { name: 'Mở trợ lý AI', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Trợ lý AI', exact: true })
  const runs = []
  let conversationId
  async function ask(query) {
    await page.evaluate(() => {
      window.__assistantPreviewCount = 0
      window.__assistantObserver = new MutationObserver(() => { if (document.querySelector('.assistant-thinking p')?.textContent !== 'Trợ lý đang trả lời…' && document.querySelector('.assistant-thinking p')) window.__assistantPreviewCount++ })
      window.__assistantObserver.observe(document.body, { childList: true, subtree: true, characterData: true })
    })
    await dialog.getByLabel('Câu hỏi học vụ').fill(query)
    const responsePromise = page.waitForResponse(r => r.url().endsWith('/academic/assistant/stream'), { timeout: 90000 })
    await dialog.getByRole('button', { name: 'Gửi', exact: true }).click()
    const response = await responsePromise
    await dialog.getByRole('button', { name: 'Gửi', exact: true }).waitFor({ state: 'visible', timeout: 90000 })
    const saved = await page.evaluate(async id => {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      if (!id) { const conversations = await (await fetch('/api/v1/academic/assistant/conversations', { headers })).json(); id = conversations[0].id }
      const detail = await (await fetch(`/api/v1/academic/assistant/conversations/${id}`, { headers })).json()
      window.__assistantObserver.disconnect()
      return { id, answer: detail.turns.at(-1)?.response, previews: window.__assistantPreviewCount }
    }, conversationId)
    conversationId = saved.id
    const answer = saved.answer
    if (!response.ok() || !answer?.runId || answer.generationStatus !== 'COMPLETED') {
      await page.screenshot({ path: join(output, 'failed-stream.png'), fullPage: true })
      throw new Error(`Assistant failed: ${response.status()} / ${answer?.generationStatus}; ${await dialog.innerText()}`)
    }
    await dialog.getByText(answer.answer, { exact: true }).waitFor()
    runs.push({ runId: answer.runId, conversationId: answer.conversationId, revision: answer.revision, previews: saved.previews, answerType: answer.answerType })
    return answer
  }
  const marker = `NOVA-${Date.now().toString().slice(-6)}`
  const first = await ask(`Ghi nhớ tên dự án tưởng tượng của tôi là ${marker}. Đây chỉ là bài tập viết, hãy xác nhận ngắn gọn.`)
  const second = await ask('Tên dự án tưởng tượng tôi vừa nói là gì? Chỉ nhắc lại tên.')
  if (!second.answer.includes(marker) || first.conversationId !== second.conversationId || second.revision !== 2) throw new Error('Conversation memory failed')
  if (!runs.every(run => run.previews > 0)) throw new Error('No real streaming frames')
  await page.reload()
  await page.getByRole('button', { name: 'Mở trợ lý AI', exact: true }).click()
  await dialog.getByRole('button', { name: 'Lịch sử hội thoại' }).click()
  await dialog.getByRole('button').filter({ hasText: `Ghi nhớ tên dự án tưởng tượng của tôi là ${marker}` }).click()
  await dialog.getByText(second.answer, { exact: true }).waitFor()
  await dialog.getByLabel('Chế độ trợ lý').selectOption('TASK')
  const draft = await ask('Soạn một công việc kiểm thử đăng nhập cho dự án tưởng tượng này, gồm kiểm tra mật khẩu sai và quyền truy cập.')
  if (draft.draft?.kind !== 'TASK' || !draft.draft.title) throw new Error('Task draft missing')
  await dialog.getByLabel('Tiêu đề', { exact: true }).waitFor()
  await dialog.getByLabel('Chế độ trợ lý').selectOption('MEETING')
  const meeting = await ask('Soạn lịch họp rà soát tuần với nội dung tiến độ, vướng mắc và kế hoạch tuần sau.')
  if (meeting.draft?.kind !== 'MEETING') throw new Error('Meeting draft missing')
  await page.screenshot({ path: join(output, 'conversations-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: join(output, 'conversations-mobile.png'), fullPage: true })
  const box = await dialog.boundingBox()
  if (box.width > 390 || box.x < 0) throw new Error('Mobile overflow')
  await dialog.getByRole('button', { name: 'Cuộc trò chuyện mới' }).click()
  await dialog.getByLabel('Câu hỏi học vụ').fill('Hãy viết một bài dài về lịch sử máy tính.')
  await dialog.getByRole('button', { name: 'Gửi', exact: true }).click()
  await dialog.getByRole('button', { name: 'Dừng trả lời' }).click()
  await dialog.getByText('Đã dừng. Mở lại lịch sử nếu câu trả lời vừa kịp lưu.').waitFor()
  if (await dialog.getByRole('button', { name: 'Dừng trả lời' }).count()) throw new Error('Stop did not reset UI')
  const evidence = { runs, memory: true, reloadHistory: true, taskDraft: true, meetingDraft: true, stop: true, mobile: true, errors }
  writeFileSync(join(output, 'checks.json'), JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence))
  if (errors.length) throw new Error('Browser page errors')
} finally { await browser.close() }
