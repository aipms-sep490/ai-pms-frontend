import { randomUUID } from 'node:crypto'
import { test, expect, type Page, type WebSocketRoute } from '@playwright/test'

// Contract fixtures only: all API and hub traffic is intercepted. No real credentials.
test('two authorized clients synchronize, retry a lost reply and clear revoked access', async ({ browser }) => {
  const sockets = new Map<Page, WebSocketRoute>()
  const unread = [0, 0], reads: number[] = [], errors: string[] = []
  const messages: Record<string, unknown>[] = []
  let version = 1
  let revoked = false
  let loseResponse = true
  const requests: unknown[] = []
  const room = (actor = 0) => ({ id: '9', kind: 'PROJECT', title: 'Đồ án · Trao đổi nhóm', status: 'OPEN', teamId: '7', projectId: '8', sequence: String(messages.length), version: String(version), updatedAt: new Date().toISOString(), unreadCount: unread[actor], lastMessage: messages.at(-1) ?? null, canSend: true })
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
      if (!path.includes('/chat/')) return json({ items: [], page: 1, totalPages: 1, totalCount: 0 })
      if (index === 1 && revoked && path.includes('/conversations/9')) return json({ title: 'Hidden resource' }, 404)
      if (path.endsWith('/recipients')) return json({ items: [{ userId: String(2 - index), fullName: index ? 'Giảng viên A' : 'Giảng viên B' }], nextCursor: null, hasMore: false })
      if (path.endsWith('/conversations')) return json({ items: [room(index)], nextCursor: null, hasMore: false })
      if (path.endsWith('/conversations/9')) return json(room(index))
      if (path.endsWith('/members')) return json({ items: [{ userId: '1', fullName: 'Giảng viên A', lastReadSequence: null }, { userId: '2', fullName: 'Giảng viên B', lastReadSequence: null }], nextCursor: null, hasMore: false })
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
    if (!index) {
      await page.getByRole('button', {name:'Mở tin nhắn',exact:true}).click()
      await expect(page.locator('.chat-dock-toolbar [role=status]')).toHaveText('Đã kết nối realtime')
      await page.locator('.chat-list button').filter({hasText:'Đồ án · Trao đổi nhóm'}).click()
      await expect(page.getByRole('textbox',{name:'Tin nhắn',exact:true})).toBeEnabled()
      await expect(page).toHaveURL(/\/profile$/)
    }
  }
  const [sender, receiver] = pages
  const body = '<script>alert(1)</script> Trao đổi realtime qua fixture'
  await sender.getByRole('textbox', { name: 'Tin nhắn', exact: true }).fill(body)
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
  await sender.getByRole('link',{name:'Lịch tổng hợp',exact:true}).click()
  await expect(sender).toHaveURL(/\/calendar$/)
  await sender.getByRole('button',{name:'Mở lại tin nhắn',exact:true}).click()
  await expect(sender.getByRole('textbox',{name:'Tin nhắn',exact:true})).toHaveValue('Bản nháp đi cùng trang')
  await sender.getByRole('textbox',{name:'Tin nhắn',exact:true}).fill('Tin thứ hai khi dock đang mở')
  await sender.getByRole('button',{name:'Gửi',exact:true}).click()
  await expect(receiver.locator('.chat-history article')).toHaveCount(2)
  // Duplicate delivery refetches no duplicate message.
  publish(); publish()
  await expect(receiver.locator('.chat-history article')).toHaveCount(2)
  for (const [index, page] of pages.entries()) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    for (const action of await page.locator('.chat-message-actions button').all()) { const bounds = await action.boundingBox(); expect(bounds?.height).toBeGreaterThanOrEqual(44); expect(bounds?.width).toBeGreaterThanOrEqual(44) }
    await page.screenshot({ path: `test-results/chat-${index ? 'mobile' : 'desktop'}.png`, fullPage: true })
  }
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
  expect(errors).toEqual([])
  await Promise.all(contexts.map(context => context.close()))
})
