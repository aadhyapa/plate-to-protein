# Plate to Cell — Build Spec for Fable

Nov 14, 2026

## 1. How to use this spec

Paste the **Opening prompt** (section 12) into Fable first, then paste the rest of this doc. Build in the milestone order in section 10. After each milestone, run the site, fix what's broken, and commit before moving on.

## 2. Project summary

**Plate to Cell** is an interactive, free, static educational website that follows protein from a meal on your plate, through digestion into amino acids, into your cells where DNA is translated into new proteins, and finally to real 3D protein structures.

The core hook: **the user builds a meal, and that meal follows them through every stage of the site.**

- **Audience:** high school and college students, curious adults, people learning about nutrition.
- **Purpose:** a portfolio and resume project that is deployed, polished and genuinely useful.
- **Gap it fills:** existing sites cover either protein biology (PDB-101, Amino Acids Guide) or nutrition reading (open textbooks). None connect food to amino acids to real protein structures in one interactive journey.

## 3. Hard constraints

- **Zero running cost.** Static site only. No backend, no database, no accounts, no paid APIs, no AI calls at runtime.
- **Free hosting:** GitHub Pages, Netlify or Vercel (all give HTTPS).
- **Data ships with the site** as trimmed JSON, except 3D structure files, which load from free public databases (RCSB PDB, AlphaFold DB).
- **Saved state lives in the browser** (localStorage), wrapped in try/catch so the site still works if storage is unavailable.
- **Mobile first.** Every stage must work on a phone, including the 3D viewer.
- **Accessible:** keyboard navigable, readable contrast, alt text, reduced-motion support.
- **Educational, not medical advice.** Show a clear disclaimer in the footer and on the protein goal calculator. Cite sources for every nutrition claim.

## 4. Tech stack

- **Vite + React + TypeScript**
- **Routing:** React Router (one route per stage)
- **State:** a small store (Zustand or React context) persisted to localStorage
- **Styling:** CSS modules or Tailwind; light and dark mode
- **Charts:** a lightweight chart library (e.g. Recharts) or hand-built SVG
- **3D molecules:** 3Dmol.js (lighter than Mol*), loading PDB/mmCIF files from RCSB and AlphaFold DB
- **Search:** a client-side fuzzy search library (e.g. Fuse.js or MiniSearch) over the bundled food JSON
- **Animation:** CSS transitions plus a scroll-driven animation approach for the Gut stage; respect prefers-reduced-motion
- **Testing:** Vitest for logic (translation, amino acid math, protein goal math)
- **Deploy:** GitHub Pages via GitHub Actions, or Netlify/Vercel

## 5. Data sources (all free)

- **Foods and amino acids:** USDA FoodData Central (public domain). Use the SR Legacy and/or Foundation Foods downloads, which include amino acid values for many foods.
  - Write a Node script in /scripts that reads the downloaded CSVs and outputs a trimmed foods.json: id, name, category, serving size, calories, protein (g), the 9 essential amino acids (mg), and dietary tags (vegetarian, vegan).
  - Target about 500–1,500 common foods so the file stays small. Only keep foods with amino acid data for the profile features.
  - Don't commit the raw USDA files; commit the script and the trimmed output.
- **Prices:** USDA doesn't include prices. Let users enter a price per item for the protein-per-dollar comparison, or ship a small hand-made list clearly labeled as rough estimates.
- **Protein goal:** baseline adult RDA of 0.8 g per kg body weight. Any higher activity-based ranges must cite a source on screen.
- **Essential amino acid reference pattern:** WHO/FAO/UNU (2007) amino acid requirement pattern for scoring a meal's profile. Cite it on screen.
- **Genetic code:** the standard codon table (hard-coded).
- **3D structures:** RCSB PDB (files.rcsb.org) and AlphaFold DB. Suggested starters, verify each one loads: 4HHB (hemoglobin), 2HBS (sickle cell hemoglobin), 1GFL (green fluorescent protein), plus an insulin and a collagen structure.

