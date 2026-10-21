import { createServer } from 'vite'

// Process-only overrides take precedence over .env without rewriting local configuration.
Object.assign(process.env, {
  VITE_DATA_MODE: 'api',
  VITE_USE_MOCK_REVIEW_GATES: 'false',
  VITE_API_BASE_URL: '/api/v1',
  VITE_API_PROXY_TARGET: 'https://api-staging.khaidz.com',
})
const server = await createServer({ server: { host: 'localhost', port: 5175, strictPort: true } })
await server.listen()
server.printUrls()
