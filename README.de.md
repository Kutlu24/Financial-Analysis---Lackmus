# Finansal Pusula (Finanzkompass) — Lackmus

Ein browserbasiertes Tool zur Finanzkennzahlenanalyse zur Bewertung des Jahresabschlusses eines Unternehmens, mit türkischsprachiger Oberfläche.

🇬🇧 English version: [README.md](README.md)

## Was das Tool macht

- Finanzdaten eines Unternehmens als CSV hochladen (clientseitig geparst mit PapaParse).
- Berechnet gängige Finanzkennzahlen — Liquiditätsgrad, Liquidität 1. Grades (Acid-Test), Verschuldungsgrad und weitere.
- Dashboard mit mehreren Tabs: **Dashboard**, **Dateneingabe**, **Kennzahlenanalyse**, **Diagramme** (mit Chart.js), **Bericht** und ein **Glossar** der verwendeten Finanzbegriffe.

## Technik

Reines HTML, CSS und Vanilla-JavaScript, plus zwei über CDN geladene Bibliotheken: [PapaParse](https://www.papaparse.com/) zum CSV-Parsen und [Chart.js](https://www.chartjs.org/) für die Visualisierungen. Kein Backend, kein Build-Prozess.

## Ausführen

`index.html` im Browser öffnen, oder den Ordner statisch bereitstellen:

```bash
npx serve .
```

## Verhältnis zu anderen Repositories

Eigenständiges Projekt — kein gemeinsamer Code oder Daten mit den deutschen/französischen Vokabeltrainern in diesem Account.
