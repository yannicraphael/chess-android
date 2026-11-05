// Endgame training: the player plays a position against the full-strength engine.
// Positions were checked with Stockfish (win / draw as stated).

export type EndgameGoal = 'mate' | 'promote' | 'hold' | 'stop'

export interface Endgame {
  id: string
  group: 'matt' | 'bauern' | 'turm'
  name: string
  fen: string
  goal: EndgameGoal
  task: string // what the player has to do
  tip: string // explanation shown before and on request
  stars?: [number, number] // player moves allowed for 3 and 2 stars (mate / promote)
  holdMoves?: number // 'hold': moves to survive
  maxMoves: number // give up after this many player moves
}

export const ENDGAME_GROUPS: { id: Endgame['group']; title: string; teaser: string }[] = [
  { id: 'matt', title: 'Mattführung', teaser: 'Mit wenig Material sicher mattsetzen.' },
  { id: 'bauern', title: 'Bauernendspiele', teaser: 'Opposition, Quadratregel und Reservetempo.' },
  { id: 'turm', title: 'Turmendspiele', teaser: 'Die zwei wichtigsten Stellungen der Schachgeschichte.' },
]

export const ENDGAMES: Endgame[] = [
  {
    id: 'dame', group: 'matt', name: 'Matt mit der Dame', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', goal: 'mate',
    task: 'Setze mit Dame und König matt.',
    tip: 'Drücke den König mit der Dame Schritt für Schritt an den Rand, immer einen Springerzug entfernt. Dann holt dein König auf und hilft beim Matt. Vorsicht vor Patt!',
    stars: [10, 15], maxMoves: 40,
  },
  {
    id: 'tuerme', group: 'matt', name: 'Treppenmatt mit zwei Türmen', fen: '8/8/8/3k4/8/8/8/R3K2R w - - 0 1', goal: 'mate',
    task: 'Setze mit den beiden Türmen matt.',
    tip: 'Die Türme wechseln sich ab: Einer sperrt eine Reihe ab, der andere gibt Schach auf der nächsten. So steigt der König wie auf einer Treppe zum Rand. Kommt der König einem Turm zu nahe, ziehe den Turm weit weg auf die andere Seite.',
    stars: [7, 10], maxMoves: 30,
  },
  {
    id: 'turm', group: 'matt', name: 'Matt mit dem Turm', fen: '8/8/8/3k4/8/8/8/R3K3 w - - 0 1', goal: 'mate',
    task: 'Setze mit Turm und König matt.',
    tip: 'Der Turm schneidet den König ab, dein König kommt in Opposition. Gib Schach, wenn die Könige sich gegenüberstehen, sonst mache einen Wartezug mit dem Turm. So wird die Box immer kleiner.',
    stars: [18, 25], maxMoves: 50,
  },
  {
    id: 'quadrat', group: 'bauern', name: 'Die Quadratregel', fen: '7k/8/8/p7/8/8/8/5K2 w - - 0 1', goal: 'stop',
    task: 'Halte den schwarzen Bauern auf.',
    tip: 'Zeichne gedanklich ein Quadrat vom Bauern bis zur Umwandlungsreihe. Kann dein König in dieses Quadrat treten, holt er den Bauern ein. Hier zählt jedes Tempo, also nur diagonal Richtung Bauer!',
    maxMoves: 15,
  },
  {
    id: 'reservetempo', group: 'bauern', name: 'Opposition und Reservetempo', fen: '8/8/4k3/8/4K3/8/4P3/8 w - - 0 1', goal: 'promote',
    task: 'Bring den Bauern durch und mache eine Dame.',
    tip: 'Die Könige stehen in Opposition, aber du bist am Zug. Der Bauer hat noch ein Reservetempo: Ein kleiner Bauernzug gibt dir die Opposition zurück. Danach geht dein König vor dem Bauern her.',
    stars: [10, 14], maxMoves: 30,
  },
  {
    id: 'opposition', group: 'bauern', name: 'Opposition halten', fen: '8/8/8/4k3/8/8/4P3/4K3 b - - 0 1', goal: 'hold',
    task: 'Du spielst Schwarz. Verhindere, dass Weiß eine Dame bekommt.',
    tip: 'Bleib mit deinem König vor dem Bauern. Rückt der weiße König vor, stelle dich ihm direkt gegenüber (Opposition). Auf der Grundreihe zieht der König gerade zurück, nicht zur Seite.',
    holdMoves: 15, maxMoves: 15,
  },
  {
    id: 'lucena', group: 'turm', name: 'Lucena: der Brückenbau', fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', goal: 'promote',
    task: 'Bring den Bauern durch, obwohl der schwarze Turm Schach geben kann.',
    tip: 'Erst den schwarzen König mit einem Turmschach abdrängen. Dann den Turm auf die vierte Reihe stellen: Er wird zur Brücke und fängt später die Schachs von der Seite ab.',
    stars: [12, 18], maxMoves: 35,
  },
  {
    id: 'philidor', group: 'turm', name: 'Philidor: die Verteidigung', fen: '4k3/R7/7r/4PK2/8/8/8/8 b - - 0 1', goal: 'hold',
    task: 'Du spielst Schwarz. Halte das Remis.',
    tip: 'Stelle deinen Turm auf die sechste Reihe, so kann der weiße König nicht vorrücken. Erst wenn der Bauer nach e6 zieht, gehst du mit dem Turm ganz nach hinten und gibst Schach von hinten.',
    holdMoves: 15, maxMoves: 15,
  },
]

export function endgameLevelId(e: Endgame) {
  return `endgame-${e.id}`
}
