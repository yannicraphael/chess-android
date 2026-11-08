// Languages of the app. German is the source language: every text in the code is German and
// is looked up in the dictionary of the chosen language (src/i18n/<lang>/*.json, German text ->
// translation). Missing entries fall back to German. The language is read once at start-up;
// changing it reloads the app, so texts built when a module loads are translated too.

export type Lang = 'de' | 'en' | 'es'

export const LANGS: { id: Lang; name: string; sub: string }[] = [
  { id: 'de', name: 'Deutsch', sub: 'K D T L S' },
  { id: 'en', name: 'English', sub: 'K Q R B N' },
  { id: 'es', name: 'Español', sub: 'R D T A C' },
]

const LOCALES: Record<Lang, string> = { de: 'de-DE', en: 'en-GB', es: 'es-ES' }

// device language on the very first start (friends with an English or Spanish phone)
export function deviceLang(): Lang {
  try {
    const l = (navigator.languages?.[0] ?? navigator.language ?? '').slice(0, 2).toLowerCase()
    if (l === 'en' || l === 'es') return l
  } catch { /* ignore */ }
  return 'de'
}

function readLang(): Lang {
  try {
    const s = JSON.parse(localStorage.getItem('settings') ?? 'null')
    if (s && (s.lang === 'de' || s.lang === 'en' || s.lang === 'es')) return s.lang
  } catch { /* ignore */ }
  return deviceLang()
}

export let lang: Lang = readLang()
export const locale = () => LOCALES[lang]

// ---------- chess notation ----------
// piece letters: English SAN uses K Q R B N
const LETTERS: Record<Lang, Record<string, string>> = {
  de: { K: 'K', Q: 'D', R: 'T', B: 'L', N: 'S' },
  en: { K: 'K', Q: 'Q', R: 'R', B: 'B', N: 'N' },
  es: { K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' },
}
const FROM_DE: Record<string, string> = { K: 'K', D: 'Q', T: 'R', L: 'B', S: 'N' }

// Figurine notation (♘f3) is the same in every language. U+FE0E keeps the symbols as text
// instead of coloured emoji on phones.
const FIG: Record<string, string> = { K: '♔\uFE0E', Q: '♕\uFE0E', R: '♖\uFE0E', B: '♗\uFE0E', N: '♘\uFE0E' }
export type Notation = 'figures' | 'letters'
function readNotation(): Notation {
  try {
    const s = JSON.parse(localStorage.getItem('settings') ?? 'null')
    if (s && s.notation === 'letters') return 'letters'
  } catch { /* ignore */ }
  return 'figures'
}
export let notation: Notation = readNotation()
// for scripts and tests
export function setNotation(n: Notation) { notation = n }

// English SAN (Nf3, exd8=Q) in the notation of the app
export function fmtSan(san: string, l: Lang = lang) {
  return san.replace(/[KQRBN]/g, (c) => (notation === 'figures' ? FIG[c] : LETTERS[l][c]))
}

// Moves written in German notation inside a text (Sf3, Lxc6, Tad1, e8D, =D) -> app notation.
// Only touches tokens that are moves: a piece letter right before a square, or a promotion.
// Translations may also use the letters of their own language; with figurines those become
// symbols too.
function swapLetters(text: string, from: Record<string, string>, to: (en: string) => string) {
  const cls = '[' + Object.keys(from).join('') + ']'
  return text
    .replace(new RegExp('(^|[^A-Za-zÀ-ÿ])(' + cls + ')([a-h]?[1-8]?x?[a-h][1-8])', 'g'), (_, pre, p, rest) => pre + to(from[p]) + rest)
    .replace(new RegExp('([a-h][18])(=?)(' + cls + ')(?![A-Za-zÀ-ÿ])', 'g'), (_, sq, eq, p) => sq + eq + to(from[p]))
}
const invert = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([en, x]) => [x, en]))
export function deNotation(text: string, l: Lang = lang) {
  let s = l === 'de' ? text : swapLetters(text, FROM_DE, (en) => LETTERS[l][en])
  if (notation === 'figures') s = swapLetters(s, invert(LETTERS[l]), (en) => FIG[en])
  return s
}

// ---------- dictionary ----------
let dict: Record<string, string> = {}
const missing = new Set<string>()
export const missingKeys = () => [...missing]

const files = import.meta.glob<{ default: Record<string, string> }>('./*/*.json')

export async function loadLanguage() {
  if (lang === 'de') return
  const own = Object.keys(files).filter((p) => p.startsWith(`./${lang}/`))
  const parts = await Promise.all(own.map((p) => files[p]()))
  dict = Object.assign({}, ...parts.map((m) => m.default))
}

// for scripts and tests
export function setLanguage(l: Lang, d: Record<string, string> = {}) {
  lang = l
  dict = d
  missing.clear()
}

function lookup(s: string): string {
  if (!s) return s
  if (lang === 'de') return notation === 'figures' ? deNotation(s) : s
  const v = dict[s]
  if (v !== undefined) return deNotation(v)
  missing.add(s)
  return deNotation(s)
}

type Params = Record<string, string | number | null | undefined>

// Translates a German text. Placeholders like {name} are filled from `p`.
export function t(s: string, p?: Params): string {
  const out = lookup(s)
  if (!p) return out
  return out.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(p[k] ?? '') : m))
}

// Marks a German text that is stored as it is and translated when shown (game results)
export const tk = (s: string) => s

// Translates every text inside a data structure (lessons, theory, badges, ...). Keys that hold
// moves, positions or ids are left alone.
const SKIP = new Set(['id', 'fen', 'moves', 'after', 'move', 'answer', 'accept', 'icon', 'theme', 'ref', 'group', 'side', 'look',
  'cc', 'tone', 'style', 'from', 'to', 'color', 'marks', 'swatch', 'filter', 'variants', 'heroPly', 'stars', 'light', 'dark'])

// enum-like string values (MiniGame.kind, Endgame.goal); the same key names hold texts elsewhere (TONE_LINES.kind)
const SKIP_STRING = new Set(['kind', 'goal'])

export function L<T>(data: T): T {
  if (lang === 'de' && notation === 'letters') return data
  const walk = (v: unknown, key?: string): unknown => {
    if (key && (SKIP.has(key) || (SKIP_STRING.has(key) && typeof v === 'string'))) return v
    if (typeof v === 'string') return lookup(v)
    if (Array.isArray(v)) return v.map((x) => walk(x))
    if (v && typeof v === 'object') {
      const o: Record<string, unknown> = {}
      for (const [k, x] of Object.entries(v)) o[k] = walk(x, k)
      return o
    }
    return v
  }
  return walk(data) as T
}

// numbers with the decimal separator of the language
export const decimal = (s: string) => (lang === 'en' ? s : s.replace('.', ','))

// a quoted text with the quotation marks of the language
export const quote = (s: string) => (lang === 'en' ? `“${s}”` : lang === 'es' ? `«${s}»` : `„${s}“`)

// "a, b und c"
export function joinList(list: string[]) {
  if (list.length <= 1) return list.join('')
  return t('{a} und {b}', { a: list.slice(0, -1).join(', '), b: list[list.length - 1] })
}
