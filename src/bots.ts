import { Chess } from 'chess.js'
import { engine } from './engine/stockfish'

export type ChatEvent =
  | 'greet' | 'botCapture' | 'playerCapture' | 'botCheck' | 'playerCheck'
  | 'playerBlunder' | 'playerStrong' | 'botWinning' | 'botLosing' | 'chatter'
  | 'takeback' | 'hint' | 'botWins' | 'botLoses' | 'draw'

export type Tone = 'nett' | 'frech' | 'lehrer' | 'ehrgeizig' | 'kind' | 'maschine'

export interface Bot {
  id: string
  name: string
  rating: number
  color: string // avatar background
  emoji: string
  description: string
  title?: string // short tagline under the name
  tone: Tone
  lines?: Partial<Record<ChatEvent, string[]>> // personal lines, mixed with the tone's lines
  chatty?: number // 0..1, how often the bot comments on ordinary events
  style?: 'attack' | 'trade' // small preference for checks/captures among good moves
  // engine settings
  skill: number
  depth: number
  multiPv: number
  // chance of playing a completely random legal move
  blunder: number
  // how strongly the bot prefers better moves among its candidates (lower = sharper)
  temperature: number
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

export const BOTS: Bot[] = [
  {
    id: 'gerda', name: 'Oma Gerda', rating: 250, color: '#b07fb8', emoji: '👵', tone: 'nett', chatty: 0.5,
    title: 'Rentnerin, spielt seit 60 Jahren sonntags',
    description: 'Hat mit ihrem Mann jahrzehntelang am Küchentisch gespielt. Freut sich über jede Partie und verschenkt gern mal eine Figur.',
    lines: {
      greet: ['Ach wie schön, setz dich, Kind. Möchtest du ein Stück Kuchen?', 'Mein Herbert hat immer mit Weiß gespielt.'],
      chatter: ['Früher haben wir das ganz anders gespielt.', 'Wo ist denn meine Brille?', 'Das hat mein Herbert auch immer so gemacht.'],
      botWins: ['Ach, da hab ich ja Glück gehabt! Noch ein Stück Kuchen?'],
      botLoses: ['Du bist ja ein richtiger Profi! Ich bin so stolz.'],
    },
    skill: 0, depth: 1, multiPv: 10, blunder: 0.5, temperature: 600,
  },
  {
    id: 'kiki', name: 'Kiki', rating: 400, color: '#e8a33d', emoji: '🐣', tone: 'nett',
    title: 'Küken, gerade geschlüpft',
    description: 'Fängt gerade erst an und übersieht oft hängende Figuren.',
    lines: { greet: ['Piep! Ich lerne noch.'], botCapture: ['Piep piep, geschnappt!'], playerCapture: ['Piiiep!'] },
    skill: 0, depth: 1, multiPv: 8, blunder: 0.35, temperature: 400,
  },
  {
    id: 'paul', name: 'Paul', rating: 550, color: '#e2b13c', emoji: '🧒', tone: 'kind', chatty: 0.55,
    title: '10 Jahre, frisch in der Schach-AG',
    description: 'Zehn Jahre alt, sehr ehrgeizig und liebt Springer. Zieht schnell und greift gern früh mit der Dame an.',
    style: 'attack',
    skill: 0, depth: 1, multiPv: 7, blunder: 0.25, temperature: 320,
  },
  {
    id: 'bruno', name: 'Bruno', rating: 700, color: '#c0703a', emoji: '🐻', tone: 'frech', style: 'attack',
    title: 'Bär mit Angriffslust',
    description: 'Greift gern an, denkt aber selten an die eigene Verteidigung.',
    lines: { greet: ['Brumm! Heute gibt es Angriff.'], botCapture: ['Mampf!'] },
    skill: 1, depth: 2, multiPv: 6, blunder: 0.18, temperature: 250,
  },
  {
    id: 'hannes', name: 'Hannes', rating: 850, color: '#d0694a', emoji: '👨‍🍳', tone: 'frech', style: 'attack', chatty: 0.5,
    title: 'Koch, liebt scharfe Gambits',
    description: 'Koch in einer Kneipe, spielt nach Feierabend. Opfert gern Bauern und würzt jede Partie mit Angriffen.',
    lines: {
      greet: ['Heute gibt es scharf gewürztes Schach!', 'Moin! Ich hab extra ein Gambit vorbereitet.'],
      botCapture: ['Ab in den Topf damit!', 'Frisch serviert.'],
      playerCapture: ['Die war eh angebrannt.'],
      chatter: ['Ein Bauer weniger, dafür mehr Feuer.', 'Gleich wird es heiß in der Küche.'],
      botWins: ['Und das Menü ist serviert! Guten Appetit.'],
      botLoses: ['Versalzen. Gut gespielt, Chef!'],
    },
    skill: 2, depth: 3, multiPv: 6, blunder: 0.12, temperature: 190,
  },
  {
    id: 'lena', name: 'Lena', rating: 1000, color: '#4f9bd9', emoji: '🦊', tone: 'nett',
    title: 'Schlaue Füchsin',
    description: 'Solide im Vereinsniveau. Bestraft grobe Fehler zuverlässig.',
    lines: { greet: ['Hallo! Ich bin gespannt, was du vorhast.'], playerBlunder: ['Das schnapp ich mir, sorry!'] },
    skill: 3, depth: 4, multiPv: 5, blunder: 0.08, temperature: 140,
  },
  {
    id: 'weber', name: 'Frau Dr. Weber', rating: 1150, color: '#5f8a9e', emoji: '👩‍🏫', tone: 'lehrer', chatty: 0.45,
    title: 'Mathelehrerin, rechnet alles nach',
    description: 'Unterrichtet Mathematik und leitet die Schach-AG. Spielt korrekt und kommentiert gern deine Ungenauigkeiten.',
    lines: {
      greet: ['Guten Tag. Heute schreiben wir eine kleine Klassenarbeit.'],
      playerBlunder: ['Das gibt Punktabzug.', 'Da hast du dich verrechnet.'],
      playerStrong: ['Eine Eins mit Sternchen.', 'Sauber gerechnet.'],
      botWins: ['Note: ausreichend. Nächstes Mal schaffst du mehr.'],
      botLoses: ['Sehr gut. Setzen, eins!'],
    },
    skill: 4, depth: 5, multiPv: 5, blunder: 0.06, temperature: 110,
  },
  {
    id: 'viktor', name: 'Viktor', rating: 1300, color: '#7d5bc9', emoji: '🦉', tone: 'lehrer',
    title: 'Weise Eule',
    description: 'Spielt ruhig und positionell, macht nur ab und zu Ungenauigkeiten.',
    lines: { greet: ['Uhu. Geduld ist die halbe Partie.'] },
    skill: 6, depth: 6, multiPv: 4, blunder: 0.04, temperature: 80,
  },
  {
    id: 'kemal', name: 'Kemal', rating: 1450, color: '#c98b2e', emoji: '🧔', tone: 'frech', style: 'attack', chatty: 0.6,
    title: 'Taxifahrer und Park-Blitzer',
    description: 'Fährt tagsüber Taxi und spielt abends Blitz im Park. Redet viel, spielt schnell und liebt Königsangriffe.',
    lines: {
      greet: ['Los, los, die Uhr läuft! Im Park spielen wir mit drei Minuten.', 'Einsteigen, die Fahrt beginnt!'],
      chatter: ['Kennst du den schon? Ein Läufer kommt in eine Bar …', 'Im Park hätte ich jetzt schon gewonnen.', 'Schneller, mein Taxi wartet!'],
      botCapture: ['Ein Fahrgast mehr!', 'Und tschüss!'],
      botWins: ['Endstation! Das macht dann 15 Euro.'],
      botLoses: ['Du fährst ja wie ein Profi. Respekt!'],
    },
    skill: 8, depth: 8, multiPv: 4, blunder: 0.025, temperature: 60,
  },
  {
    id: 'mira', name: 'Mira', rating: 1600, color: '#d24f6c', emoji: '🐆', tone: 'ehrgeizig',
    title: 'Schnelle Gepardin',
    description: 'Taktisch wach. Wer eine Figur einstellt, verliert sie auch.',
    skill: 10, depth: 9, multiPv: 3, blunder: 0.015, temperature: 40,
  },
  {
    id: 'sophie', name: 'Sophie', rating: 1800, color: '#3f9fa8', emoji: '👩‍🎓', tone: 'ehrgeizig', chatty: 0.4,
    title: 'Studentin, ehemalige Jugendmeisterin',
    description: 'War Landesjugendmeisterin und studiert jetzt Informatik. Kennt ihre Eröffnungen genau und spielt sehr präzise.',
    lines: {
      greet: ['Hi. Ich hab heute Abend noch eine Prüfung, also los.', 'Das habe ich gestern noch vorbereitet.'],
      chatter: ['Das steht so in meiner Vorbereitung.', 'Theorie bis Zug 15.'],
      botWins: ['GG. Schau dir die Analyse an, da lernst du viel.'],
      botLoses: ['GG, du warst heute besser.'],
    },
    skill: 12, depth: 10, multiPv: 3, blunder: 0.008, temperature: 28,
  },
  {
    id: 'falk', name: 'Dr. Falk', rating: 2000, color: '#3a9a6a', emoji: '🦅', tone: 'lehrer',
    title: 'Adler mit Doktortitel',
    description: 'Turnierstark, gute Endspieltechnik und kaum Fehler.',
    skill: 15, depth: 12, multiPv: 2, blunder: 0, temperature: 15,
  },
  {
    id: 'ivan', name: 'Meister Iwan', rating: 2200, color: '#8a6d4b', emoji: '👴', tone: 'lehrer', chatty: 0.45,
    title: 'Alter Vereinstrainer, FIDE-Meister',
    description: 'Trainiert seit 40 Jahren Jugendliche im Verein. Lobt gute Züge, mahnt Ungenauigkeiten an und spielt die Endspiele perfekt.',
    lines: {
      greet: ['Setz dich. Heute lernen wir etwas.', 'Erst denken, dann ziehen.'],
      chatter: ['Turm auf die offene Linie, merk dir das.', 'Im Endspiel wird der König zur starken Figur.', 'Wer nicht plant, spielt nur Züge.'],
      playerStrong: ['Gut! So spielt ein Meister.'],
      botWins: ['Nicht schlecht, Kleiner. Analysiere und komm wieder.'],
      botLoses: ['Bravo! Das hätte ich dir nicht zugetraut.'],
    },
    skill: 17, depth: 14, multiPv: 2, blunder: 0, temperature: 10,
  },
  {
    id: 'alexandra', name: 'GM Alexandra', rating: 2500, color: '#a03a5a', emoji: '👸', tone: 'ehrgeizig', chatty: 0.35,
    title: 'Großmeisterin',
    description: 'Großmeisterin und mehrfache Landesmeisterin. Spielt elegant, kennt jeden Trick und verzeiht nichts.',
    lines: {
      greet: ['Schön, dich kennenzulernen. Viel Erfolg.'],
      chatter: ['Eine typische Stellung.', 'Das hat Capablanca schon so gespielt.'],
      playerStrong: ['Sehr schön. Das hätte ich nicht erwartet.'],
      botWins: ['Danke für die Partie. Du hast Potenzial.'],
      botLoses: ['Ich gratuliere. Das war großartig gespielt.'],
    },
    skill: 19, depth: 16, multiPv: 2, blunder: 0, temperature: 5,
  },
  {
    id: 'titan', name: 'Titan', rating: 3000, color: '#555c66', emoji: '🤖', tone: 'maschine',
    title: 'Schachcomputer',
    description: 'Volle Engine-Stärke. Nur für mutige Momente.',
    skill: 20, depth: 18, multiPv: 1, blunder: 0, temperature: 0,
  },
]

export const BOT_GROUPS = [
  { name: 'Einsteiger', max: 800 },
  { name: 'Fortgeschritten', max: 1400 },
  { name: 'Stark', max: 2100 },
  { name: 'Meister', max: 9999 },
]

// Picks a random line for an event, mixing personal and tone lines (personal lines are preferred).
export function botLine(bot: Bot, event: ChatEvent): string | null {
  const own = bot.lines?.[event] ?? []
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
export async function botMove(fen: string, bot: Bot): Promise<BotMove> {
  const chess = new Chess(fen)
  const legal = chess.moves({ verbose: true })
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
