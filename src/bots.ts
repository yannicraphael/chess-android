import { OPENINGS } from './data/openings'
import { Chess } from 'chess.js'
import { engine } from './engine/stockfish'
import botData from './data/bots.json'

export type ChatEvent =
  | 'greet' | 'botCapture' | 'playerCapture' | 'botCheck' | 'playerCheck'
  | 'playerBlunder' | 'playerStrong' | 'botWinning' | 'botLosing' | 'chatter'
  | 'takeback' | 'hint' | 'botWins' | 'botLoses' | 'draw'

export type Tone = 'nett' | 'frech' | 'lehrer' | 'ehrgeizig' | 'kind' | 'maschine'

export interface Bot {
  id: string
  name: string
  rating: number
  cc: string // country code for the flag
  group: GroupId
  title: string // short tagline
  bio: string
  greet: string | null
  tone: Tone | null // null = the bot does not comment (real players, engine)
  avatar: string | null // url of the portrait, null = monogram / engine icon
  style?: 'attack' | 'trade' | null // small preference for checks/captures among good moves
  chatty?: number // 0..1, how often the bot comments on ordinary events
  // engine settings (derived from the rating)
  skill: number
  depth: number
  multiPv: number
  blunder: number // chance of playing a completely random legal move
  temperature: number // how strongly the bot prefers better moves (lower = sharper)
}

export type GroupId = 'neu' | 'anfaenger' | 'fortgeschritten' | 'turnier' | 'meister' | 'top' | 'engine'

export const BOT_GROUPS: { id: GroupId; name: string }[] = [
  { id: 'neu', name: 'Neu im Schach' },
  { id: 'anfaenger', name: 'Anfänger' },
  { id: 'fortgeschritten', name: 'Fortgeschrittene' },
  { id: 'turnier', name: 'Turnierspieler' },
  { id: 'meister', name: 'Meister' },
  { id: 'top', name: 'Topspieler' },
]

// Engine settings by playing strength, interpolated between these anchor points
const ANCHORS: [number, number, number, number, number, number][] = [
  // rating, skill, depth, multiPv, blunder, temperature
  [100, 0, 1, 12, 0.75, 900],
  [250, 0, 1, 10, 0.5, 600],
  [400, 0, 1, 8, 0.35, 400],
  [550, 0, 1, 7, 0.25, 320],
  [700, 1, 2, 6, 0.18, 250],
  [850, 2, 3, 6, 0.12, 190],
  [1000, 3, 4, 5, 0.08, 140],
  [1150, 4, 5, 5, 0.06, 110],
  [1300, 6, 6, 4, 0.04, 80],
  [1450, 8, 8, 4, 0.025, 60],
  [1600, 10, 9, 3, 0.015, 40],
  [1800, 12, 10, 3, 0.008, 28],
  [2000, 15, 12, 2, 0, 15],
  [2200, 17, 14, 2, 0, 10],
  [2500, 19, 16, 2, 0, 5],
  [2800, 20, 18, 1, 0, 2],
  [3200, 20, 22, 1, 0, 0],
]

export function strength(rating: number) {
  const r = Math.max(ANCHORS[0][0], Math.min(rating, ANCHORS[ANCHORS.length - 1][0]))
  let i = 0
  while (i < ANCHORS.length - 2 && ANCHORS[i + 1][0] < r) i++
  const [r0, ...a] = ANCHORS[i]
  const [r1, ...b] = ANCHORS[i + 1]
  const t = (r - r0) / (r1 - r0)
  const v = a.map((x, k) => x + (b[k] - x) * t)
  return { skill: Math.round(v[0]), depth: Math.max(1, Math.round(v[1])), multiPv: Math.max(1, Math.round(v[2])), blunder: v[3], temperature: v[4] }
}

interface BotData {
  id: string; name: string; rating: number; cc: string; group: GroupId; tone: Tone | null; style: 'attack' | null
  title: string; bio: string; greet: string | null; look: object | null
}

export const BOTS: Bot[] = (botData as BotData[]).map((d) => ({
  id: d.id, name: d.name, rating: d.rating, cc: d.cc, group: d.group, title: d.title, bio: d.bio, greet: d.greet,
  tone: d.tone, style: d.style, avatar: d.look ? `${import.meta.env.BASE_URL}avatars/${d.id}.svg` : null,
  chatty: d.tone === 'frech' || d.tone === 'kind' ? 0.5 : 0.4,
  ...strength(d.rating),
}))

