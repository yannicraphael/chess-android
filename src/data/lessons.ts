import { L } from '../i18n'
// Short interactive lessons ("Wissen"). Each step shows a board with text; a step with a
// `task` waits until the player finds a correct move.

export interface LessonTask {
  prompt: string
  accept?: string[] // SAN moves that count as correct
  mate?: boolean // any checkmating move counts
  safe?: boolean // any move after which the opponent has no mate in one counts
  success: string
}

export interface LessonStep {
  title: string
  text: string
  fen: string
  arrows?: { from: string; to: string; color?: 'good' | 'bad' | 'info' }[]
  marks?: Record<string, 'mark-good' | 'mark-bad' | 'mark-target'>
  task?: LessonTask
}

export interface Lesson {
  id: string
  title: string
  teaser: string
  icon: string // piece code shown as icon
  steps: LessonStep[]
}

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export const LESSONS: Lesson[] = L<Lesson[]>([
  {
    id: 'werte', title: 'Figurenwerte', teaser: 'Was ist welche Figur wert, und wann lohnt sich ein Tausch?', icon: 'wQ',
    steps: [
      {
        title: 'Die Punkte der Figuren',
        text: 'Als Faustregel gilt: Bauer 1, Springer 3, Läufer 3, Turm 5, Dame 9. Der König ist unbezahlbar, denn ohne ihn ist die Partie verloren. Mit diesen Zahlen kannst du jeden Tausch schnell bewerten.',
        fen: '7k/8/8/8/8/8/PNBRQK2/8 w - - 0 1',
      },
      {
        title: 'Nimm, was ungedeckt ist',
        text: 'Der Springer kann einen Bauern oder einen Turm schlagen. Der Bauer f7 ist vom König gedeckt, der Turm d7 aber nicht.',
        fen: 'r5k1/3r1p2/8/4N3/8/8/8/4K3 w - - 0 1',
        task: { prompt: 'Schlage die wertvollste ungedeckte Figur.', accept: ['Nxd7'], success: 'Richtig! Ein ganzer Turm, und der Springer ist sicher.' },
      },
      {
        title: 'Die Qualität',
        text: 'Auch ein gedeckter Turm kann eine gute Beute sein. Gibst du einen Läufer (3) für einen Turm (5), gewinnst du 2 Punkte. Das nennt man Qualitätsgewinn.',
        fen: '4k3/8/2p5/3r4/8/8/6B1/4K3 w - - 0 1',
        task: { prompt: 'Gewinne die Qualität.', accept: ['Bxd5'], success: 'Genau. Nach ...cxd5 hast du Turm gegen Läufer getauscht.' },
      },
      {
        title: 'Vorsicht, vergiftet',
        text: 'Nicht jede Figur ist ein Geschenk. Schlägt die Dame auf d5, nimmt der Bauer e6 zurück und du hast 9 Punkte für 1 gegeben. Frage dich vor jedem Schlagen: Wer nimmt zurück?',
        fen: '4k3/8/4p3/3p4/8/8/8/3QK3 w - - 0 1',
        arrows: [{ from: 'd1', to: 'd5', color: 'bad' }, { from: 'e6', to: 'd5', color: 'bad' }],
      },
    ],
  },
  {
    id: 'prinzipien', title: 'Eröffnungsprinzipien', teaser: 'Fünf Regeln, mit denen du jede Eröffnung gut spielst.', icon: 'wN',
    steps: [
      {
        title: '1. Das Zentrum',
        text: 'Die vier Felder in der Mitte sind die wichtigsten des Brettes. Figuren im Zentrum erreichen mehr Felder. Beginne darum mit e4 oder d4.',
        fen: START,
        marks: { d4: 'mark-target', e4: 'mark-target', d5: 'mark-target', e5: 'mark-target' },
        arrows: [{ from: 'e2', to: 'e4' }, { from: 'd2', to: 'd4' }],
      },
      {
        title: '2. Entwickeln',
        text: 'Bringe zuerst Springer und Läufer ins Spiel, jede Figur möglichst nur einmal. Springer gehören eher nach f3 und c3 als an den Rand.',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        arrows: [{ from: 'g1', to: 'f3' }, { from: 'f1', to: 'c4' }, { from: 'b1', to: 'c3' }],
      },
      {
        title: '3. Rochieren',
        text: 'Bring deinen König früh in Sicherheit, meist mit der kurzen Rochade. Dann kommt auch der Turm ins Spiel.',
        fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        arrows: [{ from: 'e1', to: 'g1' }],
      },
      {
        title: '4. Dame nicht zu früh',
        text: 'Kommt die Dame früh heraus, wird sie von gegnerischen Figuren gejagt und du verlierst Zeit. Hier kann Schwarz die Dame mit Sc6 und Sf6 mit Tempo angreifen.',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P2Q/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2',
        arrows: [{ from: 'g8', to: 'f6' }, { from: 'b8', to: 'c6' }],
      },
      {
        title: 'Jetzt du',
        text: 'Nach 1.e4 e5 bist du am Zug. Wähle einen Zug, der den Prinzipien folgt.',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        task: { prompt: 'Spiele einen guten Entwicklungszug.', accept: ['Nf3', 'Nc3', 'Bc4', 'd4', 'Bb5'], success: 'Sehr gut. Entwickeln und das Zentrum kontrollieren, genau so.' },
      },
    ],
  },
  {
    id: 'sonderregeln', title: 'Sonderregeln', teaser: 'Rochade, en passant, Umwandlung und Patt.', icon: 'wK',
    steps: [
      {
        title: 'Rochade',
        text: 'Der König zieht zwei Felder zum Turm, der Turm springt über ihn. Erlaubt ist das nur, wenn beide noch nicht gezogen haben, nichts dazwischen steht und der König nicht durch Schach zieht.',
        fen: 'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1',
        task: { prompt: 'Rochiere. Ziehe dazu den König zwei Felder zur Seite.', accept: ['O-O', 'O-O-O'], success: 'Perfekt, dein König steht sicher.' },
      },
      {
        title: 'En passant',
        text: 'Schwarz hat gerade d7-d5 gespielt, zwei Felder auf einmal. Dein Bauer auf e5 darf ihn jetzt so schlagen, als wäre er nur ein Feld gezogen. Das geht nur im direkt folgenden Zug.',
        fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1',
        task: { prompt: 'Schlage en passant.', accept: ['exd6'], success: 'Richtig, der Bauer landet auf d6 und d5 verschwindet.' },
      },
      {
        title: 'Umwandlung',
        text: 'Erreicht ein Bauer die letzte Reihe, wird er zu einer Dame, einem Turm, Läufer oder Springer. Fast immer ist die Dame die beste Wahl.',
        fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
        task: { prompt: 'Wandle den Bauern in eine Dame um.', accept: ['a8=Q'], success: 'Neue Dame, und sie gibt sogar Schach.' },
      },
      {
        title: 'Patt ist Remis',
        text: 'Hier ist Schwarz am Zug, steht nicht im Schach, hat aber keinen legalen Zug. Das ist Patt, und die Partie endet Remis, trotz Dame mehr. Pass in gewonnenen Stellungen auf!',
        fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
        marks: { g8: 'mark-bad', h7: 'mark-bad', g7: 'mark-bad' },
      },
      {
        title: 'Matt statt Patt',
        text: 'Gleiche Figuren, Weiß am Zug. Df7 wäre Patt. Findest du das Matt?',
        fen: '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1',
        task: { prompt: 'Setze matt.', mate: true, success: 'Matt! Die Dame deckt die ganze Grundreihe, der König deckt g7 und h7.' },
      },
    ],
  },
  {
    id: 'mattbilder', title: 'Mattbilder', teaser: 'Typische Matts, die du sofort erkennen solltest.', icon: 'wK',
    steps: [
      {
        title: 'Grundreihenmatt',
        text: 'Der König ist hinter seinen eigenen Bauern eingesperrt. Ein Turm oder eine Dame auf der Grundreihe setzt matt.',
        fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
        task: { prompt: 'Setze matt.', mate: true, success: 'Grundreihenmatt! Deshalb machen Profis oft mit h3 oder h6 ein Luftloch.' },
      },
      {
        title: 'Matt mit Dame und König',
        text: 'Am Rand braucht die Dame die Hilfe des Königs. Der König deckt die Fluchtfelder, die Dame setzt matt.',
        fen: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1',
        task: { prompt: 'Setze matt.', mate: true, success: 'Matt! Der König deckt a7 und b7.' },
      },
      {
        title: 'Ersticktes Matt',
        text: 'Der König ist von eigenen Figuren eingemauert. Ein einziger Springer genügt.',
        fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
        task: { prompt: 'Setze mit dem Springer matt.', mate: true, success: 'Ersticktes Matt, eines der schönsten Mattbilder.' },
      },
      {
        title: 'Das Schäfermatt verhindern',
        text: 'Weiß droht Dxf7 matt, denn Dame und Läufer zielen beide auf f7. Du spielst Schwarz.',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
        arrows: [{ from: 'h5', to: 'f7', color: 'bad' }, { from: 'c4', to: 'f7', color: 'bad' }],
        task: { prompt: 'Verhindere das Matt.', accept: ['g6', 'Qe7', 'Qf6'], success: 'Richtig. Jetzt ist f7 gedeckt. Nach g6 greifst du sogar die Dame an.' },
      },
    ],
  },
  {
    id: 'taktik', title: 'Taktik-Grundlagen', teaser: 'Gabel, Spieß, Abzug: die drei wichtigsten Motive.', icon: 'wN',
    steps: [
      {
        title: 'Die Gabel',
        text: 'Eine Figur greift zwei gegnerische Figuren gleichzeitig an. Der Gegner kann nur eine retten. Springer sind die Meister der Gabel.',
        fen: '2r3k1/6pp/8/3N4/8/8/6PP/4K3 w - - 0 1',
        task: { prompt: 'Finde die Springergabel.', accept: ['Ne7+'], success: 'Schach und Angriff auf den Turm. Nach dem Königszug schlägst du ihn.' },
      },
      {
        title: 'Der Spieß',
        text: 'Du greifst eine wertvolle Figur an. Weicht sie aus, schlägst du die Figur dahinter. Besonders stark mit Schach.',
        fen: '8/8/8/8/8/q2k4/8/4K2R w - - 0 1',
        task: { prompt: 'Gewinne die Dame mit einem Spieß.', accept: ['Rh3+'], success: 'Der König muss weg, dann fällt die Dame auf a3.' },
      },
      {
        title: 'Der Abzug',
        text: 'Eine Figur zieht weg und öffnet die Linie für eine andere. Gibt die freigelegte Figur Schach, darf die ziehende Figur fast alles tun, denn der Gegner muss zuerst seinen König retten.',
        fen: '4k3/8/1p6/2q5/4N3/8/8/4R2K w - - 0 1',
        arrows: [{ from: 'e1', to: 'e8', color: 'info' }],
        task: { prompt: 'Finde das Abzugsschach.', accept: ['Nxc5+'], success: 'Der Turm gibt Schach und der Springer frisst die Dame.' },
      },
    ],
  },
  {
    id: 'denken', title: 'Vor jedem Zug', teaser: 'Die Kontrollfrage, die die meisten Partien rettet.', icon: 'wB',
    steps: [
      {
        title: 'Schach, Schlagen, Drohungen',
        text: 'Bevor du ziehst, prüfe immer drei Dinge, zuerst für den Gegner, dann für dich: Welche Schachs gibt es? Was kann geschlagen werden? Was wird bedroht? Auf deinem Niveau entscheidet diese Gewohnheit die meisten Partien.',
        fen: START,
      },
      {
        title: 'Was will der Gegner?',
        text: 'Schwarz droht Tb1 matt auf deiner Grundreihe. Wer nur an eigene Pläne denkt, übersieht so etwas.',
        fen: '6k1/5pp1/7p/7R/8/8/1r3PPP/6K1 w - - 0 1',
        arrows: [{ from: 'b2', to: 'b1', color: 'bad' }],
        task: { prompt: 'Verhindere das Matt.', safe: true, success: 'Gut gesehen. Jetzt gibt es kein Matt auf der Grundreihe mehr.' },
      },
      {
        title: 'Die Blunder-Kontrolle',
        text: 'Hast du einen Zug gefunden, prüfe noch einmal: Lässt er eine Figur ungedeckt? Erlaubt er ein Schach? Die Trainer-Hilfe in deinen Partien warnt dich genau in diesen Fällen.',
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        arrows: [{ from: 'f3', to: 'g5', color: 'info' }],
      },
    ],
  },
  {
    id: 'bauern', title: 'Bauernstruktur', teaser: 'Freibauer, Doppelbauer, isolierter Bauer.', icon: 'wP',
    steps: [
      {
        title: 'Starke und schwache Bauern',
        text: 'Ein Freibauer hat keine gegnerischen Bauern mehr vor sich oder auf den Nachbarlinien, er ist eine Waffe. Doppelbauern und isolierte Bauern sind dagegen oft Schwächen, weil kein Bauer sie decken kann.',
        fen: '6k1/p4ppp/8/3P4/8/2P5/2P2PPP/6K1 w - - 0 1',
        marks: { d5: 'mark-good', c3: 'mark-bad', c2: 'mark-bad' },
      },
      {
        title: 'Freibauern müssen laufen',
        text: 'Ein Freibauer wird mit jedem Schritt gefährlicher. Schiebe ihn, solange es sicher ist.',
        fen: '6k1/5ppp/8/3P4/8/8/5PPP/6K1 w - - 0 1',
        task: { prompt: 'Schiebe den Freibauern.', accept: ['d6'], success: 'Genau. Der Bauer zwingt den König, sich um ihn zu kümmern.' },
      },
      {
        title: 'Der Durchbruch',
        text: 'Drei gegen drei, aber Weiß kann einen Freibauern erzwingen. Ein Bauer opfert sich, damit ein anderer durchkommt.',
        fen: '8/ppp5/8/PPP5/8/8/8/k6K w - - 0 1',
        task: { prompt: 'Finde den Durchbruch.', accept: ['b6'], success: 'Stark! Nach axb6 folgt c6, nach cxb6 folgt a6. Ein Bauer wird Dame.' },
      },
    ],
  },
  {
    id: 'mittelspiel', title: 'Pläne im Mittelspiel', teaser: 'Was tun, wenn es nichts zu schlagen gibt?', icon: 'wR',
    steps: [
      {
        title: 'Türme auf offene Linien',
        text: 'Eine Linie ohne Bauern heißt offen. Ein Turm darauf kann bis in das gegnerische Lager vordringen.',
        fen: 'r4rk1/pp3ppp/2p2n2/8/8/2N5/PPP2PPP/R4RK1 w - - 0 1',
        marks: { d1: 'mark-target', d8: 'mark-target', e1: 'mark-target', e8: 'mark-target' },
        task: { prompt: 'Stelle einen Turm auf eine offene Linie.', accept: ['Rad1', 'Rfd1', 'Rae1', 'Rfe1'], success: 'Richtig. Jetzt gehört dir die Linie.' },
      },
      {
        title: 'Die schlechteste Figur verbessern',
        text: 'Weißt du nicht weiter, suche deine schlechteste Figur und bring sie auf ein besseres Feld. Der Springer auf a3 steht am Rand und sieht wenig.',
        fen: 'r1bq1rk1/pp2bppp/2n1pn2/3p4/3P4/N1PB1N2/PP3PPP/R1BQ1RK1 w - - 0 1',
        arrows: [{ from: 'a3', to: 'c2', color: 'info' }, { from: 'c2', to: 'e3', color: 'info' }],
      },
      {
        title: 'Vorposten',
        text: 'Ein Feld, das kein gegnerischer Bauer mehr angreifen kann, ist ein Vorposten. Ein Springer dort ist oft stärker als ein Turm.',
        fen: 'r2q1rk1/pp2bppp/3p1n2/3Np3/4P3/8/PPP2PPP/R2Q1RK1 w - - 0 1',
        marks: { d5: 'mark-good' },
      },
    ],
  },
  {
    id: 'endspiel', title: 'Endspiel-Grundsätze', teaser: 'König aktiv, Freibauer vor, Turm dahinter.', icon: 'wK',
    steps: [
      {
        title: 'Der König wird stark',
        text: 'Im Endspiel gibt es kaum noch Mattgefahr. Der König wird zur kämpfenden Figur und gehört in die Mitte.',
        fen: '8/5pk1/6p1/8/8/6P1/5PK1/8 w - - 0 1',
        task: { prompt: 'Aktiviere deinen König.', accept: ['Kf3', 'Kh3'], success: 'Richtig, der König marschiert Richtung Zentrum.' },
      },
      {
        title: 'Türme hinter Freibauern',
        text: 'Ein Turm gehört hinter den Freibauern, egal ob eigener oder gegnerischer. Dann wird er mit jedem Bauernschritt stärker.',
        fen: '6k1/5pp1/7p/P7/8/8/5PPP/1R4K1 w - - 0 1',
        task: { prompt: 'Stelle den Turm hinter den Freibauern.', accept: ['Ra1'], success: 'Genau. Jetzt deckt der Turm den Bauern auf seinem ganzen Weg.' },
      },
      {
        title: 'Die Opposition',
        text: 'Stehen sich die Könige mit einem Feld Abstand gegenüber, muss der König am Zug weichen. Wer die Opposition hat, gewinnt viele Bauernendspiele. Übe das im Endspieltraining.',
        fen: '8/8/4k3/8/4K3/4P3/8/8 b - - 0 1',
        marks: { e5: 'mark-target' },
      },
    ],
  },
  {
    id: 'fesselung', title: 'Die Fesselung', teaser: 'Wenn eine Figur nicht ziehen darf, wird sie zur Zielscheibe.', icon: 'wB',
    steps: [
      {
        title: 'Was ist eine Fesselung?',
        text: 'Der Läufer b5 greift den Springer c6 an. Dahinter steht der König. Der Springer darf nicht ziehen, sonst stünde der eigene König im Schach. Man sagt: Der Springer ist gefesselt.',
        fen: '4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1',
        arrows: [{ from: 'b5', to: 'e8', color: 'info' }],
        marks: { c6: 'mark-target' },
      },
      {
        title: 'Greife die gefesselte Figur an',
        text: 'Eine gefesselte Figur kann nicht weglaufen. Greif sie mit etwas Billigem an, am besten mit einem Bauern.',
        fen: '4k3/8/2n5/1B6/3P4/8/8/4K3 w - - 0 1',
        task: { prompt: 'Gewinne den gefesselten Springer.', accept: ['d5'], success: 'Genau. Der Springer kann nicht weg und geht verloren.' },
      },
      {
        title: 'Fessle die Dame',
        text: 'Steht die Dame vor ihrem König auf einer Linie, kann ein Turm sie fesseln. Dann muss sie sich für einen Turm opfern.',
        fen: '4k3/pp6/8/4q3/8/8/PP1K4/R5N1 w - - 0 1',
        task: { prompt: 'Fessle die Dame an den König.', accept: ['Re1'], success: 'Die Dame ist gefesselt. Nach ...Dxe1+ Kxe1 hast du die Dame für den Turm gewonnen.' },
      },
      {
        title: 'Die halbe Fesselung',
        text: 'Steht hinter der Figur nicht der König, sondern die Dame, darf die Figur zwar ziehen, verliert dann aber die Dame. Auch das ist oft entscheidend. Prüfe in deinen Partien: Stehen König oder Dame mit einer anderen Figur auf einer Linie?',
        fen: 'r2qkb1r/ppp2ppp/2np1n2/4p1B1/2B1P1b1/2NP1N2/PPP2PPP/R2QK2R w KQkq - 2 6',
        arrows: [{ from: 'g5', to: 'd8', color: 'info' }, { from: 'g4', to: 'd1', color: 'bad' }],
      },
    ],
  },
  {
    id: 'koenig', title: 'Königssicherheit', teaser: 'Rochade, Luftloch und warum offene Könige verlieren.', icon: 'wK',
    steps: [
      {
        title: 'Früh rochieren',
        text: 'Im Zentrum wird es bald lebhaft, dort ist der König in Gefahr. Mit der Rochade bringst du ihn in Sicherheit und dein Turm kommt gleichzeitig ins Spiel.',
        fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        task: { prompt: 'Bring deinen König in Sicherheit.', accept: ['O-O'], success: 'Richtig. Der König steht sicher und der Turm ist bereit für die Mitte.' },
      },
      {
        title: 'Ein Luftloch',
        text: 'Ein König hinter drei Bauern kann auf der Grundreihe mattgesetzt werden. Ein kleiner Bauernzug wie h3 schafft ihm ein Fluchtfeld. Das kostet wenig und rettet viele Partien.',
        fen: '3r2k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1',
        task: { prompt: 'Schaffe deinem König ein Luftloch.', accept: ['h3', 'g3', 'h4', 'f3'], success: 'Gut. Jetzt gibt es kein Grundreihenmatt mehr.' },
      },
      {
        title: 'Der offene König',
        text: 'Fehlt ein Bauer vor dem König, entstehen Löcher. Dame und Läufer zusammen sind dann tödlich. Ziehe die Bauern vor deinem eigenen König darum nur mit gutem Grund.',
        fen: '6k1/5p1p/8/8/8/2Q5/1B3PPP/6K1 w - - 0 1',
        arrows: [{ from: 'b2', to: 'g7', color: 'info' }],
        task: { prompt: 'Nutze den offenen König und setze matt.', mate: true, success: 'Matt! Der Läufer deckt die Dame auf g7.' },
      },
    ],
  },
  {
    id: 'abtausch', title: 'Wann tauschen?', teaser: 'Mit Vorteil tauschen, mit Nachteil Figuren behalten.', icon: 'wQ',
    steps: [
      {
        title: 'Die Tauschregel',
        text: 'Hast du mehr Material, tausche Figuren: Je weniger auf dem Brett steht, desto stärker wirkt dein Vorteil. Bist du im Nachteil, behalte deine Figuren und suche Gegenspiel.',
        fen: '3qk3/ppp2ppp/8/8/8/2N5/PPP2PPP/3QK3 w - - 0 1',
      },
      {
        title: 'Biete den Damentausch an',
        text: 'Weiß hat einen Springer mehr. Ohne Damen kann Schwarz kaum noch angreifen und der Mehrspringer entscheidet.',
        fen: '3qk3/ppp2ppp/8/8/8/2N5/PPP2PPP/3QK3 w - - 0 1',
        task: { prompt: 'Tausche die Damen.', accept: ['Qxd8+'], success: 'Richtig. Nach ...Kxd8 spielst du in Ruhe mit einer Figur mehr.' },
      },
      {
        title: 'Ins Bauernendspiel tauschen',
        text: 'Hast du einen Bauern mehr und steht dein König aktiv, ist das Bauernendspiel oft leicht gewonnen. Dann lohnt es sich, die letzten Figuren zu tauschen.',
        fen: '3r4/4k3/8/8/4K3/8/4P3/3R4 w - - 0 1',
        task: { prompt: 'Tausche die Türme.', accept: ['Rxd8'], success: 'Genau. Dein König steht vor dem Bauern, das Endspiel ist gewonnen.' },
      },
    ],
  },
  {
    id: 'verteidigung', title: 'Gut verteidigen', teaser: 'Vier Antworten auf jede Drohung.', icon: 'wR',
    steps: [
      {
        title: 'Vier Möglichkeiten',
        text: 'Wird eine Figur angegriffen, hast du vier Antworten: wegziehen, decken, eine Figur dazwischenstellen oder den Angreifer schlagen. Manchmal gibt es noch eine fünfte: eine stärkere Gegendrohung.',
        fen: START,
      },
      {
        title: 'Dazwischenstellen',
        text: 'Der Turm gibt Schach und dein König kann nicht weg. Stelle eine Figur dazwischen, aber die richtige: Die Dame wäre dort verloren.',
        fen: '4r1k1/5ppp/8/8/8/8/3P1P2/3QKB2 w - - 0 1',
        task: { prompt: 'Wehre das Schach ab, ohne Material zu verlieren.', accept: ['Be2'], success: 'Richtig. Der Läufer ist gedeckt, das Schach ist abgewehrt.' },
      },
      {
        title: 'Den Angreifer schlagen',
        text: 'Der schwarze Springer gibt Schach und greift gleichzeitig deinen Turm a1 an. Bevor du mit dem König wegläufst: Kannst du den Angreifer einfach schlagen?',
        fen: '6k1/5ppp/8/8/8/8/PPn2PPP/R2QK2R w KQ - 0 1',
        task: { prompt: 'Löse die Gabel auf.', accept: ['Qxc2'], success: 'Genau. Die Gabel ist weg und du hast eine Figur gewonnen.' },
      },
    ],
  },
  {
    id: 'notation', title: 'Schachnotation', teaser: 'Partien lesen und aufschreiben.', icon: 'wR',
    steps: [
      {
        title: 'Felder und Figuren',
        text: 'Jedes Feld hat einen Namen aus Buchstabe und Zahl, zum Beispiel e4. Figuren haben deutsche Kürzel: K König, D Dame, T Turm, L Läufer, S Springer. Bauern bekommen kein Kürzel.',
        fen: START,
        marks: { e4: 'mark-target' },
      },
      {
        title: 'Einen Zug spielen',
        text: 'Sf3 bedeutet: Springer zieht nach f3. Ein x steht für Schlagen, + für Schach, # für Matt, 0-0 für die kurze Rochade.',
        fen: START,
        task: { prompt: 'Spiele Sf3.', accept: ['Nf3'], success: 'Richtig, Springer nach f3.' },
      },
      {
        title: 'Schlagen notieren',
        text: 'exd5 heißt: Der Bauer von der e-Linie schlägt auf d5.',
        fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        task: { prompt: 'Spiele exd5.', accept: ['exd5'], success: 'Genau. So liest du jede Partie mit.' },
      },
    ],
  },
])

export function lessonLevelId(l: Lesson) {
  return `lesson-${l.id}`
}
