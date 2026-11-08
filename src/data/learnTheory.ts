import { L } from '../i18n'
// Theory for the endgame trainer and the tactical motifs: the method step by step,
// typical mistakes, and how to recognise a motif on the board.

export interface EndgameTheory {
  idea: string
  steps: string[]
  mistakes: string[]
}

export const ENDGAME_THEORY: Record<string, EndgameTheory> = L<Record<string, EndgameTheory>>({
  dame: {
    idea: 'Die Dame allein kann nicht mattsetzen. Sie sperrt den König in ein immer kleineres Rechteck, dein König muss beim Matt helfen.',
    steps: [
      'Stelle die Dame einen Springerzug vom gegnerischen König entfernt. Dann bleibt ihm nur noch ein kleines Rechteck.',
      'Folge jedem Königszug mit der Dame, wieder im Springerabstand. So wird das Rechteck kleiner, bis der König am Rand steht.',
      'Steht der König am Rand, mache keine Damenzüge mehr, sondern hole deinen König heran, bis er dem anderen König gegenübersteht.',
      'Jetzt gibt die Dame Schach auf der Randlinie. Dein König deckt sie oder nimmt die Fluchtfelder: Matt.',
    ],
    mistakes: [
      'Patt: Hat der gegnerische König kein Feld mehr und steht nicht im Schach, ist es Remis. Zähle vor jedem Damenzug seine freien Felder.',
      'Stelle die Dame nie ungedeckt direkt neben den gegnerischen König.',
    ],
  },
  tuerme: {
    idea: 'Zwei Türme setzen ohne Hilfe des Königs matt. Einer sperrt eine Reihe, der andere gibt auf der nächsten Schach.',
    steps: [
      'Turm A sperrt eine Reihe ab. Der König kann nicht darüber.',
      'Turm B gibt Schach auf der Reihe davor. Der König muss eine Reihe zurück.',
      'Jetzt sperrt Turm B, und Turm A gibt eine Reihe weiter Schach.',
      'So geht es Reihe für Reihe bis zum Rand: das Treppenmatt.',
    ],
    mistakes: [
      'Kommt der König einem Turm zu nahe, ziehe den Turm weit weg ans andere Ende der Reihe.',
      'Stelle die Türme auf verschiedene Linien, damit sie sich nicht gegenseitig im Weg stehen.',
    ],
  },
  turm: {
    idea: 'Turm und König drängen den König Schritt für Schritt an den Rand. Ohne deinen König geht es nicht.',
    steps: [
      'Der Turm schneidet den König ab: Er steckt in einer Box, die nur kleiner werden darf.',
      'Dein König geht auf den gegnerischen König zu, bis sie sich gegenüberstehen (ein Feld dazwischen, das heißt Opposition).',
      'Stehen die Könige in Opposition, gibt der Turm Schach. Der König muss eine Reihe zurück.',
      'Stehen sie nicht in Opposition, mache einen Wartezug mit dem Turm entlang der Sperrlinie. Dann muss der König ziehen.',
      'Am Rand gibt das Turmschach in Opposition Matt.',
    ],
    mistakes: [
      'Stelle den Turm nicht ungedeckt neben den gegnerischen König.',
      'Achte am Rand und in der Ecke auf Patt.',
    ],
  },
  quadrat: {
    idea: 'Ein König kann einen Freibauern allein aufhalten, wenn er rechtzeitig in das Quadrat des Bauern tritt.',
    steps: [
      'Zeichne gedanklich das Quadrat: vom Bauern bis zur Umwandlungsreihe, und genauso breit.',
      'Kann dein König mit seinem Zug in dieses Quadrat treten, holt er den Bauern ein.',
      'Gehe diagonal: Ein Diagonalzug bringt dich gleichzeitig näher an die Linie und an die Reihe des Bauern.',
      'Steht der Bauer noch auf der Grundstellung, darf er zwei Felder ziehen. Zähle dann so, als stünde er schon ein Feld weiter.',
    ],
    mistakes: [
      'Gerade Königszüge kosten Zeit. Im Wettlauf zählt jedes Tempo.',
    ],
  },
  reservetempo: {
    idea: 'In Bauernendspielen entscheidet oft, wer ziehen muss. Ein kleiner Bauernzug kann das Zugrecht an den Gegner abgeben: das Reservetempo.',
    steps: [
      'Opposition: Die Könige stehen sich mit einem Feld dazwischen gegenüber. Wer dann ziehen muss, muss ausweichen.',
      'Hier stehen die Könige in Opposition, aber du bist am Zug. Spiele den Bauern nur ein Feld vor. Jetzt muss Schwarz ziehen.',
      'Der schwarze König weicht aus. Dein König geht vor dem Bauern her.',
      'Steht dein König zwei Reihen vor dem Bauern (auf der Linie oder daneben), gewinnt der Bauer immer. Diese Felder heißen Schlüsselfelder.',
    ],
    mistakes: [
      'Den Bauern zu früh schieben: Dann ist die Opposition weg und es wird Remis.',
      'Den Doppelschritt spielen, wenn du ein Reservetempo brauchst.',
    ],
  },
  opposition: {
    idea: 'Der Verteidiger hält Remis, wenn sein König vor dem Bauern bleibt und die Opposition nimmt.',
    steps: [
      'Bleibe mit deinem König direkt vor dem Bauern.',
      'Rückt der weiße König vor, stelle dich ihm direkt gegenüber (Opposition).',
      'Musst du ausweichen, gehe gerade zurück, nicht zur Seite.',
      'Am Ende steht dein König vor dem Bauern auf der Grundreihe. Dann ist es Patt, oder Weiß kommt nicht weiter.',
    ],
    mistakes: [
      'Zur Seite ausweichen statt gerade zurück: Dann kommt der weiße König vor den Bauern und gewinnt.',
    ],
  },
  durchbruch: {
    idea: 'Drei Bauern gegen drei: Mit zwei Opfern macht Weiß einen Bauern frei, weil die Könige zu weit weg sind.',
    steps: [
      'Spiele den mittleren Bauern vor. Nur dieser Zug gewinnt.',
      'Schlägt Schwarz mit dem Bauern links davon, opfere den rechten Bauern. Schlägt er rechts, opfere den linken.',
      'Nach dem zweiten Opfer ist ein weißer Bauer frei und läuft zur Dame.',
      'Zähle die Züge: Der schwarze König ist zu weit weg, um zu helfen.',
    ],
    mistakes: [
      'Mit einem Randbauern anfangen: Dann schlägt Schwarz richtig und hält alles.',
    ],
  },
  freibauer: {
    idea: 'Ein entfernter Freibauer lenkt den gegnerischen König ab. Während er den Bauern holt, frisst dein König die Bauern auf der anderen Seite.',
    steps: [
      'Schiebe den a-Bauern. Der schwarze König muss ihm folgen.',
      'Dein König bleibt in der Mitte und geht dann zum Königsflügel.',
      'Während Schwarz den a-Bauern schlägt, schlägt dein König die schwarzen Bauern.',
      'Danach machst du mit deinen Bauern am Königsflügel eine Dame.',
    ],
    mistakes: [
      'Den a-Bauern zu früh aufgeben, bevor der schwarze König weit genug weg ist.',
      'Den eigenen König am Damenflügel lassen.',
    ],
  },
  damebauer: {
    idea: 'Eine Dame gewinnt gegen einen Bauern kurz vor der Umwandlung, wenn sie den König vor den Bauern zwingt.',
    steps: [
      'Gib Schach oder fessle so, dass der König vor seinen Bauern auf das Umwandlungsfeld muss.',
      'Steht der König vor dem Bauern, kann der Bauer nicht ziehen. Du hast ein Tempo für deinen König.',
      'Wiederhole das, bis dein König nah genug ist.',
      'Dann gewinnst du den Bauern und setzt mit Dame und König matt.',
    ],
    mistakes: [
      'Gegen einen Läufer- oder Turmbauern (a, c, f, h) auf der vorletzten Reihe ist es oft Remis, weil der Gegner ein Patt erzwingt. Gegen den d-Bauern hier gewinnst du.',
    ],
  },
  falscherlaeufer: {
    idea: 'Randbauer und Läufer, der das Umwandlungsfeld nicht erreicht: Kommt der verteidigende König in die Ecke, ist es Remis.',
    steps: [
      'Gehe mit dem König in die Ecke h8 oder bleibe dort.',
      'Pendle zwischen h8, g8 und h7.',
      'Der weiße Läufer läuft nur auf hellen Feldern und kann h8 nie angreifen.',
      'Weiß kann dich nur mit einem Patt aus der Ecke bekommen.',
    ],
    mistakes: [
      'Die Ecke verlassen: Dann kommt der weiße König davor und der Bauer läuft durch.',
    ],
  },
  lucena: {
    idea: 'Die wichtigste Gewinnstellung im Turmendspiel: Der Turm baut eine Brücke, hinter der sich der König vor den Schachs versteckt.',
    steps: [
      'Gib zuerst Schach mit dem Turm, damit der schwarze König noch eine Linie weiter weg muss.',
      'Stelle den Turm auf die vierte Reihe. Das ist die Brücke.',
      'Dein König verlässt die Ecke und geht Richtung Turm. Der schwarze Turm gibt Schachs von der Seite.',
      'Ist dein König auf der fünften Reihe, stellst du den Turm dazwischen. Die Schachs sind vorbei, der Bauer geht durch.',
    ],
    mistakes: [
      'Den König zu früh aus der Ecke ziehen, solange der schwarze König nah ist.',
      'Den Turm auf die falsche Reihe stellen: Die Brücke muss so stehen, dass dein König sie erreicht.',
    ],
  },
  philidor: {
    idea: 'Die wichtigste Remisstellung im Turmendspiel: Der Turm auf der dritten Reihe von Weiß aus (hier der sechsten) hält den König fern.',
    steps: [
      'Lass deinen Turm auf der sechsten Reihe. So kann der weiße König nicht nach vorn.',
      'Dein König bleibt vor dem Bauern.',
      'Zieht der Bauer nach e6, geh sofort mit dem Turm ganz nach hinten auf die erste Reihe.',
      'Gib von hinten Schach. Der weiße König hat keinen Schutz mehr vor den Schachs.',
    ],
    mistakes: [
      'Den Turm passiv auf der Grundreihe lassen, bevor der Bauer zieht: Dann kommt der König auf die sechste Reihe und gewinnt.',
    ],
  },
})