export const ENGINE_MIN = 250
export const ENGINE_MAX = 3200

export function engineBot(rating: number): Bot {
  return {
    id: `engine-${rating}`, name: 'Engine', rating, cc: '', group: 'engine', title: 'Stockfish mit einstellbarer Stärke',
    bio: 'Die Engine spielt in genau der Stärke, die du einstellst.', greet: null, tone: null, avatar: null, ...strength(rating),
  }
}

export function findBot(id: string): Bot | null {
  if (id.startsWith('engine-')) return engineBot(Number(id.slice(7)) || 1500)
  return BOTS.find((b) => b.id === id) ?? null
}

export function flag(cc: string) {
  if (!cc) return ''
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

export const TONE_LINES: Record<Tone, Partial<Record<ChatEvent, string[]>>> = {
  nett: {
    greet: ['Hallo! Schön, dass du mit mir spielst.', 'Auf eine schöne Partie!'],
    botCapture: ['Oh, die nehme ich mal.', 'Entschuldige, die war ungedeckt.'],
    playerCapture: ['Oh nein, die hatte ich ganz vergessen.', 'Gut gesehen!', 'Hoppla, das war meine.'],
    botCheck: ['Schach! Pass auf deinen König auf.', 'Schach, glaube ich.'],
    playerCheck: ['Huch, Schach!', 'Oh, mein armer König.'],
    playerBlunder: ['Bist du sicher? Na gut …', 'Danke für das Geschenk!'],
    playerStrong: ['Das war ein starker Zug.', 'Oha, damit hatte ich nicht gerechnet.'],
    botWinning: ['Heute läuft es richtig gut für mich.'],
    botLosing: ['Du spielst heute richtig gut.', 'Ich glaube, ich stehe nicht so gut.'],
    chatter: ['Ich mag diese Stellung.', 'Hmm, lass mich überlegen.', 'Schach ist schon ein schönes Spiel.'],
    takeback: ['Klar, nimm ruhig zurück.'],
    hint: ['Ein Tipp kann nie schaden.'],
    botWins: ['Danke für die Partie! Nächstes Mal klappt es bestimmt.'],
    botLoses: ['Glückwunsch, das hast du toll gemacht!'],
    draw: ['Remis, ein gerechtes Ergebnis.'],
  },
  frech: {
    greet: ['Na, bereit für eine Abreibung?', 'Mach dich auf was gefasst!'],
    botCapture: ['Lecker!', 'Die gehört jetzt mir.', 'Danke, die nehm ich.'],
    playerCapture: ['Pff, die brauchte ich eh nicht.', 'Glückstreffer.'],
    botCheck: ['Schach! Lauf, kleiner König!', 'Schach! Na, was jetzt?'],
    playerCheck: ['Ein Schach, wie niedlich.', 'Keine Panik, keine Panik …'],
    playerBlunder: ['Ha! Das hast du nicht gesehen, oder?', 'Danke! Weihnachten ist dieses Jahr früher.'],
    playerStrong: ['Okay, okay, nicht schlecht.', 'Hey, das war gemein!'],
    botWinning: ['Gib lieber gleich auf.', 'Das wird ein kurzer Abend.'],
    botLosing: ['Ich lass dich nur ein bisschen gewinnen.', 'Warte nur, mein Angriff kommt noch!'],
    chatter: ['Gleich kracht es.', 'Ich rieche einen Angriff.', 'Schneller, ich will heute noch fertig werden!'],
    takeback: ['Zurücknehmen? Das ist ja wie Mogeln!', 'Na gut, einmal noch.'],
    hint: ['Brauchst du etwa Hilfe?'],
    botWins: ['Ha, gewonnen! Revanche gefällig?'],
    botLoses: ['Das war Glück. Revanche, sofort!'],
    draw: ['Remis? Na gut, aber nur heute.'],
  },
  lehrer: {
    greet: ['Guten Tag. Denk an die Entwicklung deiner Figuren.', 'Zeig mir, was du gelernt hast.'],
    botCapture: ['Diese Figur war nicht gedeckt.', 'Vor jedem Zug: Was hängt?'],
    playerCapture: ['Richtig, die war ungedeckt.', 'Gut, du hast den Fehler bestraft.'],
    botCheck: ['Schach. Welche drei Möglichkeiten hast du jetzt?'],
    playerCheck: ['Schach. Ein Schach ist nur gut, wenn es etwas erreicht.'],
    playerBlunder: ['Das war ein Fehler. Prüfe Schachs, Schlagzüge und Drohungen.', 'Hast du meine Drohung gesehen?'],
    playerStrong: ['Sehr gut gespielt.', 'Ausgezeichnet, genau so.'],
    botWinning: ['Dein Plan ist mir noch nicht klar.'],
    botLosing: ['Du hast die Stellung gut verstanden.'],
    chatter: ['Achte auf deine Bauernstruktur.', 'Welche Figur steht am schlechtesten?', 'Ein Springer am Rand bringt Kummer und Schand.', 'Rochiere rechtzeitig.'],
    takeback: ['Zurücknehmen ist erlaubt. Lerne daraus.'],
    hint: ['Gute Frage. Schau dir den Pfeil genau an.'],
    botWins: ['Analysiere die Partie, dort lernst du am meisten.'],
    botLoses: ['Verdienter Sieg. Gut gespielt.'],
    draw: ['Remis. Eine lehrreiche Partie.'],
  },
  ehrgeizig: {
    greet: ['Ich spiele, um zu gewinnen.', 'Viel Glück. Du wirst es brauchen.'],
    botCapture: ['Material ist Material.', 'Danke.'],
    playerCapture: ['Mist.', 'Das hätte ich sehen müssen.'],
    botCheck: ['Schach.'],
    playerCheck: ['Kein Problem.'],
    playerBlunder: ['Das wird teuer.', 'Ein Fehler, und ich bestrafe ihn.'],
    playerStrong: ['Respekt.', 'Starker Zug, das gebe ich zu.'],
    botWinning: ['Die Stellung ist entschieden.'],
    botLosing: ['Noch ist nichts verloren.', 'Konzentration …'],
    chatter: ['Hmm.', 'Interessant.', 'Ich sehe da etwas.'],
    takeback: ['Im Turnier gibt es das nicht.'],
    hint: ['Mit Hilfe ist es leicht.'],
    botWins: ['Gute Partie. Aber ich war besser.'],
    botLoses: ['Verdient. Ich will eine Revanche.'],
    draw: ['Remis. Nächstes Mal gewinne ich.'],
  },
  kind: {
    greet: ['Hi! Ich hab heute schon dreimal gewonnen!', 'Juhu, Schach!'],
    botCapture: ['Jaaa, geschnappt!', 'Hehe, meins!'],
    playerCapture: ['Neeeein!', 'Menno!'],
    botCheck: ['Schaaach!', 'Schach! Hab ich in der AG gelernt.'],
    playerCheck: ['Ahh, Schach!', 'Wo kann mein König hin?'],
    playerBlunder: ['Die darf ich echt schlagen?', 'Juhu!'],
    playerStrong: ['Wie hast du das gesehen?', 'Woah, cool!'],
    botWinning: ['Ich gewinne, ich gewinne!'],
    botLosing: ['Das ist voll schwer.', 'Wenn ich verliere, spielen wir nochmal, okay?'],
    chatter: ['Mein Trainer sagt, ich soll die Mitte besetzen.', 'Ich mag Springer am liebsten.', 'Darf ich auch mal mit der Dame?'],
    takeback: ['Darf ich dann auch mal zurücknehmen?'],
    hint: ['Ich will auch einen Tipp!'],
    botWins: ['Gewonnen! Gewonnen! Nochmal?'],
    botLoses: ['Du bist echt gut. Nochmal?'],
    draw: ['Unentschieden ist auch okay.'],
  },
  maschine: {
    greet: ['Analyse gestartet.', 'Bereit. Wahrscheinlichkeit für deinen Sieg: gering.'],
    botCapture: ['Material +1.', 'Erwartet.'],
    playerCapture: ['Zur Kenntnis genommen.'],
    botCheck: ['Schach.'],
    playerCheck: ['Kein Einfluss auf die Bewertung.'],
    playerBlunder: ['Fehler erkannt.', 'Bewertung: deutlich zu meinen Gunsten.'],
    playerStrong: ['Interessant. Das war der beste Zug.'],
    botWinning: ['Matt in wenigen Zügen wahrscheinlich.'],
    botLosing: ['Unerwartet. Neuberechnung läuft.'],
    chatter: ['Berechne …', '42 Millionen Stellungen geprüft.'],
    takeback: ['Rückgängig gemacht.'],
    hint: ['Hinweis wird bereitgestellt.'],
    botWins: ['Partie beendet. Ergebnis wie berechnet.'],
    botLoses: ['Fehler im System. Gratulation.'],
    draw: ['Remis. Akzeptabel.'],
  },
}

// Picks a random line for an event, mixing personal and tone lines (personal lines are preferred).
export function botLine(bot: Bot, event: ChatEvent): string | null {
  if (!bot.tone) return null
  const own = event === 'greet' && bot.greet ? [bot.greet] : []
  const tone = TONE_LINES[bot.tone][event] ?? []
  const pool = own.length && Math.random() < 0.65 ? own : [...own, ...tone]
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

export interface BotMove {
  move: string // UCI
  score: number | null // engine's view of the position for the bot (centipawns, mates ±100000)
}

// Asks the engine for candidate moves and lets the bot pick one according to
// its personality. Also returns the engine's evaluation so the bot can comment on the game.
// Opening book built from the repertoire in the learn section, so bots play real openings
// and vary from game to game.
let book: Map<string, string[]> | null = null
const bookKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ')
function openingBook() {
  if (book) return book
  book = new Map()
  for (const o of OPENINGS) for (const l of o.lines) {
    const c = new Chess()
    for (const san of l.moves.split(' ')) {
      const k = bookKey(c.fen())
      const list = book.get(k) ?? []
      const m = c.move(san)
      const uci = m.from + m.to + (m.promotion ?? '')
      if (!list.includes(uci)) list.push(uci)
      book.set(k, list)
    }
  }
  return book
}

export function bookMove(fen: string, bot: Bot): string | null {
  const moveNo = Number(fen.split(' ')[5] ?? 1)
  if (moveNo > 12) return null
  const chance = bot.rating < 500 ? 0.35 : bot.rating < 1000 ? 0.65 : 0.9
  if (Math.random() > chance) return null
  const list = openingBook().get(bookKey(fen))
  if (!list?.length) return null
  return list[Math.floor(Math.random() * list.length)]
}

export async function botMove(fen: string, bot: Bot): Promise<BotMove> {
  const chess = new Chess(fen)
  const legal = chess.moves({ verbose: true })
  const fromBook = bookMove(fen, bot)
  if (fromBook) return { move: fromBook, score: null }
  const { best, candidates } = await engine.search(fen, {
    depth: bot.depth,
    multiPv: Math.min(bot.multiPv, legal.length),
    skill: bot.skill,
  })
  const score = candidates[0]?.scoreCp ?? null
  if (Math.random() < bot.blunder) {
    const m = legal[Math.floor(Math.random() * legal.length)]
    return { move: m.from + m.to + (m.promotion ?? ''), score }
  }
  if (bot.temperature <= 0 || candidates.length <= 1) return { move: best, score }
  const top = candidates[0].scoreCp
  const bonus = (uci: string) => {
    if (!bot.style) return 0
    const m = legal.find((l) => l.from + l.to + (l.promotion ?? '') === uci)
    if (!m) return 0
    if (bot.style === 'attack') return (m.san.includes('+') ? 40 : 0) + (m.captured ? 20 : 0)
    return m.captured ? 30 : 0
  }
  const weights = candidates.map((c) => Math.exp(-Math.max(0, Math.min(top - c.scoreCp, 3000) - bonus(c.move)) / bot.temperature))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]
    if (r <= 0) return { move: candidates[i].move, score }
  }
  return { move: best, score }
}

export async function hintMove(fen: string): Promise<string> {
  const { best } = await engine.search(fen, { depth: 14, skill: 20 })
  return best
}

// the unbeaten bot closest to a little above the player's rating
export function recommendBot(myRating: number, beaten: Record<string, { wins: number }>) {
  const open = BOTS.filter((b) => !(beaten[b.id]?.wins > 0))
  if (!open.length) return null
  return [...open].sort((a, b) => Math.abs(a.rating - (myRating + 50)) - Math.abs(b.rating - (myRating + 50)))[0]
}
