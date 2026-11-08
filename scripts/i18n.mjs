// Translation helper.
//   node scripts/i18n.mjs check            -> lists texts without translation (exit code 1 if any)
//   node scripts/i18n.mjs todo <lang> <out> -> writes "number<TAB>German text" for missing texts
//   node scripts/i18n.mjs merge <lang> <todo> <done> -> adds "number<TAB>translation" lines to src/i18n/<lang>/
// Texts are collected from every t('…') call in src and from the data that goes through L().
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, relative, basename } from 'node:path'
import { createServer } from 'vite'

const ROOT = new URL('..', import.meta.url).pathname
const SRC = join(ROOT, 'src')
const LANGS = ['en', 'es']

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : []
  })
}

// does the text need a translation at all? (moves, numbers and symbols do not)
function needs(s) {
  const rest = s
    .replace(/\{\w+\}/g, ' ')
    .replace(/\b\d+\.+/g, ' ')
    .replace(/(^|\s)(O-O(-O)?|0-0(-0)?)(?=\s|$|[+#,.])/g, ' ')
    .replace(/(^|[^A-Za-zÀ-ÿ])[KDTLSQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=?[DTLSQRBN])?[+#]?/g, ' ')
  return /[A-Za-zÄÖÜäöüß]{2,}/.test(rest)
}

function staticKeys() {
  const out = new Map()
  for (const f of walk(SRC)) {
    const code = readFileSync(f, 'utf8')
    const re = /\btk?\(\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)")/g
    let m
    while ((m = re.exec(code))) {
      const raw = m[1] ?? m[2]
      const s = raw.replace(/\\(.)/g, (_, c) => (c === 'n' ? '\n' : c))
      if (!out.has(s)) out.set(s, relative(SRC, f))
    }
  }
  return out
}

async function dynamicKeys() {
  // minimal browser stubs for modules that touch the DOM when they load
  const store = { settings: JSON.stringify({ lang: 'en' }) }
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem() {}, removeItem() {}, key: () => null, length: 0 }
  globalThis.document = { documentElement: { dataset: {}, style: { setProperty() {} } }, querySelector: () => null, hidden: false, addEventListener() {} }
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' })
  globalThis.window = globalThis
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
  const out = new Map()
  try {
    const i18n = await server.ssrLoadModule('/src/i18n/index.ts')
    i18n.setLanguage('en', {})
    const mods = [
      ...readdirSync(join(SRC, 'data')).filter((f) => f.endsWith('.ts')).map((f) => '/src/data/' + f),
      '/src/bots.ts', '/src/games/levels.ts',
      ...readdirSync(join(SRC, 'lib')).filter((f) => f.endsWith('.ts')).map((f) => '/src/lib/' + f),
      // screens and games keep a few tables in L(...) too
      ...['screens', 'games', 'components'].flatMap((d) => readdirSync(join(SRC, d)).filter((f) => /\.tsx?$/.test(f)).map((f) => `/src/${d}/` + f)),
    ]
    for (const m of mods) {
      const before = new Set(i18n.missingKeys())
      await server.ssrLoadModule(m)
      for (const k of i18n.missingKeys()) if (!before.has(k) && !out.has(k)) out.set(k, m.slice(5))
    }
  } finally {
    await server.close()
  }
  return out
}

async function allKeys() {
  const keys = new Map([...(await dynamicKeys()), ...staticKeys()])
  for (const k of [...keys.keys()]) if (!needs(k)) keys.delete(k)
  return keys
}

function dictFile(origin) {
  const b = basename(origin).replace(/\.(ts|tsx)$/, '')
  if (/^(openingTheory|openings|learnTheory|lessons|endgames|bots)$/.test(b)) return b
  if (origin.startsWith('games/')) return 'games'
  if (origin.startsWith('lib/')) return 'lib'
  return 'ui'
}

function loadDict(lang) {
  const dir = join(SRC, 'i18n', lang)
  const files = {}
  if (existsSync(dir)) for (const f of readdirSync(dir)) if (f.endsWith('.json')) files[f.slice(0, -5)] = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  return files
}

function saveDict(lang, files) {
  const dir = join(SRC, 'i18n', lang)
  mkdirSync(dir, { recursive: true })
  for (const [name, d] of Object.entries(files)) writeFileSync(join(dir, name + '.json'), JSON.stringify(d, null, 1) + '\n')
}

const flat = (files) => Object.assign({}, ...Object.values(files))
const id = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10)

const [cmd, lang, a, b] = process.argv.slice(2)
const keys = await allKeys()

if (cmd === 'check') {
  let bad = 0
  for (const l of LANGS) {
    const d = flat(loadDict(l))
    const miss = [...keys.keys()].filter((k) => d[k] === undefined)
    const unused = Object.keys(d).filter((k) => !keys.has(k))
    // placeholders must survive the translation
    const ph = [...keys.keys()].filter((k) => d[k] !== undefined && [...k.matchAll(/\{\w+\}/g)].some((m) => !d[k].includes(m[0])))
    console.log(`${l}: ${keys.size} Texte, ${miss.length} fehlen, ${unused.length} unbenutzt, ${ph.length} mit fehlendem Platzhalter`)
    for (const k of miss.slice(0, 15)) console.log('  fehlt:', keys.get(k), '|', k.slice(0, 90))
    for (const k of ph) console.log('  Platzhalter:', k.slice(0, 90))
    if (process.env.VERBOSE) for (const k of unused) console.log('  unbenutzt:', k.slice(0, 90))
    bad += miss.length + ph.length
  }
  process.exit(bad ? 1 : 0)
} else if (cmd === 'todo') {
  const d = flat(loadDict(lang))
  const miss = [...keys.entries()].filter(([k]) => d[k] === undefined)
  const filter = b ? new RegExp(b) : null
  const list = miss.filter(([, o]) => !filter || filter.test(o))
  writeFileSync(a, list.map(([k, o], i) => `${i + 1}\t${o}\t${k.replace(/\n/g, '\\n')}`).join('\n') + '\n')
  console.log(`${list.length} Texte nach ${a}`)
} else if (cmd === 'merge') {
  const todo = new Map(readFileSync(a, 'utf8').split('\n').filter(Boolean).map((l) => { const [n, o, ...k] = l.split('\t'); return [n, { origin: o, key: k.join('\t').replace(/\\n/g, '\n') }] }))
  const files = loadDict(lang)
  let n = 0
  for (const line of readFileSync(b, 'utf8').split('\n')) {
    const m = /^(\d+)\t(.*)$/.exec(line)
    if (!m) continue
    const item = todo.get(m[1])
    if (!item) { console.log('unbekannte Nummer', m[1]); continue }
    const f = dictFile(item.origin)
    files[f] ??= {}
    files[f][item.key] = m[2].replace(/\\n/g, '\n')
    n++
  }
  saveDict(lang, files)
  console.log(`${n} Übersetzungen übernommen`)
} else if (cmd === 'keys') {
  for (const [k, o] of keys) console.log(id(k), o, k.slice(0, 80))
} else {
  console.log('check | todo <lang> <out> [originFilter] | merge <lang> <todo> <done>')
}
