#!/usr/bin/env node
/**
 * Build public/data/foods.json from the USDA FoodData Central "SR Legacy" CSV download.
 *
 * Usage:
 *   node scripts/build-foods.mjs <path-to-unzipped-SR-Legacy-folder>
 *
 * Get the data from https://fdc.nal.usda.gov/download-datasets (SR Legacy, CSV).
 * The raw files are NOT committed; only this script and its output are.
 *
 * What it keeps:
 *   - foods from everyday categories (no baby food, restaurant or branded items)
 *   - only foods with energy, protein, all 9 essential amino acids, plus cystine
 *     and tyrosine (needed for the WHO/FAO/UNU pattern, which scores
 *     methionine+cysteine and phenylalanine+tyrosine as pairs)
 *   - at most one raw and one prepared version of each food (so "Beans, kidney"
 *     appears once raw and once cooked, not eleven times), preferring the
 *     plainest description, with a cap per category
 *
 * No dependencies: Node 18+ only.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = join(ROOT, 'public', 'data', 'foods.json');

const inputDir = process.argv[2];
if (!inputDir) {
  console.error('Usage: node scripts/build-foods.mjs <path-to-unzipped-SR-Legacy-folder>');
  process.exit(1);
}

// ---------- Configuration ----------

/** USDA nutrient ids (nutrient.csv). All amounts are per 100 g of food. */
const NUTRIENT = {
  kcal: '1008',
  protein: '1003',
};
const ESSENTIAL = {
  histidine: '1221',
  isoleucine: '1212',
  leucine: '1213',
  lysine: '1214',
  methionine: '1215',
  phenylalanine: '1217',
  threonine: '1211',
  tryptophan: '1210',
  valine: '1219',
};
const PAIRED = {
  cystine: '1216',
  tyrosine: '1218',
};

/**
 * USDA food_category id -> short label, max foods kept, base diet for tagging, and
 * `depth`: how many comma-separated parts of the description identify "the same food".
 * Meats need 3 ("Chicken, broilers or fryers, breast"); most foods need 2 ("Beans, kidney").
 */
const CATEGORIES = {
  1: { label: 'Dairy & eggs', cap: 110, diet: 'vegetarian' },
  5: { label: 'Poultry', cap: 80, diet: 'none', depth: 3 },
  7: { label: 'Sausages & deli meats', cap: 40, diet: 'none' },
  8: { label: 'Breakfast cereals', cap: 40, diet: 'unknown' },
  9: { label: 'Fruit', cap: 110, diet: 'vegan' },
  10: { label: 'Pork', cap: 60, diet: 'none', depth: 3 },
  11: { label: 'Vegetables', cap: 220, diet: 'vegan' },
  12: { label: 'Nuts & seeds', cap: 80, diet: 'vegan' },
  13: { label: 'Beef', cap: 70, diet: 'none', depth: 3 },
  15: { label: 'Fish & shellfish', cap: 120, diet: 'none' },
  16: { label: 'Legumes', cap: 130, diet: 'vegan' },
  17: { label: 'Lamb & game', cap: 40, diet: 'none', depth: 3 },
  18: { label: 'Baked goods', cap: 70, diet: 'unknown' },
  20: { label: 'Grains & pasta', cap: 110, diet: 'vegan' },
  21: { label: 'Fast food', cap: 40, diet: 'unknown' },
  23: { label: 'Snacks', cap: 40, diet: 'unknown' },
};

/**
 * Everyday foods that must survive trimming even when a plainer-sounding relative
 * would win (e.g. roasted chicken breast vs. "Chicken, broilers or fryers, giblets").
 * Each pattern keeps its single plainest match.
 */
const STAPLES = [
  /^Chicken, broilers or fryers, breast, meat only, cooked, roasted$/,
  /^Chicken, broilers or fryers, thigh, meat only, cooked, roasted$/,
  /^Chicken, broilers or fryers, drumstick, meat only, cooked, roasted$/,
  /^Chicken, broilers or fryers, wing, meat only, cooked, roasted$/,
  /^Milk, whole, 3\.25% milkfat/,
  /^Milk, reduced fat, fluid, 2% milkfat/,
  /^Milk, nonfat, fluid/,
  /^Egg, whole, cooked, scrambled$/,
  /^Egg, whole, cooked, fried$/,
  /^Cheese, cheddar$/,
  /^Cheese, mozzarella, part skim milk$/,
  /^Cheese, parmesan, hard$/,
  /^Cheese, swiss$/,
  /^Cheese, feta$/,
  /^Yogurt, Greek, plain, nonfat/,
  /^Yogurt, plain, whole milk/,
  /^Rice, white, long-grain, regular.*cooked/,
  /^Bread, white, commercially prepared/,
  /^Bread, whole-wheat, commercially prepared/,
  /^Tortillas, ready-to-bake or -fry, flour/,
  /^Tortillas, ready-to-bake or -fry, corn/,
  /^Fish, tuna, light, canned in water/,
  /^Fish, salmon, Atlantic, farmed, cooked/,
  /^Pork, fresh, loin, tenderloin, separable lean only, cooked, roasted$/,
  /^Beans, kidney, all types, mature seeds, cooked, boiled, without salt$/,
  /^Soybeans, mature (seeds, )?cooked, boiled, without salt$/,
  /^Nuts, walnuts, english$/,
  /^Nuts, cashew nuts, raw$/,
  /^Nuts, pistachio nuts, raw$/,
  /^Seeds, chia seeds, dried$/,
  /^Seeds, pumpkin and squash seed kernels, dried$/,
  /^Seeds, sunflower seed kernels, dried$/,
  /^Hummus, commercial$/,
];

