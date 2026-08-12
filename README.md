# Jenseits der Messung

Eine eigenständige WebGL-Scrollytelling-Seite über eine bewusst spekulative Verbindung zwischen Hubble-Spannung, Fermi-Paradoxon und KBC-Leere.

## Lokal starten

```bash
cd /home/wizzard/kosmos-explorer
python3 -m http.server 8080
```

Dann `http://localhost:8080` im Browser öffnen.

Die interaktive Sonnensystem-Unterseite ist unter `solar-system.html` erreichbar. Sie nutzt J2000-Keplerbahnen, eine Datumssimulation sowie anschauliche und gemeinsame physikalische Skalierung.

Es gibt keine externen Abhängigkeiten. WebGL, Interaktionen, Layout und Animation laufen vollständig aus den lokalen Dateien. Bei deaktiviertem WebGL bleibt der Text lesbar. Die Seite respektiert `prefers-reduced-motion` und bietet zusätzlich einen Pausenknopf.

## Einordnung

Die verwendeten kosmologischen Begriffe und Größenordnungen bilden den Ausgangspunkt. Ihre erzählerische Verbindung ist ausdrücklich ein Gedankenexperiment und keine wissenschaftlich belegte Gesamttheorie.
