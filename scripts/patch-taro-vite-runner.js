const fs = require('fs')
const path = require('path')

const target = path.join(
  process.cwd(),
  'node_modules',
  '@tarojs',
  'vite-runner',
  'dist',
  'mini',
  'emit.js'
)

if (!fs.existsSync(target)) {
  console.log('[patch-taro-vite-runner] target not found, skip')
  process.exit(0)
}

const source = fs.readFileSync(target, 'utf8')

if (source.includes('bundle[p] = { type: \'asset\'')) {
  console.log('[patch-taro-vite-runner] already patched')
  process.exit(0)
}

const from = `                                    const chunk = bundle[p];
                                    if (chunk.type === 'asset') {
                                        chunk.source = newValue.source();
                                    }
                                    else {
                                        chunk.code = newValue.source();
                                    }
                                    return true;`

const to = `                                    let chunk = bundle[p];
                                    if (!chunk) {
                                        chunk = bundle[p] = { type: 'asset', fileName: p, name: p, source: newValue.source() };
                                        return true;
                                    }
                                    if (chunk.type === 'asset') {
                                        chunk.source = newValue.source();
                                    }
                                    else {
                                        chunk.code = newValue.source();
                                    }
                                    return true;`

if (!source.includes(from)) {
  console.error('[patch-taro-vite-runner] target snippet not found')
  process.exit(1)
}

fs.writeFileSync(target, source.replace(from, to), 'utf8')
console.log('[patch-taro-vite-runner] patched emit.js')