/** Portion names that read like a natural serving, tried before USDA's first-listed portion. */
const NATURAL_PORTION =
  /^(large|slice|piece|each|item|fillet|patty|breast|thigh|drumstick|wing|container|bar|link|tortilla|pita|bagel|muffin|roll|egg|fruit)\b/i;

/** Words that mean a food in a plant category is not vegetarian / not vegan after all. */
const MEAT_WORDS =
  /\b(beef|pork|chicken|turkey|bacon|ham|meat|franks?|frankfurters?|sausage|fish|anchov\w*|tuna|salmon|shrimp|crab|clams?|oysters?|gelatin|lard|tallow|suet|animal fat)\b/i;
/** Includes dishes that are normally made with egg or dairy even when the name doesn't say so. */
const ANIMAL_PRODUCT_WORDS =
  /\b(milk|cheese|egg|eggs|butter|cream|creamed|yogurt|whey|casein|honey|ghee|souffle|pancakes?|gratin|scalloped|omelet|custard|pudding|burgers?)\b/i;
/** Meat substitutes: vegetarian, but often bound with egg or milk protein, so not tagged vegan. */
const MEAT_SUBSTITUTE = /\b(meatless|vegetarian|veggie|meat extender|meat substitute)\b/i;
/** Phrases that contain the words above but are plant foods. Removed before matching. */
const PLANT_PHRASES =
  /\b(coconut meat|grated meat|oyster mushrooms?|mushrooms, oyster|without egg|bread and butter|butternuts?|peanut butter|almond butter|cashew butter|sesame butter|sunflower seed butter|seed butter|nut butter|cocoa butter|coconut milk|coconut cream|soy ?milk|almond milk|rice milk|oat milk|cream of tartar|creamed corn|cream style|cream-style|butter ?beans?|butterhead|eggplant|milkfish)\b/gi;

// ---------- CSV reading ----------

/** Minimal RFC 4180 parser: handles quoted fields, escaped quotes and embedded newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Read a CSV file into an array of objects keyed by the header row. */
function readTable(name) {
  const rows = parseCsv(readFileSync(join(inputDir, name), 'utf8'));
  const header = rows[0];
  return rows.slice(1).map((cells) => Object.fromEntries(header.map((key, i) => [key, cells[i] ?? ''])));
}

// ---------- Helpers ----------

