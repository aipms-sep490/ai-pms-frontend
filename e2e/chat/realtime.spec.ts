import { randomUUID } from 'node:crypto'
import { test, expect, type Locator, type Page, type WebSocketRoute } from '@playwright/test'

async function expectInside(element: Locator, container: Locator) {
  await expect.poll(async () => {
    const inner = await element.boundingBox(), outer = await container.boundingBox()
    return !!inner && !!outer && inner.width > 0 && inner.height > 0
      && inner.x >= outer.x - 1 && inner.y >= outer.y - 1
      && inner.x + inner.width <= outer.x + outer.width + 1
      && inner.y + inner.height <= outer.y + outer.height + 1
  }).toBe(true)
}

// Contract fixtures only: all API and hub traffic is intercepted. No real credentials.
test('two authorized clients synchronize, retry a lost reply and clear revoked access', async ({ browser }) => {
  test.setTimeout(90_000)
  const sockets = new Map<Page, WebSocketRoute>()
  const unread = [0, 0], reads: number[] = [], errors: string[] = []
  const messages: Record<string, unknown>[] = []
  let version = 1
  let revoked = false
  let loseResponse = true
  const requests: unknown[] = []
  const roomTitle = 'Đồ án · Trao đổi nhóm liên ngành xây dựng nền tảng thương mại điện tử và chăm sóc khách hàng'
  const members = Array.from({ length: 8 }, (_, index) => ({
    userId: String(index + 1), fullName: index < 2 ? `Giảng viên ${index ? 'B' : 'A'}` : `Thành viên nhóm ${index + 1}`, lastReadSequence: null,
  }))
  const room = (actor = 0) => ({ id: '9', kind: 'PROJECT', title: roomTitle, status: 'OPEN', teamId: '7', projectId: '8', sequence: String(messages.length), version: String(version), updatedAt: new Date().toISOString(), unreadCount: unread[actor], lastMessage: messages.at(-1) ?? null, canSend: true })
  const envelope = () => ({ eventId: randomUUID(), conversationId: '9', version: String(version), schemaVersion: 1 })
  const publish = (event = 'MessagesChanged') => {
    const payload = envelope()
    for (const socket of sockets.values()) socket.send(JSON.stringify({ type: 1, target: event, arguments: [payload] }) + '\x1e')
  }
  const contexts = await Promise.all([
    browser.newContext({ viewport: { width: 1440, height: 1000 } }),
    browser.newContext({ viewport: { width: 375, height: 812 } }),
  ])
  const pages: Page[] = []
  for (let index = 0; index < contexts.length; index++) {
    const page = await contexts[index].newPage()
    page.on('pageerror', error => errors.push(error.message))
    pages.push(page)
    const user = { id: index + 1, email: `fixture${index}@example.test`, fullName: index ? 'Giảng viên B' : 'Giảng viên A', roles: ['LECTURER'] }
    await page.addInitScript(user => {
      const session = { user, accessToken: 'test-only-access', refreshToken: 'test-only-refresh', tokenType: 'Bearer', expiresAtUtc: '2099-01-01T00:00:00Z', refreshTokenExpiresAtUtc: '2099-01-02T00:00:00Z' }
      localStorage.setItem('ai-pms.auth-session', JSON.stringify(session))
      localStorage.setItem('token', session.accessToken)
    }, user)
    await page.route(/http:\/\/127\.0\.0\.1:5188\/api\//, async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname
      const json = (body: unknown, status = 200) => route.fulfill({ status, json: body })
      if (path.endsWith('/auth/me') || path.endsWith('/users/me')) return json(user)
      if (path.endsWith('/auth/me/context')) return json({ user: { ...user, effectiveRoles: ['LECTURER'], grantedPermissions: [] }, academic: { organization: null, department: null, major: null, hasActiveDepartmentScope: true, hasEligibleStudentProfile: false, issues: [] }, currentSemesters: [], selectedSemester: null, periods: [] })
      if (path.endsWith('/dashboards/supervisor')) return json({projects:{items:[],totalCount:0,page:1,totalPages:1}})
      if (path.includes('/upload-policies/')) return json({
        parentType: path.split('/').at(-1), maxBytes: 8 * 1024 * 1024, maxBytesLabel: '8 MB',
        allowedMimeTypes: ['image/jpeg', 'image/png'], allowedExtensions: ['.jpg', '.jpeg', '.png'],
        maxFilesPerRequest: 1, requiresVersionAnchor: false,
      })
      if (!path.includes('/chat/')) return json({ items: [], page: 1, totalPages: 1, totalCount: 0 })
      if (index === 1 && revoked && path.includes('/conversations/9')) return json({ title: 'Hidden resource' }, 404)
      if (path.endsWith('/recipients')) return json({ items: [{ userId: String(2 - index), fullName: index ? 'Giảng viên A' : 'Giảng viên B' }], nextCursor: null, hasMore: false })
      if (path.endsWith('/conversations')) return json({ items: [room(index)], nextCursor: null, hasMore: false })
      if (path.endsWith('/conversations/9')) return json(room(index))
      if (path.endsWith('/members')) return json({ items: members, nextCursor: null, hasMore: false })
      if (path.endsWith('/read')) { reads.push(index); unread[index] = 0; await route.fulfill({ status: 204 }); version++; publish('ReadStateChanged'); return }
      if (path.endsWith('/messages') && req.method() === 'GET') return json({ items: messages.map(message => ({...message,canEdit:message.senderId===String(user.id),canRecall:message.senderId===String(user.id)})), nextCursor: null, hasMore: false })
      if (path.endsWith('/messages') && req.method() === 'POST') {
        const body = req.postDataJSON()
        requests.push(body)
        let canonical = messages.find(m => m.clientMessageId === body.clientMessageId)
        if (!canonical) {
          canonical = { id: String(messages.length + 1), conversationId: '9', sequence: String(messages.length + 1), senderId: String(user.id), senderName: user.fullName, clientMessageId: body.clientMessageId, body: body.body, createdAt: new Date().toISOString(), editedAt: null, recalledAt: null, concurrencyToken: randomUUID(), reply: null, canEdit: false, canRecall: false }
          messages.push(canonical); unread[1 - index]++; version++
        }
        // Commit succeeded but its response and event were lost; retry must reuse the key.
        if (loseResponse) { loseResponse = false; return route.abort('failed') }
        await json(canonical); publish(); return
      }
      return json({ title: 'Unexpected fixture endpoint' }, 404)
    })
    await page.route('**/hubs/chat/negotiate*', route => route.fulfill({ json: { negotiateVersion: 1, connectionId: `fixture-${index}`, connectionToken: `fixture-${index}`, availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text'] }] } }))
    await page.routeWebSocket(/\/hubs\/chat\?/, socket => {
      sockets.set(page, socket)
      socket.onMessage(data => {
        for (const part of String(data).split('\x1e').filter(Boolean)) {
          const payload = JSON.parse(part)
          if (payload.protocol) socket.send('{}\x1e')
          else if (payload.invocationId) socket.send(JSON.stringify({ type: 3, invocationId: payload.invocationId }) + '\x1e')
        }
      })
    })
    await page.goto('/profile')
    await expect(page.getByRole('button', {name:'Mở tin nhắn',exact:true})).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mở trợ lý AI', exact: true })).toBeVisible()
    if (!index) {
      await page.getByRole('button', {name:'Mở tin nhắn',exact:true}).click()
      await expect(page.locator('.chat-dock-toolbar [role=status]')).toHaveText('Đã kết nối realtime')
      await page.locator('.chat-list button').filter({hasText:'Đồ án · Trao đổi nhóm'}).click()
      await expect(page.getByRole('textbox',{name:'Tin nhắn',exact:true})).toBeEnabled()
      await expect(page.getByRole('button', { name: 'Mở trợ lý AI', exact: true })).toBeHidden()
      await expect(page).toHaveURL(/\/profile$/)
    }
  }
  const [sender, receiver] = pages
  const body = '<script>alert(1)</script> Trao đổi realtime qua fixture ' + 'ĐườngDẫnRấtDài'.repeat(18)
  await sender.getByRole('textbox', { name: 'Tin nhắn', exact: true }).fill(body)
  const sendButton = sender.getByRole('button', { name: 'Gửi', exact: true })
  await expect(sendButton).toBeEnabled()
  expect(await sendButton.evaluate(button => {
    const rect = button.getBoundingClientRect()
    return button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
  })).toBe(true)
  await sender.getByRole('button', { name: 'Gửi', exact: true }).click()
  await sender.getByRole('button', { name: 'Gửi lại', exact: true }).click()
  await expect(receiver.getByRole('button',{name:'Mở tin nhắn, 1 tin chưa đọc',exact:true})).toBeVisible()
  expect(reads.filter(actor=>actor===1)).toHaveLength(0)
  await receiver.getByRole('button',{name:'Mở tin nhắn, 1 tin chưa đọc',exact:true}).click()
  await expect(receiver).toHaveURL(/\/profile$/)
  expect(reads.filter(actor=>actor===1)).toHaveLength(0)
  await receiver.locator('.chat-list button').filter({hasText:'Đồ án · Trao đổi nhóm'}).click()
  await expect(receiver.locator('.chat-history article p')).toHaveText([body])
  await receiver.bringToFront()
  await expect.poll(()=>reads.filter(actor=>actor===1).length).toBeGreaterThan(0)
  await expect(receiver.locator('.chat-launcher-badge')).toHaveCount(0)
  expect(requests[0]).toEqual(requests[1])
  expect(messages).toHaveLength(1)
  await sender.getByRole('textbox',{name:'Tin nhắn',exact:true}).fill('Bản nháp đi cùng trang')
  await sender.getByRole('button',{name:'Thu nhỏ tin nhắn'}).click()
  await expect(sender.getByRole('button', { name: 'Mở trợ lý AI', exact: true })).toBeVisible()
  await sender.getByRole('link',{name:'Lịch tổng hợp',exact:true}).click()
  await expect(sender).toHaveURL(/\/calendar$/)
  await sender.getByRole('button',{name:'Mở lại tin nhắn',exact:true}).click()
  await expect(sender.getByRole('textbox',{name:'Tin nhắn',exact:true})).toHaveValue('Bản nháp đi cùng trang')
  await expect(sender.getByRole('button', { name: 'Mở trợ lý AI', exact: true })).toBeHidden()
  await sender.getByRole('textbox',{name:'Tin nhắn',exact:true}).fill('OK')
  await sender.getByRole('button',{name:'Gửi',exact:true}).click()
  await expect(receiver.locator('.chat-history article')).toHaveCount(2)
  // Duplicate delivery refetches no duplicate message.
  publish(); publish()
  await expect(receiver.locator('.chat-history article')).toHaveCount(2)
  for (const [index, page] of pages.entries()) {
    const info = page.locator('.chat-info')
    const infoToggle = info.locator('summary').filter({ hasText: 'Thông tin cuộc trò chuyện' })
    await expect(info).not.toHaveAttribute('open', '')
    const composer = page.getByRole('textbox', { name: 'Tin nhắn', exact: true })
    await composer.fill('Bản nháp khi xem thành viên')
    await infoToggle.click()
    await expect(info).toHaveAttribute('open', '')
    await expect(info.getByText('Thành viên nhóm 8', { exact: false })).toBeVisible()
    await expect(info.locator('label').filter({ hasText: 'Thông báo' })).toBeVisible()
    await infoToggle.click()
    await expect(composer).toHaveValue('Bản nháp khi xem thành viên')
    await composer.press('Shift+Enter')
    await expect(composer).toHaveValue('Bản nháp khi xem thành viên\n')
    expect(messages).toHaveLength(2)
    await composer.fill('')
    const shortMessage = page.locator('[data-message-id="2"]')
    const reaction = shortMessage.locator('.chat-message-actions').getByRole('button', { name: 'Thả cảm xúc', exact: true })
    const reply = shortMessage.getByRole('button', { name: 'Trả lời tin nhắn', exact: true })
    await reaction.scrollIntoViewIfNeeded()
    const reactionBounds = await reaction.boundingBox(), replyBounds = await reply.boundingBox()
    expect(reactionBounds).not.toBeNull(); expect(replyBounds).not.toBeNull()
    expect(Math.abs(reactionBounds!.y - replyBounds!.y)).toBeLessThanOrEqual(4)
    await reaction.click()
    const picker = shortMessage.getByRole('group', { name: 'Chọn cảm xúc' })
    await expect(picker).toBeVisible()
    await expectInside(picker, page.locator('.chat-history'))
    const pickerBounds = await picker.boundingBox(), panelBounds = await page.locator('.chat-dock-panel').boundingBox()
    expect(pickerBounds!.x).toBeGreaterThanOrEqual(panelBounds!.x)
    expect(pickerBounds!.x + pickerBounds!.width).toBeLessThanOrEqual(panelBounds!.x + panelBounds!.width)
    await page.keyboard.press('Escape')
    await expect(picker).toBeHidden()
    await expect(page.locator('.chat-dock-panel')).toBeVisible()
    await reply.click()
    await expect(composer).toBeFocused()
    await composer.fill('Giữ bản nháp trả lời')
    await page.locator('.chat-reply-draft').getByRole('button', { name: 'Hủy', exact: true }).click()
    await expect(composer).toHaveValue('Giữ bản nháp trả lời')
    await composer.fill('')
    if (!index) {
      const menu = shortMessage.locator('.chat-message-more')
      await menu.locator('summary').click()
      await expect(menu.getByRole('button', { name: 'Sửa tin nhắn' })).toBeVisible()
      await expectInside(menu.locator('.chat-message-menu'), page.locator('.chat-history'))
      await page.keyboard.press('Escape')
      await expect(menu).not.toHaveAttribute('open', '')
      await expect(page.locator('.chat-dock-panel')).toBeVisible()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(await page.locator('.chat-dock-panel .chat-header').evaluate(header => header.scrollWidth <= header.clientWidth)).toBe(true)
    for (const action of await page.locator('.chat-message-actions button:visible, .chat-message-more>summary:visible').all()) { const bounds = await action.boundingBox(); expect(bounds?.height).toBeGreaterThanOrEqual(44); expect(bounds?.width).toBeGreaterThanOrEqual(44) }
    await page.screenshot({ path: `test-results/chat-${index ? 'mobile' : 'desktop'}.png`, fullPage: true })
    await page.locator('.chat-dock-panel').screenshot({ path: `test-results/chat-${index ? 'mobile' : 'desktop'}-panel.png` })
  }
  // Later messages provide real scroll space beneath the short message under test.
  for (let index = 3; index <= 8; index++) messages.push({
    ...messages[1], id: String(index), sequence: String(index), clientMessageId: randomUUID(),
    body: `Nội dung trao đổi tiếp theo ${index}`, concurrencyToken: randomUUID(),
  })
  version++; publish()
  for (const [index, page] of pages.entries()) {
    const history = page.locator('.chat-history')
    await expect(history.locator('article')).toHaveCount(8)
    const message = history.locator('[data-message-id="2"]')
    await message.locator('.chat-message-actions').evaluate(actions => {
      const history = actions.closest('.chat-history')!
      history.scrollTop += actions.getBoundingClientRect().top - history.getBoundingClientRect().top - 6
    })
    const actions = await message.locator('.chat-message-actions').boundingBox(), historyBounds = await history.boundingBox()
    expect(actions!.y - historyBounds!.y).toBeGreaterThanOrEqual(0)
    expect(actions!.y - historyBounds!.y).toBeLessThanOrEqual(8)
    await message.getByRole('button', { name: 'Thả cảm xúc', exact: true }).click()
    await expectInside(message.getByRole('group', { name: 'Chọn cảm xúc' }), history)
    await page.keyboard.press('Escape')
    if (!index) {
      const menu = message.locator('.chat-message-more')
      await menu.locator('summary').click()
      await expectInside(menu.locator('.chat-message-menu'), history)
      await page.keyboard.press('Escape')
    }
  }
  await receiver.setViewportSize({ width: 375, height: 480 })
  const mobilePanel = receiver.locator('.chat-dock-panel')
  await expectInside(receiver.getByRole('textbox', { name: 'Tin nhắn', exact: true }), mobilePanel)
  await expectInside(receiver.getByRole('button', { name: 'Gửi', exact: true }), mobilePanel)
  expect(await mobilePanel.evaluate(panel => {
    const rect = panel.getBoundingClientRect()
    return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight
  })).toBe(true)
  await receiver.setViewportSize({ width: 375, height: 812 })
  await sender.setViewportSize({ width: 760, height: 650 })
  await expect(sender.locator('.chat-dock-panel')).toBeVisible()
  await expect(sender.getByRole('button', { name: 'Mở trợ lý AI', exact: true })).toBeHidden()
  expect(await sender.locator('.chat-dock-panel').evaluate(panel => {
    const rect = panel.getBoundingClientRect()
    return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight
  })).toBe(true)
  await sender.screenshot({ path: 'test-results/chat-narrow-desktop.png', fullPage: true })
  await sender.setViewportSize({ width: 1440, height: 1000 })
  await sender.getByRole('button', { name: 'Đóng tin nhắn', exact: true }).click()
  await expect(sender.getByRole('button', { name: 'Mở trợ lý AI', exact: true })).toBeVisible()
  await sender.getByRole('button', { name: 'Mở tin nhắn', exact: true }).click()
  await sender.locator('.chat-list button').filter({ hasText: roomTitle }).click()
  await receiver.getByRole('textbox', { name: 'Tin nhắn', exact: true }).fill('Bản nháp riêng')
  revoked = true
  sockets.get(receiver)!.send(JSON.stringify({ type: 1, target: 'AccessRevoked', arguments: [{ schemaVersion: 1, conversationId: '9' }] }) + '\x1e')
  await expect(receiver.locator('.chat-history article')).toHaveCount(0)
  await expect(receiver.getByRole('textbox', { name: 'Tin nhắn', exact: true })).toHaveValue('')
  await expect(receiver.getByRole('textbox', { name: 'Tin nhắn', exact: true })).toBeDisabled()
  await sender.getByRole('button',{name:'Về danh sách trò chuyện'}).click()
  await sender.getByRole('link',{name:'Mở trang tin nhắn'}).click()
  await sender.locator('.chat-list button').filter({hasText:'Đồ án · Trao đổi nhóm'}).click()
  await expect(sender).toHaveURL(/\/messages\/9$/)
  await expect(sender.getByRole('textbox',{name:'Tin nhắn',exact:true})).toBeEnabled()
  await expect(sender.getByRole('button', { name: 'Mở trợ lý AI', exact: true })).toBeHidden()
  await sender.getByRole('textbox', { name: 'Tin nhắn', exact: true }).fill('Bản nháp trên trang tin nhắn')
  expect(await sender.getByRole('button', { name: 'Gửi', exact: true }).evaluate(button => {
    const rect = button.getBoundingClientRect()
    return button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
  })).toBe(true)
  await sender.getByRole('textbox', { name: 'Tin nhắn', exact: true }).fill('')
  const fullPageShortMessage = sender.locator('[data-message-id="2"]')
  const fullPageReaction = fullPageShortMessage.getByRole('button', { name: 'Thả cảm xúc', exact: true })
  const fullPageReply = fullPageShortMessage.getByRole('button', { name: 'Trả lời tin nhắn', exact: true })
  await fullPageReaction.scrollIntoViewIfNeeded()
  expect(Math.abs((await fullPageReaction.boundingBox())!.y - (await fullPageReply.boundingBox())!.y)).toBeLessThanOrEqual(4)
  await sender.locator('.chat-shell').screenshot({ path: 'test-results/chat-full-page.png' })
  expect(errors).toEqual([])
  await Promise.all(contexts.map(context => context.close()))
})
