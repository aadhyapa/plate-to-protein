import { useEffect, useRef } from 'react';
import { useAppState } from '../state/AppState';
import MealContents from './MealContents';

/**
 * The meal as a drawer: a bottom sheet on phones, a side panel on wider screens.
 * Uses the native <dialog>, which handles focus trapping and Escape.
 */
export default function MealDrawer() {
  const { mealOpen, setMealOpen } = useAppState();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (mealOpen && !dialog.open) dialog.showModal();
    if (!mealOpen && dialog.open) dialog.close();
  }, [mealOpen]);

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby="meal-drawer-heading"
      onClose={() => setMealOpen(false)}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) setMealOpen(false);
      }}
    >
      <div className="drawer__body">
        <button type="button" className="icon-button drawer__close" onClick={() => setMealOpen(false)} aria-label="Close my meal">
          ×
        </button>
        {mealOpen && <MealContents headingId="meal-drawer-heading" onNavigate={() => setMealOpen(false)} />}
      </div>
    </dialog>
  );
}
