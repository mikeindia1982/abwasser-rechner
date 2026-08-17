# Bugfix-Bericht 0.8.6.3

## Hauptursache

Beim Öffnen des Anlagenformulars wurde `plantForm` verwendet, bevor die Variable initialisiert war. JavaScript brach dadurch mit einem `ReferenceError` ab. Alle danach registrierten Funktionen fehlten, darunter:

- Speichern neuer Anlagen
- GPS-Schaltfläche und Geolocation-Aufruf
- Übernahme von Koordinaten
- Formularvalidierung
- Ansprechpartner- und Techniklogik

## Weitere behobene Fehler

1. Die im Anlagenformular bearbeitete Dosiertechnik wurde nicht in den zu speichernden Datensatz übernommen.
2. Eingaben der Schlammentwässerung im Anlagenformular wurden übersprungen und nicht gespeichert.
3. Beim Hinzufügen oder Entfernen eines Ansprechpartners konnten noch nicht gespeicherte Eingaben verloren gehen.
4. Ältere oder unvollständige Datensätze konnten wegen fehlender Unterobjekte Laufzeitfehler verursachen.
5. Die interne Versionsnummer war noch 0.8.6.1, obwohl der Service Worker bereits 0.8.6.2 verwendete.
6. Bei direktem Öffnen der HTML-Datei fehlte ein verständlicher Hinweis, dass Geolocation HTTPS oder localhost erfordert.
7. Die Service-Worker-Registrierung konnte Aktualisierungen aus dem HTTP-Cache beziehen. `updateViaCache: none` erzwingt die Prüfung der aktuellen Worker-Datei.

## Technische Änderungen

- Formularreferenz wird unmittelbar nach dem Rendern initialisiert.
- Zentrale Normalisierung bestehender Anlagen auf Schema-Version 3.
- Fallback-ID-Erzeugung, falls `crypto.randomUUID()` nicht verfügbar ist.
- GPS-Werte werden als normalisierte Dezimalstrings gespeichert.
- Dosiertechnik und Schlammentwässerung werden vor dem Speichern explizit synchronisiert.
- Service-Worker-Cache auf 0.8.6.3 erhöht.

## Prüffälle

- Neue Anlage manuell anlegen und nach Neustart wieder öffnen.
- GPS erfassen, speichern und nach Neustart kontrollieren.
- Koordinaten mit Komma manuell eingeben.
- Bestehende ältere Anlage bearbeiten.
- Ansprechpartner hinzufügen/entfernen, ohne andere Eingaben zu verlieren.
- Dosierstation hinzufügen und speichern.
- Schlammentwässerung aktivieren und speichern.
- Tankanlage separat bearbeiten und speichern.
