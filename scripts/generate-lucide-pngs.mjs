import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const icons = {
  'chart-column-increasing': '#287fe5',
  'receipt-text': '#697789',
  'bell-ring': '#ff3f48',
  'bottle-wine': '#2f80ed',
  'wallet-cards': '#287fe5',
  'package-search': '#6b5cff',
  'arrow-down-up': '#2f80ed',
  'users-round': '#3f7df4',
  warehouse: '#35a853',
  'shopping-bag': '#ff8b2c',
  wallet: '#7c5ce8',
  'package-plus': '#287fe5',
  'package-x': '#ff8b2c',
  'triangle-alert': '#ff9d2d',
  clock: '#287fe5',
  settings: '#17202a',
  'file-text': '#287fe5',
  pencil: '#17202a',
  'image-plus': '#687385',
  x: '#ffffff'
}

const nodes = JSON.parse(readFileSync(new URL('../node_modules/lucide-static/icon-nodes.json', import.meta.url), 'utf8'))
const outputDir = new URL('../src/assets/icons/', import.meta.url)
const tempDir = mkdtempSync(join(tmpdir(), 'tower-lucide-'))
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

function renderNode([tag, attrs]) {
  const attributes = Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')
  return `<${tag} ${attributes}/>`
}

mkdirSync(outputDir, { recursive: true })

try {
  Object.entries(icons).forEach(([name, color]) => {
    const body = nodes[name]
    if (!body) throw new Error(`Unknown Lucide icon: ${name}`)

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body.map(renderNode).join('')}</svg>`
    const svgPath = join(tempDir, `${name}.svg`)
    const pngPath = fileURLToPath(new URL(`${name}.png`, outputDir))
    writeFileSync(svgPath, svg)
    execFileSync(
      chromePath,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-sandbox',
        '--force-device-scale-factor=1',
        '--default-background-color=00000000',
        '--window-size=96,96',
        `--screenshot=${pngPath}`,
        pathToFileURL(svgPath).href
      ],
      { stdio: 'ignore' }
    )
  })
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