## 6. Site map and user journey

A stage tracker across the top shows: **Plate → Gut → Cell → Structure**, plus a final Wrap-up. Users can jump to any stage, but the default flow is linear.

- / — Landing
- /plate — Food explorer and meal builder
- /gut — Digestion and amino acid profile
- /cell — DNA to protein simulator and mutation lab
- /structure — 3D protein explorer
- /wrap-up — Summary card, badges, quiz score
- /about — Sources, disclaimer, credits, links to PDB-101 and Amino Acids Guide

## 7. Stage-by-stage features

### Landing

- Headline: "Follow a protein from your plate to your cells."
- Primary button: **Start with a meal** (to /plate). Secondary link: **Skip to the 3D explorer**.
- A short animated preview of the four stages.

### Plate — food explorer and meal builder

- Search bar with fuzzy search and filters: vegetarian, vegan, high protein per calorie, food category.
- Food cards: name, serving size, grams of protein, calories, and a **Complete protein** badge (all 9 essential amino acids meet the reference pattern per gram of protein).
- **Add to meal** with an adjustable serving amount.
- **My Meal panel** (side panel on desktop, bottom sheet on mobile): items, total protein, and a progress bar against the daily goal.
- **Protein goal calculator:** weight (kg or lb), activity level, shows the result with a source and the disclaimer.
- **Compare mode:** pick 2–3 foods; chart protein per 100 kcal, per serving and (if prices entered) per dollar.
- Preset meals (e.g. "Vegan day", "Breakfast") so first-time visitors have something to try.
- Call to action: **See what happens to this meal →**

### Gut — digestion and amino acid profile

- Scroll-driven body diagram: mouth → stomach → small intestine → bloodstream.
- The user's actual meal items appear and break apart into amino acid "beads" as they scroll.
- Tap points explain key steps in plain language (stomach acid unfolds proteins, enzymes such as pepsin and trypsin cut them, amino acids are absorbed in the small intestine).
- **My meal's amino acid profile:** a bar chart of the 9 essential amino acids compared with the reference pattern. Any amino acid below the pattern is flagged as the limiting one.
- **Fix it suggestion:** recommend 1–3 foods from the dataset that best raise the limiting amino acid (e.g. adding a legume to a grain-based meal). One tap adds the food to the meal and the chart updates.
- Complementary protein mini lesson and a 3-question quiz.
- If the meal is empty, show a sample meal with a prompt to build one.

### Cell — DNA to protein simulator

- Input a short DNA sequence, or pick a preset (include a short section of the human beta-globin gene, HBB).
- Step-by-step animation: DNA → mRNA (transcription) → codons → amino acid chain (translation). A Play/Step control lets users go one codon at a time.
- Interactive codon wheel that highlights the current codon.
- **Mutation lab:** click any base to change it. The result is labeled: silent, missense (amino acid changed), or nonsense (early stop). Preset: change the codon for amino acid 6 of beta-globin from GAG to GTG to show the sickle cell mutation (glutamic acid → valine), with a button that jumps to the sickle cell structure in the Structure stage.
- Link amino acids back to the Gut stage: amino acids absorbed from food are the building blocks used here.
- Unit tests for transcription, translation, reading frames and mutation classification.

### Structure — 3D protein explorer

- A 3Dmol.js viewer loading a featured protein; rotate, zoom, and a simple touch mode on phones.
- Display modes: cartoon, surface, sticks. Color modes: by secondary structure (helix, sheet), by amino acid type (hydrophobic, polar, charged), and by AlphaFold confidence for AlphaFold models.
- **Guided tours** of 4–6 featured proteins, each with 3–5 steps that move the camera and highlight a region with a short plain-language note.
- **Mutations and disease tour:** normal vs sickle cell hemoglobin side by side, highlighting position 6.
- Search by PDB ID or UniProt ID (AlphaFold) for advanced users, with friendly error handling.
- Loading and failure states: spinner, retry, and a fallback image if the database is unreachable.
- Links out to PDB-101 and Amino Acids Guide for deeper reading.

