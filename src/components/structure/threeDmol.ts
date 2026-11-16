/**
 * Loads 3Dmol.js on demand from cdnjs, so the 3D library (about 0.5 MB) is only
 * downloaded when someone opens the Structure stage. The version is pinned.
 */
const SCRIPT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.5.5/3Dmol-min.js';

// 3Dmol.js is used through its global; its API is typed loosely here on purpose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ThreeDmol = any;

declare global {
  interface Window {
    $3Dmol?: ThreeDmol;
  }
}

let pending: Promise<ThreeDmol> | null = null;

export function load3Dmol(): Promise<ThreeDmol> {
  if (window.$3Dmol) return Promise.resolve(window.$3Dmol);
  if (!pending) {
    pending = new Promise<ThreeDmol>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => (window.$3Dmol ? resolve(window.$3Dmol) : reject(new Error('3Dmol.js loaded but is unavailable')));
      script.onerror = () => {
        script.remove();
        reject(new Error('3Dmol.js failed to load'));
      };
      document.head.appendChild(script);
    }).catch((error) => {
      pending = null; // allow a retry
      throw error;
    });
  }
  return pending;
}

/** True if the browser can create a WebGL context, which the viewer needs. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
