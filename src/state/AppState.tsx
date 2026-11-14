import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { loadState, saveState } from './storage';
import type { AppState, StageId, Theme } from './types';

interface AppStateValue {
  state: AppState;
  /** The theme actually shown: the saved choice, or the device setting. */
  theme: Theme;
  toggleTheme: () => void;
  completeStage: (stage: StageId) => void;
  /** Escape hatch for stage-specific updates added in later milestones. */
  update: (change: (previous: AppState) => AppState) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

function usePrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return prefersDark;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const prefersDark = usePrefersDark();
  const theme: Theme = state.theme ?? (prefersDark ? 'dark' : 'light');

  // Persist on every change. saveState swallows storage errors.
  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setState((previous) => {
      const shown = previous.theme ?? (window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light');
      return { ...previous, theme: shown === 'dark' ? 'light' : 'dark' };
    });
  }, []);

  const completeStage = useCallback((stage: StageId) => {
    setState((previous) =>
      previous.completedStages.includes(stage)
        ? previous
        : { ...previous, completedStages: [...previous.completedStages, stage] },
    );
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({ state, theme, toggleTheme, completeStage, update: setState }),
    [state, theme, toggleTheme, completeStage],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside <AppStateProvider>');
  return value;
}
