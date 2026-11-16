import { useEffect, useState } from 'react';
import { StructureNotFoundError, loadStructure } from '../../lib/structureApi';
import type { LoadedStructure } from '../../lib/structureApi';
import type { StructureRef } from '../../lib/structures';

export type StructureState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; structure: LoadedStructure };

/** Fetch a structure and its details. Re-runs when the id changes. */
export function useStructure(ref: StructureRef | null): StructureState {
  const [state, setState] = useState<StructureState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const key = ref ? `${ref.source}:${ref.id}` : '';

  useEffect(() => {
    if (!ref) return;
    let cancelled = false;
    setState({ status: 'loading' });
    loadStructure(ref)
      .then((structure) => {
        if (!cancelled) setState({ status: 'ready', structure });
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof StructureNotFoundError) setState({ status: 'not-found' });
        else setState({ status: 'error', retry: () => setAttempt((value: number) => value + 1) });
      });
    return () => {
      cancelled = true;
    };
    // `key` stands in for `ref`, which is a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  return state;
}
