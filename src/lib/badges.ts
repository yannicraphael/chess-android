import { BOTS } from '../bots'
import { ENDGAMES, endgameLevelId } from '../data/endgames'
import { LESSONS, lessonLevelId } from '../data/lessons'
import { OPENINGS, openingLevelId } from '../data/openings'
import { archive } from './archive'
import { progress, weeklyInfo } from './progress'
import { puzzleStats } from './puzzles'
import { rating } from './rating'

// Achievements, derived from what the app already stores. Earned badges are kept with
// their date in progress.badges, so they stay even if the underlying data changes.

export interface Badge { id: string; name: string; text: string; icon: string; group: string }

export const BADGES: Badge[] = [
  { id: 'game-1', group: 'Partien', name: 'Erste Partie', text: 'Spiele deine erste Partie.', icon: 'play' },
  { id: 'game-10', group: 'Partien', name: 'Stammgast', text: 'Spiele 10 Partien.', icon: 'play' },
  { id: 'game-50', group: 'Partien', name: 'Vereinsspieler', text: 'Spiele 50 Partien.', icon: 'play' },
  { id: 'game-100', group: 'Partien', name: 'Hundert Partien', text: 'Spiele 100 Partien.', icon: 'crown' },
  { id: 'win-1', group: 'Siege', name: 'Erster Sieg', text: 'Gewinne eine Partie.', icon: 'trophy' },
  { id: 'upset', group: 'Siege', name: 'Überraschung', text: 'Schlage einen Bot, der 200 Punkte stärker ist als du.', icon: 'bolt' },
  { id: 'bots-10', group: 'Siege', name: 'Bot-Jäger', text: 'Schlage 10 verschiedene Bots.', icon: 'target' },
  { id: 'meister', group: 'Siege', name: 'Meisterbezwinger', text: 'Schlage einen Bot aus der Gruppe Meister.', icon: 'crown' },
  { id: 'clean-1', group: 'Qualität', name: 'Saubere Partie', text: 'Eine Partie (ab 20 Zügen) ohne Patzer.', icon: 'check' },
  { id: 'clean-10', group: 'Qualität', name: 'Fehlerlos', text: '10 Partien ohne Patzer.', icon: 'check' },
  { id: 'acc-90', group: 'Qualität', name: 'Präzision', text: 'Erreiche 90 % Genauigkeit in einer Partie.', icon: 'star' },
  { id: 'rating-1000', group: 'Wertung', name: 'Vierstellig', text: 'Erreiche eine Wertung von 1000.', icon: 'chart' },
  { id: 'rating-1200', group: 'Wertung', name: 'Turnierreif', text: 'Erreiche eine Wertung von 1200.', icon: 'chart' },
  { id: 'rating-1500', group: 'Wertung', name: 'Starker Klubspieler', text: 'Erreiche eine Wertung von 1500.', icon: 'chart' },
  { id: 'puzzle-100', group: 'Taktik', name: 'Taktiker', text: 'Löse 100 Taktikaufgaben.', icon: 'puzzle' },
  { id: 'puzzle-500', group: 'Taktik', name: 'Mustererkenner', text: 'Löse 500 Taktikaufgaben.', icon: 'puzzle' },
  { id: 'puzzle-1500', group: 'Taktik', name: 'Taktik 1500', text: 'Erreiche eine Taktikwertung von 1500.', icon: 'bolt' },
  { id: 'fix-10', group: 'Taktik', name: 'Aus Fehlern gelernt', text: 'Löse 10 Stellungen aus deinen eigenen Fehlern.', icon: 'refresh' },
  { id: 'streak-7', group: 'Ausdauer', name: 'Eine Woche dran', text: 'Trainiere 7 Tage in Folge.', icon: 'flame' },
  { id: 'streak-30', group: 'Ausdauer', name: 'Ein Monat dran', text: 'Trainiere 30 Tage in Folge.', icon: 'flame' },
  { id: 'week', group: 'Ausdauer', name: 'Wochenziel', text: 'Schaffe alle drei Wochenziele.', icon: 'calendar' },
  { id: 'lessons', group: 'Wissen', name: 'Schachschüler', text: 'Schließe alle Lektionen ab.', icon: 'book' },
  { id: 'endgames', group: 'Wissen', name: 'Endspielkenner', text: 'Schaffe alle Endspiele.', icon: 'crown' },
  { id: 'openings-5', group: 'Wissen', name: 'Repertoire', text: 'Spiele 5 Eröffnungen auswendig (Stufe 3).', icon: 'book' },
]

function earnedNow(): Set<string> {
  const p = progress.get()
  const r = rating.get()
  const ps = puzzleStats.get()
  const a = archive.get()
  const got = new Set<string>()
  const recs = Object.entries(p.bots)
  const played = recs.reduce((n, [, b]) => n + b.played, 0)
  const wins = recs.reduce((n, [, b]) => n + b.wins, 0)
  if (played >= 1) got.add('game-1')
  if (played >= 10) got.add('game-10')
  if (played >= 50) got.add('game-50')
  if (played >= 100) got.add('game-100')
  if (wins >= 1) got.add('win-1')
  const beaten = recs.filter(([, b]) => b.wins > 0).map(([id]) => id)
  if (beaten.filter((id) => BOTS.some((b) => b.id === id)).length >= 10) got.add('bots-10')
  if (beaten.some((id) => BOTS.find((b) => b.id === id)?.group === 'meister')) got.add('meister')
  if (a.games.some((g) => g.outcome === 'win' && g.rated && g.botRating >= (g.ratingAfter ?? 0) - (g.ratingDelta ?? 0) + 200)) got.add('upset')
  const clean = a.games.filter((g) => g.blunders === 0 && g.moves >= 20).length
  if (clean >= 1) got.add('clean-1')
  if (clean >= 10) got.add('clean-10')
  if (a.games.some((g) => (g.accuracy ?? 0) >= 90 && g.moves >= 15)) got.add('acc-90')
  if (r.peak >= 1000 && r.games > 0) got.add('rating-1000')
  if (r.peak >= 1200 && r.games > 0) got.add('rating-1200')
  if (r.peak >= 1500 && r.games > 0) got.add('rating-1500')
  if (ps.solved >= 100) got.add('puzzle-100')
  if (ps.solved >= 500) got.add('puzzle-500')
  if (ps.peak >= 1500 && ps.played > 0) got.add('puzzle-1500')
  if (a.mistakes.filter((m) => m.solved || (m.box ?? 0) > 0).length >= 10) got.add('fix-10')
  const streak = Math.max(p.streak, p.bestStreak ?? 0)
  if (streak >= 7) got.add('streak-7')
  if (streak >= 30) got.add('streak-30')
  if (weeklyInfo(p).complete) got.add('week')
  if (LESSONS.every((l) => (p.stars[lessonLevelId(l)] ?? 0) > 0)) got.add('lessons')
  if (ENDGAMES.every((e) => (p.stars[endgameLevelId(e)] ?? 0) > 0)) got.add('endgames')
  if (OPENINGS.filter((o) => (p.stars[openingLevelId(o, 3)] ?? 0) > 0).length >= 5) got.add('openings-5')
  return got
}

// stores newly earned badges and returns them (for a short notice)
export function checkBadges(): Badge[] {
  const have = progress.get().badges ?? {}
  const fresh = [...earnedNow()].filter((id) => !have[id])
  if (!fresh.length) return []
  const date = new Date().toISOString()
  progress.set((s) => ({ badges: { ...(s.badges ?? {}), ...Object.fromEntries(fresh.map((id) => [id, date])) } }))
  return BADGES.filter((b) => fresh.includes(b.id))
}
