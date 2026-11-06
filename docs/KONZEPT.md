# Konzept: vier Perspektiven auf die App

Die App ist für einen Spieler gedacht, der vom Gelegenheitsspieler (ca. 750 bis 1000) zum Turnierspieler werden will. Jede Funktion wird aus vier Blickwinkeln geprüft. Dieses Dokument hält fest, was daraus folgt, was in Version 2 umgesetzt ist und was als Nächstes kommt.

## 1. Großmeister und Trainer

**Leitfrage:** Lernt man hier wirklich besser Schach, oder nur bunter?

- Fortschritt entsteht durch das Nacharbeiten eigener Partien, nicht durch reines Spielen. Darum gibt es nach jeder Partie eine **Partieanalyse** mit Bewertung jedes Zuges (Bester Zug, Gut, Ungenauigkeit, Fehler, Patzer), dem besseren Zug und einer Bewertungskurve.
- Die häufigste Ursache für Niederlagen auf diesem Niveau sind **eingestellte Figuren**. Die **Trainer-Hilfe** warnt direkt nach dem Zug und sagt konkret, was passiert („Dein Gegner kann jetzt deinen Turm auf e5 schlagen“). So wird die Gewohnheit trainiert, vor jedem Zug die Antwort des Gegners zu prüfen.
- Bots sollen menschliche Fehler machen, keine absurden. Spätere Ausbaustufe: Fehler gezielt nach Motiv (übersehene Gabel, Fesselung) statt Zufall.
- Training statt Unterhaltung: Mini-Spiele trainieren Grundfertigkeiten (Brettübersicht, Springerwege), die später in Taktik umschlagen.

**Später:** Taktikaufgaben nach Motiv, Endspiel-Grundlagen (Opposition, Quadratregel, Matt mit Turm), Eröffnungstraining mit Erklärungen statt reinem Auswendiglernen, aus eigenen Fehlern automatisch Übungen erzeugen.

## 2. Schüler (lernt gerade Schach)

**Leitfrage:** Verstehe ich, warum etwas gut oder schlecht war, und traue ich mich weiterzumachen?

- Erklärungen in einfachem Deutsch, deutsche Notation (S, L, T, D, K), keine Engine-Zahlenkolonnen.
- Fehler dürfen passieren: Zurücknehmen ist erlaubt, Tipps sind jederzeit verfügbar, die Trainer-Hilfe ist abschaltbar, sobald man sicherer wird.
- Ein empfohlener nächster Gegner („Tipp“-Markierung) nimmt die Entscheidung ab, gegen wen man spielen soll.

**Später:** Kurze Lektionen vor neuen Themen, „Warum?“-Erklärung bei jedem Analysezug, Wiederholung von Stellungen, die man falsch gespielt hat.

## 3. UX-/UI-Fachperson

**Leitfrage:** Fühlt sich die App flüssig, klar und hochwertig an?

- **Figuren:** acht Figurensets zur Auswahl (Standard „Staunty“), Figurenfarben für Weiß und Schwarz frei wählbar, 13 Bretter, darunter Holz und Marmor mit Maserung.
- **Rückmeldung:** Zug-Animation, Sounds für Zug, Schlagen, Schach, Rochade, Umwandlung, Sieg und Niederlage, Vibration bei wichtigen Ereignissen. Alles einzeln abschaltbar.
- **Navigation:** drei klare Tabs (Spielen, Training, Profil) statt vieler Platzhalter. In Mini-Spielen wird die Tab-Leiste ausgeblendet, damit nichts ablenkt.
- Große Tippflächen, Dunkelmodus, Bedienung mit dem Daumen am unteren Rand.

**Später:** Pfeile auf dem Brett zeichnen, Bewertungsbalken neben dem Brett (abschaltbar), Einstellungen für Animationstempo, eigenes App-Icon und Startbildschirm.

## 4. Gelegenheitsspieler mit Lust auf Gamification

**Leitfrage:** Habe ich Lust, morgen wieder aufzumachen?

- **XP und Level** für jede Partie und jede Übung, mit Titeln vom „Bauer“ bis zum „Großmeister“.
- **Tagesserie** (🔥), die wächst, wenn man an aufeinanderfolgenden Tagen spielt oder übt.
- **Bot-Trophäen:** jeder besiegte Bot bekommt einen Pokal, der erste Sieg gibt Bonus-XP.
- **Mini-Spiele mit Leveln und Sternen:** Koordinaten-Blitz (4 Level) und Springer-Sprint (4 Level). Ein neues Level wird mit einem Stern freigeschaltet.

