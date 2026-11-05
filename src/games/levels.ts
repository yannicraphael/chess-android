export interface GameLevel {
  id: string // progress key, e.g. "coords-1"
  n: number
  name: string
  description: string
  stars: [number, number, number] // score needed for 1, 2, 3 stars
}

export interface MiniGame {
  id: 'coords' | 'knight'
  title: string
  icon: string
  teaser: string
  skill: string
  levels: GameLevel[]
}

export const MINI_GAMES: MiniGame[] = [
  {
    id: 'coords',
    title: 'Koordinaten-Blitz',
    icon: '🎯',
    teaser: 'Tippe in 30 Sekunden so viele genannte Felder wie möglich.',
    skill: 'Brettübersicht: Felder sofort finden, auch aus Sicht von Schwarz.',
    levels: [
      { id: 'coords-1', n: 1, name: 'Mit Hilfe', description: 'Weiß unten, Koordinaten am Rand', stars: [8, 15, 22] },
      { id: 'coords-2', n: 2, name: 'Ohne Hilfe', description: 'Weiß unten, keine Koordinaten', stars: [8, 15, 22] },
      { id: 'coords-3', n: 3, name: 'Schwarz unten', description: 'Brett gedreht, keine Koordinaten', stars: [7, 13, 20] },
      { id: 'coords-4', n: 4, name: 'Profi', description: 'Brett wechselt jedes Mal zufällig', stars: [6, 12, 18] },
    ],
  },
  {
    id: 'knight',
    title: 'Springer-Sprint',
    icon: '🐴',
    teaser: 'Bring den Springer mit möglichst wenigen Sprüngen zum Ziel.',
    skill: 'Springerwege sehen: wichtig für Gabeln und Verteidigung.',
    levels: [
      { id: 'knight-1', n: 1, name: 'Erste Sprünge', description: '1 bis 2 Sprünge, Zielfelder werden gezeigt', stars: [1, 2, 3] },
      { id: 'knight-2', n: 2, name: 'Freihand', description: '2 bis 3 Sprünge, ohne Hilfe', stars: [1, 2, 3] },
      { id: 'knight-3', n: 3, name: 'Weite Wege', description: '3 bis 4 Sprünge', stars: [1, 2, 3] },
      { id: 'knight-4', n: 4, name: 'Ecken-Meister', description: '4 bis 6 Sprünge, gern über Ecken', stars: [1, 2, 3] },
    ],
  },
]

export function starsFor(level: GameLevel, score: number) {
  return level.stars.filter((s) => score >= s).length
}
