import { useEffect, useRef, useState } from 'react';
import type { Food } from '../../lib/food';
import { splitFoodName } from '../../lib/nutrition';
import type { MealItem } from '../../state/types';
import { DIGESTION_SOURCE, DIGESTION_STEPS } from './steps';

const MAX_ROWS = 4;

/** 6–12 beads per food, roughly one per 2 g of protein. */
function beadCount(proteinG: number): number {
  return Math.max(6, Math.min(12, Math.round(proteinG / 2)));
}

/** Simplified digestive tract. The organ for the current step is highlighted. */
function TractDiagram({ active }: { active: number }) {
  const on = (index: number) => (active === index ? 'tract__part is-active' : 'tract__part');
  return (
    <svg
      className="tract"
      viewBox="0 0 200 320"
      role="img"
      aria-label={`Diagram of the digestive tract: mouth, stomach, small intestine and bloodstream. Current step: ${DIGESTION_STEPS[active].organ}.`}
    >
      {/* Mouth */}
      <g className={on(0)}>
        <ellipse className="tract__fill" cx="100" cy="30" rx="36" ry="17" />
        <text x="100" y="35" textAnchor="middle">Mouth</text>
      </g>
      {/* Esophagus */}
      <path className="tract__tube" d="M100 47 L100 88" />
      {/* Stomach */}
      <g className={on(1)}>
        <path className="tract__fill" d="M96 86 C150 80 168 128 140 152 C116 172 72 164 66 138 C62 118 78 108 96 106 Z" />
        <text x="112" y="132" textAnchor="middle">Stomach</text>
      </g>
      {/* Small intestine */}
      <g className={on(2)}>
        <path
          className="tract__coil"
          d="M86 166 C44 172 44 196 92 198 C140 200 140 224 92 226 C44 228 44 252 92 254 C128 256 138 270 112 280"
        />
        <text x="92" y="304" textAnchor="middle">Small intestine</text>
      </g>
      {/* Bloodstream */}
      <g className={on(3)}>
        <path className="tract__vessel" d="M150 196 C186 214 186 262 152 282" />
        <path className="tract__arrow" d="M128 212 L146 212 M128 240 L150 240" />
        <text x="176" y="186" textAnchor="middle">Blood</text>
      </g>
    </svg>
  );
}

interface DigestionProps {
  meal: MealItem[];
  foodsById: Map<string, Food>;
}

/**
 * Scroll-driven walkthrough of protein digestion. The diagram and the meal's bead
 * chains stay pinned while the four steps scroll past; whichever step crosses the
 * middle of the screen becomes the active one.
 */
export default function Digestion({ meal, foodsById }: DigestionProps) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = stepRefs.current.indexOf(entry.target as HTMLElement);
            if (index >= 0) setActive(index);
          }
        }
      },
      // A thin band across the middle of the viewport.
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    );
    for (const element of stepRefs.current) if (element) observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const rows = meal
    .map((item) => ({ item, food: foodsById.get(item.foodId) }))
    .filter((row): row is { item: MealItem; food: Food } => row.food !== undefined);
  const hidden = Math.max(0, rows.length - MAX_ROWS);
  const step = DIGESTION_STEPS[active];

  return (
    <section className="digest" aria-labelledby="digest-heading">
      <h2 id="digest-heading" className="section-title">
        Follow your meal through digestion
      </h2>
      <div className="digest__layout">
        <div className="digest__visual" data-step={step.id}>
          <TractDiagram active={active} />
          <div className="digest__beads">
            <p className="digest__where">
              <strong>{step.organ}</strong>
              <span className="small muted"> · {step.beadNote}</span>
            </p>
            <ul className="chains" aria-hidden="true">
              {rows.slice(0, MAX_ROWS).map(({ item, food }, rowIndex) => (
                <li key={item.foodId} className="chains__row">
                  <span className="chains__name">{splitFoodName(food.name).title}</span>
                  <span className="chain" data-step={step.id}>
                    {Array.from({ length: beadCount(food.proteinG * item.servings) }, (_, index) => (
                      <i key={index} className="bead" data-hue={(index + rowIndex * 2) % 5} style={{ animationDelay: `${(index % 5) * 0.3}s` }} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            {hidden > 0 && <p className="small muted">and {hidden} more {hidden === 1 ? 'food' : 'foods'} in your meal</p>}
          </div>
        </div>

        <ol className="digest__steps">
          {DIGESTION_STEPS.map((item, index) => (
            <li
              key={item.id}
              ref={(element) => {
                stepRefs.current[index] = element;
              }}
              className={`digest__step${index === active ? ' is-active' : ''}`}
            >
              <p className="eyebrow">
                Step {index + 1} of {DIGESTION_STEPS.length} · {item.organ}
              </p>
              <h3 className="digest__title">{item.title}</h3>
              <p>{item.body}</p>
              {item.taps.map((tap) => (
                <details key={tap.question} className="tap">
                  <summary>{tap.question}</summary>
                  <p>{tap.answer}</p>
                </details>
              ))}
            </li>
          ))}
        </ol>
      </div>
      <p className="small muted">
        Source:{' '}
        <a href={DIGESTION_SOURCE.url} target="_blank" rel="noreferrer">
          {DIGESTION_SOURCE.label}
        </a>
        .
      </p>
    </section>
  );
}
