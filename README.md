# Schach

Eine persönliche Schach-App für Android und den Browser: gegen verschiedene Bots spielen, später auch Taktik, Eröffnungen und Endspiele trainieren.

## Herunterladen und testen

- **Browser-Version (aktueller Stand von `main`):** https://yannicraphael.github.io/chess-android/
- **Vorschau eines Pull Requests:** https://yannicraphael.github.io/chess-android/preview/pr-NUMMER/
- **Android-APK:** https://github.com/yannicraphael/chess-android/releases/latest → `Schach.apk` auf dem Handy herunterladen und öffnen. Neue Versionen lassen sich einfach drüber installieren.

Jeder Push auf `main` baut automatisch eine neue Browser-Version und eine neue APK (siehe `.github/workflows/build.yml`).

## Technik

- React + TypeScript + Vite für die Oberfläche
- [chess.js](https://github.com/jhlywa/chess.js) für die Schachregeln
- [Stockfish.js](https://github.com/nmrugg/stockfish.js) (Stockfish 19, WebAssembly, „lite single-threaded“) als Engine, läuft direkt im Gerät
- [Capacitor](https://capacitorjs.com/) verpackt die Web-App als Android-App (`android/`)

Die Bots (`src/bots.ts`) fragen die Engine nach mehreren Kandidatenzügen und wählen je nach Stärke mit etwas Zufall aus. Die Wertungen sind grobe Schätzungen.

## Lokal entwickeln

```bash
npm install
npm run dev          # Browser-Version auf http://localhost:5173
npm run android:sync # Web-Build in das Android-Projekt kopieren
```

## Hinweise

- Die APK wird mit einem festen Schlüssel signiert, damit Updates über die alte Version installiert werden können. Der Schlüssel liegt als Repository-Secret `ANDROID_KEYSTORE_BASE64` (plus `ANDROID_KEYSTORE_PASSWORD`) in GitHub, nicht im Code.
- Figuren über das Lichess-Projekt: Staunty, Dubrovny (sadsnake1, CC BY-NC-SA 4.0), Cooke (fejfar, CC BY-NC-SA 4.0), Fantasy und Celtic (Maurizio Monge, MIT), mpchess (Maxime Chupin, GPLv3+), RhosGFX (CC0), Papercut (Nikolay Anzarov, CC BY 4.0). Die App ist privat und nicht kommerziell.
- Taktikaufgaben: Lichess-Puzzle-Datenbank (database.lichess.org, CC0), Auswahl erstellt mit `scripts/build-puzzles.mjs`.
- Sounds: echte Aufnahmen von Kenney (www.kenney.nl), CC0, siehe `public/sounds/CREDITS.txt`.
- Konzept und Roadmap: [docs/KONZEPT.md](docs/KONZEPT.md)
- Stockfish ist GPLv3-lizenziert.