**Später:** Tagesaufgabe, Wochenziele, Abzeichen für Meilensteine (z. B. „10 Partien ohne Patzer“), weitere Mini-Spiele wie „Finde die hängende Figur“ oder „Schach in einem Zug“.

## Status

| Bereich | Version 2 |
| --- | --- |
| Figurensets und Brettfarben | erledigt |
| Sound und Vibration | erledigt |
| Zug-Animation | erledigt |
| Trainer-Hilfe | erledigt |
| Partieanalyse | erledigt |
| XP, Level, Serie, Trophäen | erledigt |
| Mini-Spiele | 2 Spiele mit je 4 Leveln |
| Taktik, Eröffnungen, Endspiele | nächste Versionen |

## Version 5: Feinschliff

| Bereich | Umsetzung |
| --- | --- |
| Wissen | 10 Lektionen mit Übungsbrett (Figurenwerte, Eröffnungsprinzipien, Sonderregeln, Mattbilder, Taktik, Denkprozess, Bauernstruktur, Mittelspiel, Endspiel, Notation) |
| Eröffnungen | 10 Eröffnungen, 24 Varianten, je 3 Stufen (kennenlernen, mit Hilfe, auswendig) |
| Endspiele | 8 Stellungen gegen die volle Engine (Mattführung, Bauern- und Turmendspiele) |
| Wertung | Offline-Elo aus Partien gegen Bots (nur ohne Tipp und Zurücknahme), dazu Spielstärke-Schätzung aus der Zuggenauigkeit |
| Partien | Archiv aller Partien mit Analyse, Bewertungsbalken, Pfeilen und PGN |
| Eigene Fehler | Klare Fehler aus eigenen Partien werden zu Aufgaben |
| Bedenkzeit | Ohne Uhr, 5+3, 10, 15+10, 30 Minuten |
| Bots | Spielen Eröffnungen aus dem Repertoire, abwechslungsreich |
| Bedienung | Ersteinrichtung mit Spielstärke, Sprechblase ohne Brettverdeckung, Profil mit Statistik, Partien und Einstellungen |


## Version 6: spielbereit

| Bereich | Umsetzung |
| --- | --- |
| Bots | Fehler wie Menschen: gierig schlagen ohne Rückschlag zu prüfen, natürlich aussehende Züge, die etwas hängen lassen |
| Analyse | „Warum?“ bei jedem Fehler: Gegenzug in Worten (ungedeckte Figur, Gabel, Doppelangriff, Matt) und was der bessere Zug erreicht hätte |
| Eigene Fehler | Wiederholung nach 3, 10 und 30 Tagen, mit Erklärung. Gleiche Stellungen werden zusammengefasst (wiederholte Fehler zuerst), Auswahl nach Motiv: Matt übersehen, Figur hängen gelassen, Gabel übersehen, Gewinn verpasst, Stellungsfehler |
| Motivation | Wochenziele (5 Partien, 30 Aufgaben, 3 Lerneinheiten) und 24 Abzeichen mit Hinweis beim Freischalten |
| Mini-Spiele | „Hängende Figur“ und „Matt in einem Zug“ gegen die Uhr, je 3 Level |
| Inhalt | 14 Eröffnungen (neu: Wiener Partie, Englisch, Slawisch, Russisch), 12 Endspiele (neu: Durchbruch, entfernter Freibauer, Dame gegen Bauer, falscher Läufer), 14 Lektionen (neu: Fesselung, Königssicherheit, Abtausch, Verteidigung) |
| Einstellungen | Animationstempo (aus, schnell, normal, langsam), Datensicherung als Datei (in der App über das Teilen-Menü) oder Text |

## Letzte Durchsicht

| Bereich | Umsetzung |
| --- | --- |
| Android | Zurück-Taste schließt erst Fenster und Unterseiten, dann geht es zur Startseite, erst dann wird die App minimiert |
| Taktik | 10 782 Lichess-Aufgaben, davon über 6000 unter 1300 |
| Partien | Vor dem Start „Gewertet“ (keine Hilfen) oder „Training“ (alle Hilfen, ungewertet). Abbrechen ohne Wertung vor dem zweiten eigenen Zug. Eine verlassene gewertete Partie zählt als verloren |
| Uhr | Zeitüberschreitung ist Remis, wenn der Gegner nicht mehr mattsetzen kann. Die Uhr hält an, solange die App im Hintergrund ist |
| Aufgabe des Tages | Gilt erst nach dem Lösen als erledigt |