export interface MotifTheory {
  what: string
  spot: string[]
}

export const MOTIF_THEORY: Record<string, MotifTheory> = L<Record<string, MotifTheory>>({
  mateIn1: {
    what: 'Ein Zug, der Schach gibt, und der König hat kein Feld mehr. Nichts kann dazwischen ziehen und nichts die Figur schlagen.',
    spot: [
      'Prüfe zuerst alle Schachs, dann alle Schlagzüge, dann alle Drohungen.',
      'Schau auf die Felder um den König: Welche sind frei, welche angegriffen, welche von eigenen Figuren besetzt?',
      'Typische Bilder: Grundreihe, Dame direkt vor dem König mit Deckung, Springer gegen eingesperrten König.',
    ],
  },
  hangingPiece: {
    what: 'Eine Figur ist angegriffen und nicht gedeckt. Du kannst sie gratis schlagen.',
    spot: [
      'Frage nach jedem gegnerischen Zug: Was ist jetzt ungedeckt?',
      'Zähle bei jeder Figur: Wie oft ist sie angegriffen, wie oft gedeckt?',
      'Prüfe vor dem Schlagen, ob danach etwas von dir hängt oder ein Matt droht.',
    ],
  },
  backRankMate: {
    what: 'Turm oder Dame geben Schach auf der Grundreihe, und der König kann nicht weg, weil seine eigenen Bauern davor stehen.',
    spot: [
      'König auf der Grundreihe, Bauern davor noch auf der Ausgangsstellung (zum Beispiel f7, g7, h7).',
      'Wird die Grundreihe nur von einer Figur gedeckt? Lenke sie ab oder tausche sie.',
      'Vorbeugen bei dir selbst: Luft schaffen mit h3 oder g3.',
    ],
  },
  fork: {
    what: 'Eine Figur greift zwei oder mehr Figuren gleichzeitig an. Der Gegner kann nur eine retten.',
    spot: [
      'Springer sind die Gabelmeister: Suche Felder, von denen der Springer König und Dame oder Turm angreift.',
      'Ungedeckte Figuren und der König sind die besten Ziele.',
      'Auch Bauern, Läufer und Dame gabeln. Mit Schach ist die Gabel am stärksten.',
    ],
  },
  pin: {
    what: 'Eine Figur steht vor einer wertvolleren. Zieht sie weg, geht die wertvollere verloren. Steht dahinter der König, darf sie gar nicht ziehen.',
    spot: [
      'Steht eine gegnerische Figur auf einer Linie oder Diagonale mit König oder Dame?',
      'Gefesselte Figuren decken schlecht. Greife sie ein zweites Mal an, am besten mit einem Bauern.',
      'Fesseln können nur Läufer, Turm und Dame.',
    ],
  },
  skewer: {
    what: 'Wie die Fesselung, nur steht die wertvollere Figur vorn. Sie muss weg, und die Figur dahinter fällt.',
    spot: [
      'Stehen König und Dame oder König und Turm auf derselben Linie oder Diagonale?',
      'Meist beginnt der Spieß mit Schach: Der König muss weg, dahinter fällt eine Figur.',
      'Häufig im Endspiel: Turmschach, und dahinter steht der gegnerische Turm.',
    ],
  },
  discoveredAttack: {
    what: 'Eine Figur zieht weg und öffnet dabei die Linie einer anderen. Plötzlich gibt es zwei Angriffe auf einmal.',
    spot: [
      'Steht eine deiner Figuren zwischen deinem Läufer, Turm oder deiner Dame und einem gegnerischen Ziel?',
      'Die ziehende Figur sollte selbst etwas angreifen oder Schach geben.',
      'Abzugsschach ist besonders stark: Der Gegner muss zuerst das Schach abwehren.',
    ],
  },
  mateIn2: {
    what: 'Ein vorbereitender Zug, dann Matt. Oft ein Opfer oder ein Schach, das den König auf ein schlechtes Feld zwingt.',
    spot: [
      'Prüfe zuerst alle Schachs, auch Opfer.',
      'Frage: Welches Feld fehlt dem König noch für ein Matt? Wie kann ich es ihm nehmen?',
      'Rechne alle Antworten des Gegners durch, nicht nur die, die du erwartest.',
    ],
  },
  sacrifice: {
    what: 'Du gibst Material her, um mehr zurückzubekommen: Matt, Material oder einen entscheidenden Angriff.',
    spot: [
      'Steht der gegnerische König schlecht geschützt?',
      'Folgt nach dem Opfer ein Zwangszug, also Schach oder ein Schlagzug?',
      'Rechne bis zum Ende: Was hast du nach der Variante mehr als vorher?',
    ],
  },
})