### Wrap-up

- Summary card: "Your meal had X g of protein, its limiting amino acid was Y, and you built Z."
- Badges for completed stages and quiz score.
- **Download my protein journey** as a PNG (rendered in the browser from the summary card).
- Restart and share buttons (share = copy the site link; no user data leaves the browser).

## 8. Global UI

- Stage tracker at the top on every stage.
- "My Meal" pill in a corner on every stage showing item count and total protein; tap to open the meal panel.
- Glossary: underlined terms show a one-line definition on hover or tap; a full glossary page in /about.
- Light and dark mode toggle, remembered in localStorage.
- Footer: disclaimer, sources link, GitHub repo link.
- Visual style: clean and friendly, one accent color per stage, consistent typography, generous spacing. Avoid generic template looks.

## 9. Data model

- **Food:** id, name, category, servingGrams, kcal, proteinG, aminoAcidsMg (the 9 essential amino acids per serving), tags.
- **MealItem:** foodId, servings.
- **AppState (persisted):** meal (list of MealItem), proteinGoal settings, units, completedStages, quizScores, theme, optional user-entered prices.
- Pure functions in /src/lib: mealTotals, aminoProfile, limitingAminoAcid, suggestFoods, proteinGoal, transcribe, translate, classifyMutation. These get unit tests.

## 10. Milestones (two-day plan)

1. **Setup:** Vite + React + TS project, routing, stage tracker, theme toggle, layout, footer. Deploy a placeholder to the chosen host right away.
2. **Data:** USDA preprocessing script and trimmed foods.json; verify amino acid coverage.
3. **Plate stage:** search, filters, food cards, meal panel, goal calculator, compare mode, presets. Redeploy.
4. **Gut stage:** amino acid profile, limiting amino acid, suggestions, scroll animation, quiz. Redeploy. *(End of day 1 target.)*
5. **Cell stage:** transcription and translation logic with tests, step animation, codon wheel, mutation lab.
6. **Structure stage:** 3Dmol viewer, featured proteins, tours, sickle cell comparison, ID search, error states.
7. **Wrap-up and About:** summary card, PNG export, badges, sources, glossary.
8. **Polish:** mobile pass, accessibility pass, performance (lazy-load the 3D library and food data), README with screenshots and a short demo GIF. Final deploy.

**If time runs short, cut in this order:** ID search in Structure → price comparison → guided tours beyond two proteins → scroll animation in Gut (replace with a simple stepped diagram).

## 11. Definition of done

- Live at a public HTTPS URL; loads in under 3 seconds on a normal connection.
- A first-time visitor can build a meal, see its amino acid profile, translate a DNA sequence, and rotate a 3D protein, all on a phone.
- No console errors; all unit tests pass.
- Every nutrition number and claim has a visible source; disclaimer is visible.
- README includes: what it is, screenshots, live link, tech stack, data sources and licenses, how to run locally, and what you'd add next.

## 12. Opening prompt for Fable

Copy and paste this as your first message, then paste sections 2–11:

> You are building a production-quality static website called **Plate to Cell**, an interactive journey that follows protein from a meal on your plate to amino acids to real 3D protein structures. This is a portfolio project and must be deployable for free with no backend. I'm pasting the full spec below. Before writing any code: (1) restate the plan in a short list, (2) propose the folder structure, and (3) flag anything in the spec that's risky or unclear. Then build it milestone by milestone in the order given. After each milestone, run the dev server and tests, fix any errors, summarize what's done, and tell me what to check in the browser. Keep the code clean, typed and commented where it isn't obvious. Prioritize a working, deployed site over extra features: if time gets tight, follow the cut order in the spec.

## 13. Out of scope

- User accounts, cloud sync, or any server.
- AI chat or any paid API.
- Medical, clinical or personalized diet advice.
- Full protein folding simulation (the 3D stage shows real known structures, not predictions computed in the browser).
