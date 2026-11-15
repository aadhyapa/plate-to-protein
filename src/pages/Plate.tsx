import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import MealContents from '../components/MealContents';
import CompareChart from '../components/plate/CompareChart';
import FoodCard from '../components/plate/FoodCard';
import GoalCalculator from '../components/plate/GoalCalculator';
import { useFoods } from '../hooks/useFoods';
import type { Food } from '../lib/food';
import { HIGH_PROTEIN_PER_100_KCAL, PATTERN_SOURCE } from '../lib/nutrition';
import { PRESET_MEALS } from '../lib/presets';
import { NO_FILTERS, searchFoods } from '../lib/search';
import type { FoodFilters } from '../lib/search';
import { useAppState } from '../state/AppState';

const PAGE_SIZE = 24;
const MAX_COMPARE = 3;

export default function Plate() {
  const foods = useFoods(true);
  const { replaceMeal } = useAppState();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FoodFilters>(NO_FILTERS);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  // Keeps typing responsive: the list re-filters just after the keystroke.
  const deferredQuery = useDeferredValue(query);

  const library = foods.status === 'ready' ? foods.library : null;

  const results = useMemo(
    () => (library ? searchFoods(library.index, deferredQuery, filters) : []),
    [library, deferredQuery, filters],
  );

  // A new search starts back at the first page of results.
  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [deferredQuery, filters]);

  const compared: Food[] = library
    ? compareIds.map((id) => library.byId.get(id)).filter((food): food is Food => food !== undefined)
    : [];

  const toggleCompare = (food: Food) => {
    setCompareIds((ids: string[]) =>
      ids.includes(food.id)
        ? ids.filter((id) => id !== food.id)
        : ids.length < MAX_COMPARE
          ? [...ids, food.id]
          : ids,
    );
  };

  const setFilter = (change: Partial<FoodFilters>) => setFilters((current: FoodFilters) => ({ ...current, ...change }));

  return (
    <div className="plate">
      <div className="plate__main">
        <header className="stage plate__intro">
          <p className="eyebrow">Stage 1 of 4 · Plate</p>
          <h1 className="stage__title">Build your meal</h1>
          <p className="stage__blurb">
            Search real foods, see how much protein they hold, and put together the meal that will travel
            with you through the rest of the journey.
          </p>
        </header>

        <section aria-labelledby="presets-heading" className="presets">
          <h2 id="presets-heading" className="section-title">
            Start from a preset meal
          </h2>
          <ul className="presets__list">
            {PRESET_MEALS.map((preset) => (
              <li key={preset.id}>
                <button type="button" className="preset" onClick={() => replaceMeal(preset.items)}>
                  <span className="preset__name">{preset.name}</span>
                  <span className="preset__description">{preset.description}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="small muted">Choosing a preset replaces your current meal.</p>
        </section>

        <GoalCalculator />

        {compared.length > 0 && <CompareChart foods={compared} onRemove={toggleCompare} />}

        <section aria-labelledby="search-heading" className="search">
          <h2 id="search-heading" className="section-title">
            Find foods
          </h2>
          <label className="visually-hidden" htmlFor="food-search">
            Search foods
          </label>
          <input
            id="food-search"
            className="input search__input"
            type="search"
            placeholder="Search foods, e.g. lentils, chicken breast, tofu"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />

          <div className="filters" role="group" aria-label="Filters">
            <label className="chip">
              <input
                type="checkbox"
                checked={filters.vegetarian}
                onChange={(event) => setFilter({ vegetarian: event.target.checked })}
              />
              <span>Vegetarian</span>
            </label>
            <label className="chip">
              <input type="checkbox" checked={filters.vegan} onChange={(event) => setFilter({ vegan: event.target.checked })} />
              <span>Vegan</span>
            </label>
            <label className="chip">
              <input
                type="checkbox"
                checked={filters.highProtein}
                onChange={(event) => setFilter({ highProtein: event.target.checked })}
              />
              <span>High protein ({HIGH_PROTEIN_PER_100_KCAL} g+ per 100 kcal)</span>
            </label>
            <select
              className="input input--small filters__category"
              aria-label="Food category"
              value={filters.category}
              onChange={(event) => setFilter({ category: event.target.value })}
            >
              <option value="">All categories</option>
              {(library?.categories ?? []).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {foods.status === 'loading' && (
            <p className="muted" role="status">
              Loading foods…
            </p>
          )}
          {foods.status === 'error' && (
            <div role="alert" className="card">
              <p>The food list didn't load. Check your connection and try again.</p>
              <button type="button" className="button button--ghost" onClick={foods.retry}>
                Try again
              </button>
            </div>
          )}

          {library && (
            <>
              <p className="small muted" role="status">
                {results.length === 0
                  ? 'No foods match. Try a shorter search or fewer filters.'
                  : `${results.length} ${results.length === 1 ? 'food' : 'foods'}${
                      deferredQuery.trim() ? '' : ', highest protein per serving first'
                    }`}
              </p>
              <ul className="foods">
                {results.slice(0, shown).map((food) => (
                  <FoodCard
                    key={food.id}
                    food={food}
                    comparing={compareIds.includes(food.id)}
                    canCompare={compareIds.length < MAX_COMPARE}
                    onToggleCompare={toggleCompare}
                  />
                ))}
              </ul>
              {results.length > shown && (
                <button type="button" className="button button--ghost" onClick={() => setShown((count: number) => count + PAGE_SIZE)}>
                  Show more foods
                </button>
              )}
              <p className="small muted plate__sources">
                Nutrient values: {library.data.source} “Complete protein” means at least 80% of the reference
                pattern for all nine essential amino acids ({PATTERN_SOURCE}). Vegetarian and vegan labels are
                estimated from food names and categories.
              </p>
            </>
          )}
        </section>
      </div>

      <aside className="plate__side" aria-label="My meal">
        <div className="card plate__meal">
          <MealContents headingId="meal-side-heading" />
        </div>
      </aside>
    </div>
  );
}
