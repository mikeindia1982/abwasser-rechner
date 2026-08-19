# Abwasser Rechner – Xcode

Dieses Verzeichnis enthält den nativen iOS-Container für die bestehende Abwasser-Rechner-Web-App.

## Projekt öffnen

1. Den Branch `feature/navigation-v2` auschecken.
2. In Xcode `ios/AbwasserRechner/AbwasserRechner.xcodeproj` öffnen.
3. Das Target `AbwasserRechner` auswählen.
4. Unter **Signing & Capabilities** das eigene Apple Developer Team auswählen.
5. Falls Xcode es verlangt, den Bundle Identifier auf einen eigenen eindeutigen Wert ändern.
6. iPhone-Simulator oder angeschlossenes iPhone auswählen und **Run** starten.

## Architektur

- SwiftUI bildet den nativen App-Einstiegspunkt.
- `WKWebView` stellt die vorhandene Benutzeroberfläche dar.
- Beim Build kopiert die Phase **Bundle Web App** die aktuelle Web-App aus dem Repository in das iOS-App-Bundle.
- Die Web-App wird innerhalb der iOS-App über einen lokalen Server unter `http://127.0.0.1:43821` geladen.
- Der feste lokale Ursprung sorgt dafür, dass `localStorage` und IndexedDB über App-Starts hinweg denselben Origin behalten.
- Navigation V2 wird aus `navigation-v2.css` und `js/navigation-v2.js` übernommen.

## Enthaltene iOS-Berechtigungen

Das Target erzeugt die Info.plist automatisch und enthält Beschreibungen für:

- Standortzugriff
- Kamera
- Fotomediathek

Diese Funktionen werden von Anlagenstandort und Besuchsdokumentation verwendet.

## Web-App aktualisieren

Änderungen an `index.html`, `styles.css`, `navigation-v2.css`, `service-worker.js`, `js/` oder den eingebundenen Bilddateien müssen nicht doppelt in Swift gepflegt werden. Ein neuer Xcode-Build kopiert die aktuellen Dateien automatisch in das App-Bundle.

## Wichtiger Hinweis

Die fachliche Datenhaltung bleibt zunächst in der bestehenden Web-App (`localStorage` / IndexedDB). Der native iOS-Container ist so aufgebaut, dass die vorhandene Funktionalität nicht für Swift neu geschrieben werden muss. Native iOS-Funktionen können anschließend schrittweise ergänzt werden.
