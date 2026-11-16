import { useEffect, useRef, useState } from 'react';
import { AMINO_ACIDS } from '../../lib/genetics';
import type { LoadedStructure } from '../../lib/structureApi';
import { chainColor, confidenceColor } from '../../lib/structures';
import type { TourStep } from '../../lib/structures';
import { useAppState } from '../../state/AppState';
import { hasWebGL, load3Dmol } from './threeDmol';
import type { ThreeDmol } from './threeDmol';

export type DisplayStyle = 'cartoon' | 'surface' | 'stick';
export type ColorScheme = 'chain' | 'spectrum' | 'structure' | 'confidence';

export interface ViewerSettings {
  display: DisplayStyle;
  color: ColorScheme;
  spin: boolean;
}

const NAME_BY_SHORT = new Map(Object.values(AMINO_ACIDS).map((info) => [info.short.toUpperCase(), info.name]));

/** "Chain B · Glu 6 · glutamic acid", or the raw residue name for things that aren't amino acids. */
function describeAtom(atom: { chain?: string; resn?: string; resi?: number }): string {
  const resn = (atom.resn ?? '').toUpperCase();
  const name = NAME_BY_SHORT.get(resn);
  const short = resn.charAt(0) + resn.slice(1).toLowerCase();
  const what = name ? `${short} ${atom.resi} · ${name.toLowerCase()}` : resn === 'HOH' ? 'Water' : `${resn} ${atom.resi ?? ''} (not an amino acid)`;
  return `${atom.chain ? `Chain ${atom.chain} · ` : ''}${what}`;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Base look of the whole structure, before any tour highlights. */
function applyBaseStyle(lib: ThreeDmol, viewer: ThreeDmol, chains: string[], settings: ViewerSettings) {
  viewer.removeAllSurfaces();
  viewer.setStyle({}, {});
  const kind = settings.display === 'stick' ? 'stick' : 'cartoon';
  const extra = kind === 'stick' ? { radius: 0.18 } : {};

  if (settings.display === 'surface') {
    // One surface per chain so each gets its own color (or one confidence-colored surface).
    chains.forEach((chain, index) => {
      viewer.addSurface(lib.SurfaceType.VDW, { opacity: 0.95, color: chainColor(index) }, { chain, hetflag: false });
    });
    viewer.setStyle({ hetflag: true }, { stick: { radius: 0.2 } });
  } else if (settings.color === 'confidence') {
    viewer.setStyle({}, { [kind]: { ...extra, colorfunc: (atom: { b: number }) => confidenceColor(atom.b) } });
  } else if (settings.color === 'spectrum') {
    viewer.setStyle({}, { [kind]: { ...extra, color: 'spectrum' } });
  } else if (settings.color === 'structure') {
    viewer.setStyle({}, { [kind]: { ...extra, colorscheme: 'ssPyMol' } });
  } else {
    chains.forEach((chain, index) => viewer.setStyle({ chain }, { [kind]: { ...extra, color: chainColor(index) } }));
  }

  if (settings.display === 'cartoon') {
    // Things that aren't protein (heme, zinc...) have no cartoon, so draw them as sticks.
    viewer.addStyle({ hetflag: true }, { stick: { radius: 0.2 } });
  }
  viewer.setStyle({ resn: 'HOH' }, {}); // hide water
}

function applyHighlights(viewer: ThreeDmol, step: TourStep | null) {
  for (const highlight of step?.highlights ?? []) {
    viewer.addStyle(
      highlight.selection,
      highlight.style === 'sphere'
        ? { sphere: { color: highlight.color } }
        : { stick: { color: highlight.color, radius: 0.32 } },
    );
  }
}

interface MolViewerProps {
  structure: LoadedStructure;
  settings: ViewerSettings;
  /** Current tour step, if a tour is running. */
  step?: TourStep | null;
  /** Short description for screen readers, e.g. "3D view of hemoglobin". */
  label: string;
}

type Status = 'loading' | 'ready' | 'no-webgl' | 'error';

/**
 * A 3Dmol.js viewer for one structure. Drag to rotate, scroll or pinch to zoom;
 * the buttons underneath do the same for keyboard users. Hover or tap an atom
 * to see which amino acid it belongs to.
 */
export default function MolViewer({ structure, settings, step = null, label }: MolViewerProps) {
  const { theme } = useAppState();
  const container = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ThreeDmol>(null);
  const libRef = useRef<ThreeDmol>(null);
  const chainsRef = useRef<string[]>([]);
  const focusKey = useRef<string>('');
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);
  const [picked, setPicked] = useState('');

  // Create the viewer and load the model whenever the structure changes.
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;
    setStatus('loading');
    setPicked('');
    focusKey.current = '';

    if (!hasWebGL()) {
      setStatus('no-webgl');
      return;
    }

    load3Dmol()
      .then((lib) => {
        if (cancelled) return;
        const viewer = lib.createViewer(element, { backgroundColor: 'white' });
        const model = viewer.addModel(structure.text, structure.format);
        const chains: string[] = [];
        for (const atom of model.selectedAtoms({})) {
          if (atom.chain !== undefined && !chains.includes(atom.chain)) chains.push(atom.chain);
        }
        const show = (atom: { chain?: string; resn?: string; resi?: number }) => setPicked(describeAtom(atom));
        viewer.setHoverable({}, true, show, () => {});
        viewer.setClickable({}, true, show);

        libRef.current = lib;
        viewerRef.current = viewer;
        chainsRef.current = chains;
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      try {
        viewerRef.current?.spin(false);
        viewerRef.current?.clear();
      } catch {
        // The viewer may already be gone; nothing to clean up.
      }
      viewerRef.current = null;
      element.replaceChildren();
    };
  }, [structure, attempt]);

  // Restyle when settings, tour step or theme change.
  useEffect(() => {
    const viewer = viewerRef.current;
    const lib = libRef.current;
    if (status !== 'ready' || !viewer || !lib) return;
    try {
      const styles = getComputedStyle(document.documentElement);
      viewer.setBackgroundColor(styles.getPropertyValue('--surface').trim() || (theme === 'dark' ? '#211d17' : '#ffffff'));
      applyBaseStyle(lib, viewer, chainsRef.current, settings);
      applyHighlights(viewer, step);

      // Move the camera only when the thing to look at changes, not on every restyle.
      const key = JSON.stringify(step?.focus ?? 'all');
      if (key !== focusKey.current) {
        const first = focusKey.current === '';
        focusKey.current = key;
        viewer.zoomTo(step?.focus ?? {}, first || prefersReducedMotion() ? 0 : 800);
        if (step?.focus) viewer.zoom(0.45, 0); // back off so the neighbourhood is visible
      }
      viewer.spin(settings.spin && !prefersReducedMotion() ? 'y' : false);
      viewer.render();
    } catch {
      setStatus('error');
    }
  }, [status, settings, step, theme]);

  // Keep the canvas matched to its box.
  useEffect(() => {
    const onResize = () => {
      try {
        viewerRef.current?.resize();
        viewerRef.current?.render();
      } catch {
        // Ignore: the viewer is mid-teardown.
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const act = (action: (viewer: ThreeDmol) => void) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    try {
      action(viewer);
      viewer.render();
    } catch {
      // A failed camera move is not worth interrupting the page for.
    }
  };

  return (
    <div className="mol">
      <div className="mol__stage">
        <div ref={container} className="mol__canvas" role="img" aria-label={label} />
        {status === 'loading' && (
          <p className="mol__overlay" role="status">
            Loading the 3D viewer…
          </p>
        )}
        {status === 'no-webgl' && (
          <p className="mol__overlay" role="alert">
            This browser or device can't show 3D graphics (WebGL is unavailable). The description and details
            of the protein are still below.
          </p>
        )}
        {status === 'error' && (
          <div className="mol__overlay" role="alert">
            <p>The 3D viewer didn't load. Check your connection and try again.</p>
            <button type="button" className="button button--ghost button--small" onClick={() => setAttempt((value: number) => value + 1)}>
              Try again
            </button>
          </div>
        )}
      </div>

      <div className="mol__moves" role="group" aria-label="Move the 3D view">
        <button type="button" className="button button--ghost button--small" disabled={status !== 'ready'} onClick={() => act((viewer) => viewer.rotate(-20, 'y'))}>
          ⟲ Turn left
        </button>
        <button type="button" className="button button--ghost button--small" disabled={status !== 'ready'} onClick={() => act((viewer) => viewer.rotate(20, 'y'))}>
          Turn right ⟳
        </button>
        <button type="button" className="button button--ghost button--small" disabled={status !== 'ready'} onClick={() => act((viewer) => viewer.zoom(1.25, 200))}>
          Zoom in
        </button>
        <button type="button" className="button button--ghost button--small" disabled={status !== 'ready'} onClick={() => act((viewer) => viewer.zoom(0.8, 200))}>
          Zoom out
        </button>
        <button
          type="button"
          className="button button--ghost button--small"
          disabled={status !== 'ready'}
          onClick={() => act((viewer) => viewer.zoomTo(step?.focus ?? {}, 300))}
        >
          Reset view
        </button>
      </div>

      <p className="mol__picked small" role="status">
        {picked || (status === 'ready' ? 'Drag to rotate, scroll or pinch to zoom. Hover over or tap the protein to see which amino acid you are pointing at.' : '')}
      </p>
    </div>
  );
}
