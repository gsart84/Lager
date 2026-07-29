# SPS Lager PWA v0.2

Lokale Inventarverwaltung für SPS-Karten auf dem iPhone.

## Installation auf dem iPhone

Eine PWA kann aus Sicherheitsgründen nicht direkt aus einer ZIP-Datei installiert werden. Der Ordner muss einmal über eine HTTPS-Adresse bereitgestellt werden. Danach:

1. Adresse in **Safari** öffnen.
2. Unten auf **Teilen** tippen.
3. **Zum Home-Bildschirm** wählen.
4. SPS Lager künftig über das neue App-Symbol starten.

Danach funktionieren Oberfläche, Datenbank und bereits geladener Scanner offline. Sämtliche Lagerdaten bleiben in der lokalen Safari-/PWA-Datenbank des iPhones.

## Funktionen

- Barcode scannen
- neue Artikel mit Anfangsbestand anlegen
- Bestand mit frei wählbarer Menge oder ±5/±10 ändern
- Lagerübersicht und Suche
- CSV-Export
- Excel-kompatibler XLS-Export
- PDF über Drucken/Teilen
- JSON-Backup und Wiederherstellung
- lokale IndexedDB ohne Benutzerkonto oder Cloud

## Wichtiger Hinweis

Beim Löschen der Website-Daten von Safari oder der PWA können lokale Bestände verloren gehen. Deshalb regelmässig ein JSON-Backup exportieren.
