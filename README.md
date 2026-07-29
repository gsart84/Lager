# SPS Lager PWA v0.6 OCR

Neu:
- Barcode scannen
- X20-Aufdruck per Kamera erkennen
- OCR sucht ausschliesslich nach Codes, die mit X20 beginnen
- Kontrastverstärkung für schwarze Schrift auf grauem Kunststoff
- Treffer wird vor dem Übernehmen angezeigt
- Vorhandene IndexedDB-Lagerdaten bleiben erhalten

## GitHub-Update
Alle losen Dateien in das Root-Verzeichnis des Repositories hochladen.
Wichtig: index.html und service-worker.js ersetzen.
Neue Dateien: app-v06.js, style-v06.css, manifest-v06.webmanifest.

Beim ersten OCR-Einsatz ist Internet nötig, damit Tesseract.js und das englische Erkennungsmodell geladen werden.
