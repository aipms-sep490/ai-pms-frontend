// Run from the frontend root: node docs/fe2/ui-preview/build.mjs
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'

const here = dirname(fileURLToPath(import.meta.url))
const result = await build({
  configFile: false, root: resolve(here, '../../..'), envDir: false,
  plugins: [react(), tailwindcss()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production'), 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1'), 'import.meta.env.VITE_DATA_MODE': JSON.stringify('api'), 'import.meta.env.VITE_ENABLE_RESULT_CORRECTION': JSON.stringify('true') },
  build: { write: false, sourcemap: false, minify: true, cssCodeSplit: false, assetsInlineLimit: Infinity, lib: { entry: resolve(here, 'preview.tsx'), name: 'FE2InterfacePreview', formats: ['iife'] } },
})
const output = (Array.isArray(result) ? result[0] : result).output
const js = output.filter(file => file.type === 'chunk').map(file => file.code).join('\n').replace(/<\/script/gi, '<\\/script')
const css = output.filter(file => file.type === 'asset' && file.fileName.endsWith('.css')).map(file => String(file.source)).join('\n').replace(/<\/style/gi, '<\\/style')
const html = '<!doctype html>\n<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; frame-src blob:; connect-src \'none\'; base-uri \'none\'; form-action \'none\'"><title>FE2 · Xem và thử giao diện AI-PMS</title><style>' + css + '</style></head><body><div id="root"></div><noscript>Bật JavaScript để mở các màn hình FE2.</noscript><script>' + js + '</script></body></html>\n'
const target = resolve(here, '../FE2_SELF_TEST_GUIDE_2026-10-15.html')
const license = await readFile(resolve(here, 'ICONS_LICENSE.txt'), 'utf8')
await writeFile(target, html.replace('<html lang="vi">', '<!-- Google Material Symbols subset:\n' + license.trim().replace(/-->/g, '-- >') + '\n-->\n<html lang="vi">'), 'utf8')
console.log(`Created standalone UI preview: ${Buffer.byteLength(html)} bytes; ${output.length} bundled outputs.`)
