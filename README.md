# Finansal Pusula (Financial Compass) — Lackmus

A browser-based financial ratio analysis tool for evaluating a company's financial statements, with a Turkish-language interface.

🇩🇪 German version: [README.de.md](README.de.md)

## What it does

- Upload a company's financial data as CSV (parsed client-side with PapaParse).
- Computes standard financial ratios — liquidity ratio, acid-test (quick) ratio, debt-to-equity, and others.
- Multi-tab dashboard: **Dashboard**, **Data Entry**, **Ratio Analysis**, **Charts** (via Chart.js), **Report**, and a **Glossary** of the financial terms used.

## Tech stack

Plain HTML, CSS and vanilla JavaScript, plus two libraries loaded from CDN: [PapaParse](https://www.papaparse.com/) for CSV parsing and [Chart.js](https://www.chartjs.org/) for the visualisations. No backend, no build step.

## Running it

Open `index.html` in a browser, or serve the folder statically:

```bash
npx serve .
```

## Relationship to other repositories

Independent project — no shared code or data with the German/French vocabulary trainers elsewhere in this account.
