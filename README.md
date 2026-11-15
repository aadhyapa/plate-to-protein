# Plate to Cell

An interactive, free, static website that follows protein from a meal on your plate, through digestion into amino acids, into your cells where DNA is translated into new proteins, and on to real 3D protein structures.

The full build spec is in [SPEC.md](SPEC.md).

## Status

Milestone 4 of 8 (Gut stage): the Plate stage (food search, meal builder, protein goal, compare, presets) and the Gut stage (scroll-through digestion, the meal's amino acid profile, fix-it suggestions, a complementary protein lesson and a quiz) are built. Cell, Structure and Wrap-up are still placeholders.

## Tech stack

- Vite + React + TypeScript
- React Router (one route per stage)
- React context persisted to `localStorage` (wrapped so the site works without storage)
- Hand-written fuzzy search and SVG/CSS charts, so there are no search or chart dependencies
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

## Food data

`public/data/foods.json` holds about 1,200 everyday foods with calories, protein and amino acids per serving. It is generated from the USDA FoodData Central **SR Legacy** download by `scripts/build-foods.mjs`, which keeps only foods with full amino acid data, merges near-duplicates (one raw and one prepared version of each food) and tags vegetarian and vegan foods by name and category.

To rebuild it, download the SR Legacy CSV zip from [FoodData Central](https://fdc.nal.usda.gov/download-datasets), unzip it, and run:

```bash
npm run data -- path/to/FoodData_Central_sr_legacy_food_csv_2018-04
```

The raw USDA files are not committed.

## Data sources

- Foods and amino acids: U.S. Department of Agriculture, Agricultural Research Service. FoodData Central: SR Legacy, April 2018. fdc.nal.usda.gov (public domain, CC0 1.0)
- Amino acid reference pattern: WHO/FAO/UNU (2007), WHO Technical Report Series 935
- 3D structures: RCSB Protein Data Bank and AlphaFold Protein Structure Database

## Disclaimer

Educational, not medical advice.