const round = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/** Brand names in SR Legacy are written in capitals (e.g. "KELLOGG'S", "KRAFT"). */
function looksBranded(description) {
  return /\b[A-Z][A-Z'&.-]{2,}\b/.test(description.replace(/\b(USDA|UHT|STP|DHA|ARA|NFS)\b/g, ''));
}

/** Drop USDA bookkeeping notes from names, e.g. "(Includes foods for USDA's Food Distribution Program)". */
function cleanName(description) {
  return description
    .replace(/\s*\(Includes foods for USDA's Food Distribution Program\)/gi, '')
    .replace(/\s*\(n x 6\.25\)/gi, '')
    .replace(/\s+,/g, ',')
    .trim();
}

/** "raw" foods and prepared foods are kept as separate variants of the same food. */
function isRaw(description) {
  return /\b(raw|uncooked|unprepared|dry)\b/i.test(description);
}

/** Group near-duplicates: the first `depth` comma-separated parts of the description. */
function groupKey(description, depth) {
  return description
    .toLowerCase()
    .split(/[,;]/)
    .slice(0, depth)
    .map((part) => part.trim())
    .join('|');
}

/** Lower is plainer. Prefers short, unsalted, unfortified, everyday descriptions. */
function plainness(description) {
  const lower = description.toLowerCase();
  let score = description.split(',').length * 10 + description.length / 10;
  // "without salt" is a pure label; don't let its extra words count against the food.
  if (/\bwithout (added )?salt\b/.test(lower)) score -= 12;
  else if (/\bwith (added )?salt\b/.test(lower)) score -= 6;
  // The way most people eat it beats the unusual preparations.
  if (/\b(boiled|hard-boiled|roasted|baked|steamed|dry heat|broiled|grilled)\b/.test(lower)) score -= 4;
  if (/\b(fried|batter|breaded|toasted|stewed|microwaved?|smoked|pickled|candied|sweetened)\b/.test(lower)) score += 6;
  if (/\b(canned|frozen|low sodium|reduced|fortified|imitation|substitute|sprouted|with added)\b/.test(lower)) score += 8;
  if (/\b(dried|dehydrated|powder|concentrate|flour|stabilized|freeze-dried)\b/.test(lower)) score += 15;
  if (/\b(separable lean and fat|select|choice|prime|trimmed to|grades?|giblets|skin only|back|neck)\b/.test(lower)) score += 12;
  return score;
}

function dietTags(description, baseDiet) {
  if (baseDiet === 'none' || baseDiet === 'unknown') return [];
  if (MEAT_SUBSTITUTE.test(description)) return ['vegetarian'];
  const text = description.replace(PLANT_PHRASES, ' ');
  if (MEAT_WORDS.test(text)) return [];
  if (baseDiet === 'vegetarian') return ['vegetarian'];
  if (ANIMAL_PRODUCT_WORDS.test(text)) return ['vegetarian'];
  return ['vegetarian', 'vegan'];
}

/**
 * Pick a household serving: a "medium" item if USDA lists one (1 medium banana beats
 * 1 cup of mashed banana), otherwise the first portion of a sensible size, else 100 g.
 */
function chooseServing(portions) {
  const bySeq = [...portions].sort((a, b) => Number(a.seq_num) - Number(b.seq_num));
  const sorted = [
    ...bySeq.filter((p) => /\bmedium\b/i.test(p.modifier)),
    ...bySeq.filter((p) => NATURAL_PORTION.test(p.modifier.trim())),
    ...bySeq.filter((p) => /^(slices?|oz)\b/i.test(p.modifier.trim())),
    ...bySeq,
  ];
  for (const portion of sorted) {
    const grams = Number(portion.gram_weight);
    if (!(grams >= 15 && grams <= 400)) continue;
    const amount = Number(portion.amount) || 1;
    const unit = (portion.modifier || portion.portion_description || 'serving').trim().replace(/\s+/g, ' ');
    return { grams: round(grams, 1), label: `${round(amount, 2)} ${unit}` };
  }
  return { grams: 100, label: '100 g' };
}

// ---------- Build ----------

console.log(`Reading SR Legacy CSVs from ${resolve(inputDir)} ...`);

const foods = readTable('food.csv').filter((food) => food.data_type === 'sr_legacy_food');

const wanted = new Set([...Object.values(NUTRIENT), ...Object.values(ESSENTIAL), ...Object.values(PAIRED)]);
/** fdc_id -> { nutrient_id -> amount per 100 g } */
const nutrientsByFood = new Map();
for (const row of readTable('food_nutrient.csv')) {
  if (!wanted.has(row.nutrient_id) || row.amount === '') continue;
  let entry = nutrientsByFood.get(row.fdc_id);
  if (!entry) nutrientsByFood.set(row.fdc_id, (entry = {}));
  entry[row.nutrient_id] = Number(row.amount);
}

const portionsByFood = new Map();
for (const row of readTable('food_portion.csv')) {
  if (!portionsByFood.has(row.fdc_id)) portionsByFood.set(row.fdc_id, []);
  portionsByFood.get(row.fdc_id).push(row);
}

const stats = { total: foods.length, inCategory: 0, withAminoAcids: 0, afterDedupe: 0, kept: 0 };
const candidatesByCategory = new Map();

for (const food of foods) {
  const category = CATEGORIES[food.food_category_id];
  if (!category) continue;
  stats.inCategory++;

  const n = nutrientsByFood.get(food.fdc_id) ?? {};
  const ids = [...Object.values(NUTRIENT), ...Object.values(ESSENTIAL), ...Object.values(PAIRED)];
  if (!ids.every((id) => Number.isFinite(n[id]))) continue;
  if (!(n[NUTRIENT.protein] > 0)) continue;

  // Sanity check: the listed amino acids can't weigh more than the protein they are part of.
  const aminoTotal = [...Object.values(ESSENTIAL), ...Object.values(PAIRED)].reduce((sum, id) => sum + n[id], 0);
  if (aminoTotal > n[NUTRIENT.protein] * 1.05) continue;
  // All-zero amino acid rows are placeholders, not measurements.
  if (Object.values(ESSENTIAL).some((id) => n[id] <= 0)) continue;
  stats.withAminoAcids++;

  if (looksBranded(food.description)) continue;
  food.description = cleanName(food.description);

  if (!candidatesByCategory.has(food.food_category_id)) candidatesByCategory.set(food.food_category_id, []);
  candidatesByCategory.get(food.food_category_id).push({ food, n, category });
}

const output = [];
const perCategory = {};
const foundStaples = new Set();

for (const [categoryId, candidates] of candidatesByCategory) {
  const { cap, label, depth = 2 } = CATEGORIES[categoryId];

  // Keep the plainest raw and the plainest prepared version of each food.
  const best = new Map();
  for (const candidate of candidates) {
    const description = candidate.food.description;
    const key = `${groupKey(description, depth)}#${isRaw(description) ? 'raw' : 'prepared'}`;
    const current = best.get(key);
    const better =
      !current ||
      plainness(description) < plainness(current.food.description) ||
      // Exact ties go to the lower id so the output never depends on file order.
      (plainness(description) === plainness(current.food.description) &&
        Number(candidate.food.fdc_id) < Number(current.food.fdc_id));
    if (better) best.set(key, candidate);
  }
  const deduped = [...best.values()];
  stats.afterDedupe += deduped.length;

  // Pin staples: add the plainest match for each pattern if merging dropped it.
  const pinned = new Set();
  for (const pattern of STAPLES) {
    const matches = candidates
      .filter((c) => pattern.test(c.food.description))
      .sort(
        (a, b) =>
          plainness(a.food.description) - plainness(b.food.description) ||
          Number(a.food.fdc_id) - Number(b.food.fdc_id),
      );
    if (matches.length === 0) continue;
    foundStaples.add(pattern);
    pinned.add(matches[0].food.fdc_id);
    if (!deduped.includes(matches[0])) deduped.push(matches[0]);
  }

  // Within the cap, prefer the plainest descriptions (ties broken by id so output is stable).
  deduped.sort(
    (a, b) =>
      Number(pinned.has(b.food.fdc_id)) - Number(pinned.has(a.food.fdc_id)) ||
      plainness(a.food.description) - plainness(b.food.description) || Number(a.food.fdc_id) - Number(b.food.fdc_id),
  );
  const kept = deduped.slice(0, cap);
  perCategory[label] = `${kept.length} kept of ${candidates.length} with amino acid data`;

  for (const { food, n, category } of kept) {
    const serving = chooseServing(portionsByFood.get(food.fdc_id) ?? []);
    const scale = serving.grams / 100;
    const mg = (id) => Math.round(n[id] * 1000 * scale); // g per 100 g -> mg per serving

    output.push({
      id: food.fdc_id,
      name: food.description,
      category: category.label,
      servingGrams: serving.grams,
      servingLabel: serving.label,
      kcal: Math.round(n[NUTRIENT.kcal] * scale),
      proteinG: round(n[NUTRIENT.protein] * scale, 1),
      aminoAcidsMg: Object.fromEntries(Object.entries(ESSENTIAL).map(([name, id]) => [name, mg(id)])),
      pairedAminoAcidsMg: Object.fromEntries(Object.entries(PAIRED).map(([name, id]) => [name, mg(id)])),
      tags: dietTags(food.description, category.diet),
    });
  }
}

output.sort((a, b) => a.name.localeCompare(b.name, 'en') || Number(a.id) - Number(b.id));
stats.kept = output.length;

const result = {
  source:
    'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central: SR Legacy, April 2018. fdc.nal.usda.gov. Public domain (CC0 1.0).',
  notes:
    'Values are per serving. Diet tags are estimated from food names and categories, not from ingredient lists.',
  foods: output,
};

mkdirSync(dirname(OUT_FILE), { recursive: true });
const json = JSON.stringify(result);
writeFileSync(OUT_FILE, json + '\n');

console.log('\nFoods in download:           ', stats.total);
console.log('In everyday categories:      ', stats.inCategory);
console.log('...with full amino acid data:', stats.withAminoAcids);
console.log('...after merging duplicates: ', stats.afterDedupe);
console.log('Kept:                        ', stats.kept);
console.table(perCategory);
const missingStaples = STAPLES.filter((pattern) => !foundStaples.has(pattern));
if (missingStaples.length > 0) {
  console.log('\nStaples with no usable amino acid data in this download (not included):');
  for (const pattern of missingStaples) console.log('  ', pattern.source);
}
console.log(`\nWrote ${OUT_FILE} (${(json.length / 1024).toFixed(0)} KB)`);
