import { createStore } from './store'

export interface BotRecord { played: number; wins: number; draws: number; losses: number }

export interface Progress {
  xp: number
  streak: number
  lastActive: string // YYYY-MM-DD
  bots: Record<string, BotRecord>
  // best score per mini-game level, e.g. "coords-1": 23
  best: Record<string, number>
  stars: Record<string, number>
  daily: { date: string; puzzles: number; games: number }
  weekly: { week: string; puzzles: number; games: number; learn: number }
  bestStreak: number
  badges: Record<string, string> // badge id -> date earned
}

export const progress = createStore<Progress>('progress', {
  xp: 0,
  streak: 0,
  lastActive: '',
  bots: {},
  best: {},
  stars: {},
  daily: { date: '', puzzles: 0, games: 0 },
  weekly: { week: '', puzzles: 0, games: 0, learn: 0 },
  bestStreak: 0,
  badges: {},
})

// Daily goal shown on the home screen
export const DAILY_GOAL = { puzzles: 3, games: 1 }

export function dailyInfo(p: Progress = progress.get()) {
  const d = p.daily?.date === today() ? p.daily : { date: today(), puzzles: 0, games: 0 }
  const done = Math.min(d.puzzles, DAILY_GOAL.puzzles) + Math.min(d.games, DAILY_GOAL.games)
  return { ...d, done, total: DAILY_GOAL.puzzles + DAILY_GOAL.games }
}

export function recordDaily(kind: 'puzzle' | 'game', n = 1) {
  const d = dailyInfo()
  progress.set({ daily: { date: d.date, puzzles: d.puzzles + (kind === 'puzzle' ? n : 0), games: d.games + (kind === 'game' ? n : 0) } })
  recordWeekly(kind, n)
}

// ---------- weekly goals (Monday to Sunday) ----------
export const WEEKLY_GOAL = { games: 5, puzzles: 30, learn: 3 }

export function weekKey(d = new Date()) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = (t.getDay() + 6) % 7 // Monday = 0
  t.setDate(t.getDate() - day)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

export function weeklyInfo(p: Progress = progress.get()) {
  const w = p.weekly?.week === weekKey() ? p.weekly : { week: weekKey(), puzzles: 0, games: 0, learn: 0 }
  const goals = [
    { id: 'games', label: 'Partien', done: Math.min(w.games, WEEKLY_GOAL.games), total: WEEKLY_GOAL.games },
    { id: 'puzzles', label: 'Aufgaben', done: Math.min(w.puzzles, WEEKLY_GOAL.puzzles), total: WEEKLY_GOAL.puzzles },
    { id: 'learn', label: 'Lerneinheiten', done: Math.min(w.learn, WEEKLY_GOAL.learn), total: WEEKLY_GOAL.learn },
  ]
  return { ...w, goals, complete: goals.every((g) => g.done >= g.total) }
}

export function recordWeekly(kind: 'puzzle' | 'game' | 'learn', n = 1) {
  const w = weeklyInfo()
  progress.set({
    weekly: {
      week: w.week,
      puzzles: w.puzzles + (kind === 'puzzle' ? n : 0),
      games: w.games + (kind === 'game' ? n : 0),
      learn: w.learn + (kind === 'learn' ? n : 0),
    },
  })
}

// Level n needs 100 * n * (n + 1) / 2 XP in total (100, 300, 600, 1000, ...)
export function levelInfo(xp: number) {
  let level = 1
  while (xp >= (100 * level * (level + 1)) / 2) level++
  const start = (100 * (level - 1) * level) / 2
  const end = (100 * level * (level + 1)) / 2
  return { level, into: xp - start, needed: end - start }
}

export const LEVEL_TITLES = [
  'Bauer', 'Bauer', 'Springer-Lehrling', 'Springer-Lehrling', 'Läufer-Lehrling', 'Läufer',
  'Turm-Taktiker', 'Turm-Taktiker', 'Damen-Stratege', 'Damen-Stratege', 'Vereinsmeister',
  'Bezirksmeister', 'Landesmeister', 'Meisterkandidat', 'Großmeister',
]
export const levelTitle = (level: number) => LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1]

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface XpGain { amount: number; levelUp: boolean; newLevel: number; streak: number; streakUp: boolean }

export function addXp(amount: number): XpGain {
  const s = progress.get()
  const before = levelInfo(s.xp).level
  const t = today()
  let streak = s.streak
  let streakUp = false
  if (s.lastActive !== t) {
    const y = new Date()
    y.setDate(y.getDate() - 1)
    const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
    streak = s.lastActive === yesterday ? s.streak + 1 : 1
    streakUp = true
  }
  const xp = s.xp + amount
  progress.set({ xp, streak, lastActive: t, bestStreak: Math.max(s.bestStreak ?? 0, streak) })
  const after = levelInfo(xp).level
  return { amount, levelUp: after > before, newLevel: after, streak, streakUp }
}

export function recordGame(botId: string, outcome: 'win' | 'loss' | 'draw') {
  progress.set((s) => {
    const r = s.bots[botId] ?? { played: 0, wins: 0, draws: 0, losses: 0 }
    const next = {
      played: r.played + 1,
      wins: r.wins + (outcome === 'win' ? 1 : 0),
      draws: r.draws + (outcome === 'draw' ? 1 : 0),
      losses: r.losses + (outcome === 'loss' ? 1 : 0),
    }
    return { bots: { ...s.bots, [botId]: next } }
  })
}

export function recordScore(key: string, score: number, stars: number) {
  progress.set((s) => ({
    best: { ...s.best, [key]: Math.max(s.best[key] ?? 0, score) },
    stars: { ...s.stars, [key]: Math.max(s.stars[key] ?? 0, stars) },
  }))
}
