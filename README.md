# Plate to Cell

An interactive, free, static website that follows protein from a meal on your plate, through digestion into amino acids, into your cells where DNA is translated into new proteins, and on to real 3D protein structures.

The full build spec is in [SPEC.md](SPEC.md).

## Status

Milestone 1 of 8 (setup): project scaffold, routing, stage tracker, light/dark theme, layout and footer. The stages themselves are placeholders for now.

## Tech stack

- Vite + React + TypeScript
- React Router (one route per stage)
- React context persisted to `localStorage` (wrapped so the site works without storage)
- Vitest for logic tests
- Hosted on Netlify (`netlify.toml` holds the build settings and the single-page-app redirect)

## Run locally

```bash
npm install
npm run dev        # start the dev server
npm test           # run unit tests
npm run typecheck  # check types
npm run build      # production build into dist/
```

## Data sources

- Foods and amino acids: USDA FoodData Central (public domain)
- Amino acid reference pattern: WHO/FAO/UNU (2007), WHO Technical Report Series 935
- 3D structures: RCSB Protein Data Bank and AlphaFold Protein Structure Database

## Disclaimer

Educational, not medical advice.
