// Opening repertoire for club players around 800-1500. Moves are in English SAN
// (shown in German notation in the app). `notes` explains moves of the main line by ply index.

export interface OpeningLine {
  name: string
  moves: string // SAN moves separated by spaces
  notes?: Record<number, string>
}

export interface Opening {
  id: string
  name: string
  side: 'w' | 'b' // the side the player trains
  first: string // short label of the opening moves, German notation
  summary: string
  ideas: string[]
  lines: OpeningLine[]
}

export const OPENINGS: Opening[] = [
  {
    id: 'italienisch', name: 'Italienische Partie', side: 'w', first: '1.e4 e5 2.Sf3 Sc6 3.Lc4',
    summary: 'Der Klassiker für Einsteiger und Großmeister: schnelle Entwicklung, Druck auf f7 und ein ruhiger Aufbau mit c3 und d3.',
    ideas: ['Läufer auf c4 zielt auf f7', 'Mit c3 den Vorstoß d4 vorbereiten', 'Früh rochieren, Turm nach e1'],
    lines: [
      {
        name: 'Giuoco Piano', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 h3 h6 Nbd2',
        notes: {
          0: 'Weiß besetzt das Zentrum und öffnet Wege für Dame und Läufer.',
          1: 'Schwarz hält im Zentrum dagegen.',
          2: 'Der Springer entwickelt sich und greift e5 an.',
          3: 'Schwarz deckt e5 mit einer neuen Figur.',
          4: 'Der Läufer zielt auf f7. Dieses Feld ist nur vom König gedeckt.',
          5: 'Schwarz spiegelt die Idee und zielt auf f2.',
          6: 'c3 bereitet d4 vor, damit Weiß das Zentrum mit Bauern besetzen kann.',
          7: 'Schwarz entwickelt den Springer und greift e4 an.',
          8: 'Die ruhige Variante: e4 ist gedeckt, Weiß baut in Ruhe auf.',
          9: 'Schwarz stützt e5 und öffnet dem Läufer c8 den Weg.',
          10: 'Der König ist in Sicherheit und der Turm kommt ins Spiel.',
          12: 'Der Turm stellt sich hinter den e-Bauern.',
          13: 'Schwarz schafft dem Läufer ein Rückzugsfeld auf a7.',
          14: 'Der Läufer weicht einem Angriff durch ...Sa5 rechtzeitig aus.',
          16: 'h3 verhindert ...Lg4, das den Springer f3 fesseln würde.',
          18: 'Der letzte Springer kommt über d2 nach f1 und g3. Danach folgt oft d4.',
        },
      },
      { name: 'Zweispringerspiel', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3 Na5 Bb5 a6 Ba4 b5 Bc2 c5 Nbd2' },
    ],
  },
  {
    id: 'spanisch', name: 'Spanische Partie', side: 'w', first: '1.e4 e5 2.Sf3 Sc6 3.Lb5',
    summary: 'Weiß greift den Verteidiger von e5 an und baut langfristigen Druck auf. Die beliebteste Eröffnung der Weltmeister.',
    ideas: ['Lb5 greift den Springer an, der e5 deckt', 'Der Läufer zieht sich nach b3 zurück und zielt auf f7', 'Mit c3 und d4 das Zentrum übernehmen'],
    lines: [
      {
        name: 'Hauptvariante', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4',
        notes: {
          4: 'Der Läufer greift den Springer c6 an, den wichtigsten Verteidiger von e5.',
          5: 'Schwarz fragt den Läufer sofort, was er vorhat.',
          6: 'Weiß hält die Spannung und behält den Läufer.',
          8: 'Weiß rochiert. Der Bauer e4 ist indirekt gedeckt, weil Weiß nach ...Sxe4 mit Te1 zurückgewinnt.',
          10: 'Der Turm deckt e4 und unterstützt das Zentrum.',
          11: 'Schwarz vertreibt den Läufer mit Raumgewinn am Damenflügel.',
          12: 'Auf b3 zielt der Läufer weiter auf f7.',
          14: 'c3 bereitet d4 vor und gibt dem Läufer ein Rückzugsfeld auf c2.',
          16: 'h3 nimmt dem Läufer c8 das Feld g4.',
          17: 'Schwarz jagt den starken Läufer.',
          18: 'Der Läufer bleibt auf der Diagonale nach h7.',
          20: 'Weiß hat das ideale Bauernzentrum aufgebaut.',
        },
      },
      { name: 'Abtauschvariante', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1' },
    ],
  },
  {
    id: 'london', name: 'Londoner System', side: 'w', first: '1.d4 2.Lf4',
    summary: 'Ein fester Aufbau, den du fast immer gleich spielen kannst: Bauern auf d4, e3 und c3, Läufer auf f4 und d3.',
    ideas: ['Der Läufer kommt vor e3 nach f4', 'Pyramide d4, e3, c3 ist sehr stabil', 'Später Se5 und Angriff am Königsflügel'],
    lines: [
      {
        name: 'Gegen ...d5', moves: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3 b6 Ne5',
        notes: {
          0: 'Weiß besetzt das Zentrum mit dem Damenbauern.',
          2: 'Das Erkennungszeichen: Der Läufer kommt heraus, bevor e3 ihn einsperrt.',
          4: 'Jetzt ist e3 möglich, ohne den Läufer einzusperren.',
          6: 'Der Springer kontrolliert e5.',
          7: 'Schwarz greift d4 an.',
          8: 'c3 stützt d4. Die Bauernkette d4, e3, c3 ist sehr fest.',
          10: 'Der Springer deckt e4 und kann nach f3 oder b3 weiter.',
          11: 'Schwarz bietet den Läuferabtausch an.',
          12: 'Weiß weicht aus und behält den guten Läufer.',
          14: 'Der Läufer zielt auf den schwarzen König.',
          16: 'Der Springer springt auf den Vorposten e5. Oft folgen f4 und Angriff.',
        },
      },
      { name: 'Gegen Königsindisch', moves: 'd4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 d6 h3 c5 c3 Nc6 O-O' },
    ],
  },
  {
    id: 'damengambit', name: 'Damengambit', side: 'w', first: '1.d4 d5 2.c4',
    summary: 'Weiß bietet den c-Bauern an, um das Zentrum zu gewinnen. Nimmt Schwarz, holt Weiß ihn meist bequem zurück.',
    ideas: ['c4 greift das Zentrum von der Seite an', 'Lg5 fesselt den Springer f6', 'Turm nach c1 auf die halboffene Linie'],
    lines: [
      {
        name: 'Abgelehnt', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7',
        notes: {
          2: 'Das Gambit: Weiß bietet den Bauern an, um Schwarz vom Zentrum abzulenken.',
          3: 'Schwarz lehnt ab und stützt d5 fest.',
          4: 'Der Springer erhöht den Druck auf d5.',
          6: 'Der Läufer fesselt den Springer an die Dame. Ohne Sf6 fällt d5 leichter.',
          7: 'Schwarz löst die Fesselung.',
          8: 'e3 öffnet den Weg für den Läufer f1.',
          12: 'Der Turm kommt auf die c-Linie, die sich bald öffnen wird.',
          15: 'Schwarz nimmt erst jetzt, weil der Läufer dann ein zweites Mal ziehen muss.',
          17: 'Schwarz bietet Abtausch an, um sich mehr Platz zu verschaffen.',
        },
      },
      { name: 'Angenommen', moves: 'd4 d5 c4 dxc4 e3 Nf6 Bxc4 e6 Nf3 c5 O-O a6 a4' },
    ],
  },
  {
    id: 'schottisch', name: 'Schottische Partie', side: 'w', first: '1.e4 e5 2.Sf3 Sc6 3.d4',
    summary: 'Weiß öffnet das Zentrum sofort. Klare Stellungen, viel Spiel für die Figuren und wenig Theorie.',
    ideas: ['Mit 3.d4 das Zentrum sofort öffnen', 'Der Springer auf d4 steht zentral', 'Schnell entwickeln und rochieren'],
    lines: [
      {
        name: 'Hauptvariante', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Ba6 b3',
        notes: {
          4: 'Weiß öffnet das Zentrum, bevor Schwarz fertig entwickelt ist.',
          5: 'Schwarz nimmt. Den Bauern zu halten wäre schwierig.',
          6: 'Der Springer schlägt zurück und steht stark in der Mitte.',
          7: 'Schwarz greift e4 an.',
          8: 'Weiß tauscht und schwächt die schwarzen Bauern.',
          10: 'Der Bauer vertreibt den Springer f6.',
          11: 'Die Dame fesselt den Bauern e5 an den König.',
          12: 'Weiß deckt e5 und verhindert Unangenehmes auf der e-Linie.',
          14: 'c4 vertreibt den Springer aus dem Zentrum.',
          15: 'Der Läufer fesselt den Bauern c4 an die Dame.',
        },
      },
      { name: 'Mit ...Lc5', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 O-O O-O' },
    ],
  },
  {
    id: 'wiener', name: 'Wiener Partie', side: 'w', first: '1.e4 e5 2.Sc3',
    summary: 'Weiß entwickelt erst den Damenspringer und spielt dann oft f4: eine angriffslustige, aber leicht zu lernende Eröffnung.',
    ideas: ['Sc3 deckt e4 und bereitet f4 vor', 'Mit f4 die f-Linie öffnen', 'Schnell rochieren und über die f-Linie angreifen'],
    lines: [
      {
        name: 'Wiener Gambit', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3 f5 exf6 Bxf6 O-O',
        notes: {
          0: 'Weiß besetzt das Zentrum.',
          2: 'Der Springer deckt e4 und hält f4 vor: das ist die Idee der Wiener Partie.',
          3: 'Schwarz greift e4 an.',
          4: 'Das Gambit: Weiß will die f-Linie öffnen.',
          5: 'Die beste Antwort: Schwarz schlägt im Zentrum zurück.',
          6: 'Weiß gewinnt Raum und vertreibt später den Springer.',
          7: 'Der Springer steht auf e4 aktiv und stark.',
          8: 'Entwickeln und den Bauern e5 decken.',
          10: 'Weiß baut ein starkes Zentrum mit d4 und e5.',
          12: 'Der Läufer greift den Springer e4 an.',
          14: 'Weiß schlägt en passant.',
          16: 'König in Sicherheit, die f-Linie ist offen für den Turm.',
        },
      },
      { name: 'Gegen 2...Sc6', moves: 'e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 Nf3 d6 O-O O-O Bg5 h6 Bh4' },
    ],
  },
  {
    id: 'englisch', name: 'Englische Eröffnung', side: 'w', first: '1.c4',
    summary: 'Weiß greift das Feld d5 von der Seite an und stellt den Läufer nach g2. Ruhig, positionell und mit wenig Theorie.',
    ideas: ['c4 kontrolliert d5', 'Fianchetto mit g3 und Lg2', 'Druck am Damenflügel, oft mit b4'],
    lines: [
      {
        name: 'Umgekehrtes Sizilianisch', moves: 'c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6 Nf3 Nc6 O-O Be7 d3 O-O a3',
        notes: {
          0: 'Weiß kontrolliert d5 von der Seite.',
          1: 'Schwarz besetzt das Zentrum mit dem e-Bauern.',
          2: 'Mehr Kontrolle über d5 und e4.',
          4: 'Weiß bereitet das Fianchetto vor.',
          6: 'Weiß tauscht den Flügelbauern gegen den Zentrumsbauern.',
          8: 'Der Läufer auf g2 drückt auf die lange Diagonale und den Springer d5.',
          10: 'Entwickeln, dann rochieren.',
          12: 'König in Sicherheit.',
          14: 'Ein fester Aufbau, der e5 und c5 kontrolliert.',
          16: 'a3 bereitet b4 vor: Weiß greift am Damenflügel an.',
        },
      },
      { name: 'Symmetrisch', moves: 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 e6 O-O Nge7 d3 O-O Bd2' },
      { name: 'Gegen 1...Sf6', moves: 'c4 Nf6 Nc3 e6 Nf3 d5 d4 Be7 Bg5 O-O e3' },
    ],
  },
  {
    id: 'carokann', name: 'Caro-Kann', side: 'b', first: '1.e4 c6',
    summary: 'Eine solide Antwort auf 1.e4. Schwarz stützt d5 mit c6 und entwickelt den hellen Läufer, bevor e6 ihn einsperrt.',
    ideas: ['Mit c6 und d5 das Zentrum angreifen', 'Läufer nach f5, bevor e6 kommt', 'Feste Bauern, wenig Schwächen'],
    lines: [
      {
        name: 'Klassisch', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6',
        notes: {
          1: 'c6 bereitet d5 vor, ohne den Läufer c8 einzusperren.',
          3: 'Schwarz greift e4 an.',
          5: 'Schwarz tauscht im Zentrum.',
          7: 'Der Läufer kommt heraus und greift den Springer an.',
          9: 'Der Läufer zieht sich zurück und bleibt aktiv.',
          10: 'Weiß droht h5 und will den Läufer fangen.',
          11: 'Schwarz gibt dem Läufer Luft auf h7.',
          13: 'Der Springer verhindert Se5 und macht den Weg für Sgf6 frei.',
          15: 'Der Läufer bleibt am Leben.',
          17: 'Schwarz tauscht den aktiven weißen Läufer ab.',
          19: 'Erst jetzt kommt e6. Schwarz steht fest, der Läufer ist längst draußen.',
        },
      },
      { name: 'Vorstoßvariante', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6 c3 cxd4 cxd4 Nge7' },
      { name: 'Abtauschvariante', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7' },
    ],
  },
  {
    id: 'sizilianisch', name: 'Sizilianisch', side: 'b', first: '1.e4 c5',
    summary: 'Die kämpferischste Antwort auf 1.e4. Schwarz spielt um den Sieg und tauscht einen Flügelbauern gegen einen Zentrumsbauern.',
    ideas: ['c5 kontrolliert d4 von der Seite', 'Nach ...cxd4 hat Schwarz zwei Zentrumsbauern mehr', 'Gegenspiel auf der halboffenen c-Linie'],
    lines: [
      {
        name: 'Najdorf mit ...e5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6',
        notes: {
          1: 'Schwarz kontrolliert d4, ohne e5 zu ziehen.',
          3: 'd6 hält den Springer von e5 fern und öffnet den Läufer.',
          5: 'Schwarz tauscht einen Flügelbauern gegen den wertvollen d-Bauern.',
          7: 'Schwarz greift e4 an und zwingt Sc3.',
          9: 'a6 nimmt dem Springer b5 und bereitet ...b5 vor.',
          11: 'Schwarz vertreibt den Springer und holt sich Platz im Zentrum.',
          13: 'Schnell entwickeln und rochieren.',
          17: 'Der Läufer kontrolliert d5, das wichtigste Feld der Stellung.',
        },
      },
      { name: 'Alapin 2.c3', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4 Nb6' },
    ],
  },
  {
    id: 'franzoesisch', name: 'Französisch', side: 'b', first: '1.e4 e6',
    summary: 'Schwarz baut eine feste Bauernkette und greift das weiße Zentrum später mit ...c5 und ...f6 an.',
    ideas: ['e6 und d5 greifen e4 an', 'Gegen die weiße Kette mit ...c5 hebeln', 'Der helle Läufer ist das Sorgenkind'],
    lines: [
      {
        name: 'Klassisch', moves: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 cxd4 Nxd4 Bc5 Qd2 O-O',
        notes: {
          1: 'e6 bereitet d5 vor.',
          3: 'Schwarz greift e4 an.',
          5: 'Der Springer erhöht den Druck auf e4.',
          7: 'Der Springer weicht aus und bereitet ...c5 vor.',
          9: 'Der typische Hebel gegen die weiße Bauernkette.',
          11: 'Noch mehr Druck auf d4.',
          13: 'Schwarz öffnet die c-Linie.',
          15: 'Der Läufer greift den Springer d4 an und fesselt ihn.',
          17: 'Schwarz bringt den König in Sicherheit.',
        },
      },
      { name: 'Vorstoßvariante', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Bd7' },
      { name: 'Abtauschvariante', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O' },
    ],
  },
  {
    id: 'skandinavisch', name: 'Skandinavisch', side: 'b', first: '1.e4 d5',
    summary: 'Schwarz greift e4 sofort an. Einfach zu lernen: Die Dame kommt früh, findet aber auf a5 einen sicheren Platz.',
    ideas: ['1...d5 stellt Weiß sofort vor die Frage', 'Die Dame weicht nach a5 aus', 'Läufer nach f5, dann e6 und c6'],
    lines: [
      {
        name: 'Mit ...Da5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Qe2 Bb4',
        notes: {
          1: 'Schwarz greift e4 sofort an.',
          3: 'Die Dame schlägt zurück. Sie muss gleich wieder ziehen, das kostet etwas Zeit.',
          5: 'Auf a5 steht die Dame sicher und fesselt den Springer c3, wenn d2 frei ist.',
          7: 'Der Springer entwickelt sich.',
          9: 'c6 gibt der Dame ein Rückzugsfeld und stützt später b5.',
          11: 'Der Läufer kommt heraus, bevor e6 ihn einsperrt.',
          13: 'Feste Bauern auf c6 und e6.',
          15: 'Der Läufer fesselt den Springer c3.',
        },
      },
      { name: 'Mit ...Lg4', moves: 'e4 d5 exd5 Qxd5 Nf3 Bg4 Be2 Nc6 d4 O-O-O' },
    ],
  },
  {
    id: 'koenigsindisch', name: 'Königsindisch', side: 'b', first: '1.d4 Sf6 2.c4 g6',
    summary: 'Gegen 1.d4 lässt Schwarz Weiß das Zentrum und greift es dann mit ...e5 an. Später oft Angriff am Königsflügel.',
    ideas: ['Läufer auf g7 und schnell rochieren', 'Mit ...e5 das Zentrum angreifen', 'Nach d5 Angriff mit ...f5'],
    lines: [
      {
        name: 'Klassisch', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7',
        notes: {
          1: 'Der Springer kontrolliert e4 und d5.',
          3: 'Schwarz bereitet das Fianchetto vor.',
          5: 'Der Läufer auf g7 zielt auf das Zentrum und den Damenflügel.',
          7: 'Schwarz lässt Weiß das Zentrum und baut fest auf.',
          9: 'König in Sicherheit, bevor es im Zentrum losgeht.',
          11: 'Der typische Gegenschlag gegen das weiße Zentrum.',
          13: 'Mehr Druck auf d4.',
          15: 'Der Springer geht nach e7 und später oft nach g6 oder f5.',
          17: 'Der Springer macht den Weg für ...f5 frei, den Angriff am Königsflügel.',
        },
      },
      { name: 'Gegen London', moves: 'd4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 d6 O-O Nbd7 h3 Qe8' },
      { name: 'Gegen g3', moves: 'd4 Nf6 Nf3 g6 g3 Bg7 Bg2 O-O O-O d6 c4 Nbd7 Nc3 e5' },
    ],
  },
  {
    id: 'slawisch', name: 'Slawisch', side: 'b', first: '1.d4 d5 2.c4 c6',
    summary: 'Schwarz stützt d5 mit dem c-Bauern und behält dem Läufer c8 die Freiheit. Eine der solidesten Antworten auf das Damengambit.',
    ideas: ['...c6 stützt d5', 'Den Läufer c8 vor ...e6 nach f5 bringen', 'Fest stehen, dann mit ...c5 oder ...e5 befreien'],
    lines: [
      {
        name: 'Hauptvariante', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6',
        notes: {
          1: 'Schwarz besetzt das Zentrum.',
          3: 'Slawisch: c6 stützt d5, ohne den Läufer c8 einzusperren.',
          5: 'Entwickeln und e4 kontrollieren.',
          7: 'Schwarz nimmt den Bauern und droht, ihn mit ...b5 zu halten.',
          8: 'a4 verhindert ...b5.',
          9: 'Der Läufer kommt vor ...e6 heraus: das ist der Vorteil von Slawisch.',
          11: 'Jetzt erst e6, der Läufer ist schon draußen.',
          13: 'Der Läufer fesselt den Springer c3 und kontrolliert e4.',
          15: 'Der Springer deckt e5 und c5.',
          17: 'Der Läufer weicht vor e4 rechtzeitig aus.',
        },
      },
      { name: 'Abtausch', moves: 'd4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6 Bf4 Nc6 e3 Bf5 Nf3 e6 Bb5 Bb4' },
      { name: 'Gegen e3', moves: 'd4 d5 c4 c6 Nf3 Nf6 e3 Bf5 Nc3 e6 Bd3 Bxd3 Qxd3 Nbd7 O-O Bd6' },
    ],
  },
  {
    id: 'russisch', name: 'Russische Verteidigung', side: 'b', first: '1.e4 e5 2.Sf3 Sf6',
    summary: 'Schwarz greift sofort e4 an, statt e5 zu decken. Sehr solide, aber mit einer wichtigen Falle, die du kennen musst.',
    ideas: ['Gegenangriff auf e4 statt Deckung von e5', 'Nach Sxe5 erst ...d6, dann ...Sxe4', 'Schnell entwickeln und rochieren'],
    lines: [
      {
        name: 'Hauptvariante', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7 c4 Nb4',
        notes: {
          1: 'Schwarz besetzt das Zentrum.',
          3: 'Die Russische Verteidigung: Gegenangriff auf e4.',
          5: 'Wichtig: Erst den Springer vertreiben! Nach sofort ...Sxe4? kommt De2, und Schwarz verliert Material.',
          7: 'Jetzt kann Schwarz den Bauern zurückschlagen.',
          9: 'Der Springer auf e4 wird von d5 gestützt.',
          11: 'Entwickeln und d4 angreifen.',
          13: 'Rochade vorbereiten.',
          15: 'Der Springer greift den Läufer d3 an, das Läuferpaar ist in Gefahr.',
        },
      },
      { name: 'Mit 3.d4', moves: 'e4 e5 Nf3 Nf6 d4 Nxe4 Bd3 d5 Nxe5 Nd7 Nxd7 Bxd7 O-O Bd6' },
      { name: 'Gegen 3.Sc3', moves: 'e4 e5 Nf3 Nf6 Nc3 Nc6 Bb5 Bb4 O-O O-O d3 d6 Bg5 Bxc3 bxc3 Qe7' },
    ],
  },
]

export const OPENING_LEVELS = [
  { n: 1, name: 'Kennenlernen', description: 'Die Hauptvariante Zug für Zug, mit Erklärungen' },
  { n: 2, name: 'Mit Hilfe', description: 'Du ziehst selbst, ein Pfeil hilft bei Bedarf' },
  { n: 3, name: 'Auswendig', description: 'Alle Varianten, ohne Hilfe' },
] as const

export function openingLevelId(o: Opening, n: number) {
  return `opening-${o.id}-${n}`
}
