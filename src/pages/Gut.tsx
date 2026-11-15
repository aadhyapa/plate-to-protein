import { Link } from 'react-router-dom';
import AminoChart from '../components/gut/AminoChart';
import Digestion from '../components/gut/Digestion';
import FixIt from '../components/gut/FixIt';
import Quiz from '../components/gut/Quiz';
import { useFoods } from '../hooks/useFoods';
import type { Food } from '../lib/food';
import { aminoProfile, foodAmounts, formatGrams, limitingAminoAcid, mealTotals } from '../lib/nutrition';
import { PRESET_MEALS } from '../lib/presets';
import { suggestFoods } from '../lib/suggest';
import { useAppState } from '../state/AppState';

/** Shown when the visitor hasn't built a meal: plain pasta makes the limiting amino acid easy to see. */
const SAMPLE = PRESET_MEALS.find((preset) => preset.id === 'pasta-only') ?? PRESET_MEALS[0];

const RICE_ID = '169757';
const BEANS_ID = '173735';

const VEGETARIAN_SOURCE =
  'Melina, Craig & Levin, "Position of the Academy of Nutrition and Dietetics: Vegetarian Diets", J Acad Nutr Diet 116(12), 2016';

export default function Gut() {
  const foods = useFoods(true);
  const { state, addToMeal, replaceMeal, completeStage } = useAppState();

  const intro = (
    <header className="stage">
      <p className="eyebrow">Stage 2 of 4 · Gut</p>
      <h1 className="stage__title">Break it down</h1>
      <p className="stage__blurb">
        Your body can't use the proteins in food as they are. It takes them apart into amino acids first.
        Scroll to follow your meal through digestion, then see which amino acids it delivers.
      </p>
    </header>
  );

  if (foods.status !== 'ready') {
    return (
      <div className="gut">
        {intro}
        {foods.status === 'loading' ? (
          <p className="muted" role="status">
            Loading foods…
          </p>
        ) : (
          <div role="alert" className="card">
            <p>The food list didn't load. Check your connection and try again.</p>
            <button type="button" className="button button--ghost" onClick={foods.retry}>
              Try again
            </button>
          </div>
        )}
      </div>
    );
  }

  const { byId, foods: allFoods } = foods.library;
  const usingSample = state.meal.length === 0;
  const meal = usingSample ? SAMPLE.items : state.meal;

  const totals = mealTotals(meal, byId);
  const profile = aminoProfile(totals);
  const lowest = limitingAminoAcid(totals);
  const limiting = lowest && lowest.ratio < 1 ? lowest : null;
  const suggestions = limiting ? suggestFoods(meal, allFoods, byId) : [];

  // Adding a fix to the sample meal turns the sample into the visitor's own meal.
  const addFix = (food: Food) => {
    if (usingSample) replaceMeal([...SAMPLE.items, { foodId: food.id, servings: 1 }]);
    else addToMeal(food.id, 1);
  };

  // Live numbers for the rice-and-beans lesson.
  const rice = byId.get(RICE_ID);
  const beans = byId.get(BEANS_ID);
  const riceScore = rice ? limitingAminoAcid(foodAmounts(rice)) : null;
  const beansScore = beans ? limitingAminoAcid(foodAmounts(beans)) : null;
  const togetherScore =
    rice && beans
      ? limitingAminoAcid(
          mealTotals(
            [
              { foodId: RICE_ID, servings: 1 },
              { foodId: BEANS_ID, servings: 1 },
            ],
            byId,
          ),
        )
      : null;

  return (
    <div className="gut">
      {intro}

      {usingSample && (
        <div className="card sample" role="note">
          <p>
            <strong>You haven't built a meal yet</strong>, so this page is using a sample: {SAMPLE.name.toLowerCase()} (
            {SAMPLE.description.toLowerCase()}).
          </p>
          <div className="sample__actions">
            <Link className="button button--primary button--small" to="/plate">
              Build my own meal
            </Link>
            <button type="button" className="button button--ghost button--small" onClick={() => replaceMeal(SAMPLE.items)}>
              Keep this sample as my meal
            </button>
          </div>
        </div>
      )}

      <Digestion meal={meal} foodsById={byId} />

      <section aria-labelledby="profile-heading" className="profile">
        <h2 id="profile-heading" className="section-title">
          {usingSample ? "The sample meal's amino acid profile" : "My meal's amino acid profile"}
        </h2>
        <p className="profile__summary" role="status">
          {formatGrams(totals.proteinG)} g of protein.{' '}
          {limiting ? (
            <>
              The limiting amino acid is <strong>{limiting.label.toLowerCase()}</strong>, at{' '}
              {Math.round(limiting.ratio * 100)}% of the reference pattern.
            </>
          ) : (
            <>
              <strong>Every essential amino acid meets the reference pattern.</strong>
              {lowest && ` The lowest is ${lowest.label.toLowerCase()} at ${Math.round(lowest.ratio * 100)}%.`}
            </>
          )}
        </p>
        <AminoChart profile={profile} limiting={limiting} />
      </section>

      {limiting && <FixIt limiting={limiting} suggestions={suggestions} onAdd={addFix} />}

      <section aria-labelledby="lesson-heading" className="lesson">
        <h2 id="lesson-heading" className="section-title">
          Complementary proteins
        </h2>
        <p>
          Different foods run short on different amino acids. Grains such as rice, wheat and corn are low in
          lysine. Beans and lentils have plenty of lysine, and their weakest point is methionine and cysteine,
          which grains have more of. Eat them together and each makes up for where the other is weakest. That
          is why rice and beans, hummus and pita, and peanut
          butter on bread show up in kitchens all over the world.
        </p>
        {riceScore && beansScore && togetherScore && (
          <ul className="lesson__compare">
            <li>
              <span className="lesson__food">White rice alone</span>
              <span className="lesson__score">{Math.round(riceScore.ratio * 100)}%</span>
              <span className="small muted">lowest: {riceScore.label.toLowerCase()}</span>
            </li>
            <li>
              <span className="lesson__food">Black beans alone</span>
              <span className="lesson__score">{Math.round(beansScore.ratio * 100)}%</span>
              <span className="small muted">lowest: {beansScore.label.toLowerCase()}</span>
            </li>
            <li className="is-together">
              <span className="lesson__food">One cup of each, together</span>
              <span className="lesson__score">{Math.round(togetherScore.ratio * 100)}%</span>
              <span className="small muted">lowest: {togetherScore.label.toLowerCase()}</span>
            </li>
          </ul>
        )}
        <p>
          You don't have to combine them on the same plate. Eating a variety of plant foods over the course of
          a day supplies enough of every essential amino acid, as long as you are eating enough overall.
        </p>
        <p className="small muted">
          Percentages are each food's lowest amino acid against the reference pattern, from USDA FoodData
          Central values. Source for the guidance on variety: {VEGETARIAN_SOURCE}.
        </p>
      </section>

      <Quiz />

      <div className="stage__nav">
        <Link className="button button--primary" to="/cell" onClick={() => completeStage('gut')}>
          Next: Cell →
        </Link>
      </div>
    </div>
  );
}
