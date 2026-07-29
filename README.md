# SPS Lager PWA v0.9 – echter Excel-Export

Neu:
- Der bisherige HTML-als-XLS-Trick wurde entfernt.
- Excel-Export erzeugt jetzt eine echte `.xlsx`-Datei.
- Keine Warnung mehr wegen nicht passender Dateiendung.
- Arbeitsblatt „Lagerübersicht“ mit:
  - Produkt
  - Bestand
  - Letzte Änderung
  - Gesamtbestand
  - Exportdatum
  - Autofilter
  - fixierter Kopfzeile
  - passenden Spaltenbreiten
- CSV, PDF und JSON-Backup bleiben erhalten.
- Bestehende Produkte und Bestände bleiben erhalten.

## GitHub-Update
Alle losen Dateien in das Hauptverzeichnis hochladen.
Wichtig:
- `index.html` ersetzen
- `service-worker.js` ersetzen
- `app-v09.js`
- `style-v09.css`
- `manifest-v09.webmanifest`

Beim ersten Excel-Export ist Internet erforderlich, damit SheetJS geladen und danach offline zwischengespeichert wird.
