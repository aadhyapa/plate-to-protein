import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { stageForPath } from '../lib/stages';
import Footer from './Footer';
import MealPill from './MealPill';
import StageTracker from './StageTracker';
import ThemeToggle from './ThemeToggle';

export default function Layout() {
  const { pathname } = useLocation();
  const stage = stageForPath(pathname);

  // Start each page at the top, like a normal page load.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    // data-stage switches the accent color for the whole page (see global.css).
    <div className="app" data-stage={stage?.id ?? 'home'}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header__bar">
          <Link className="brand" to="/">
            <span className="brand__mark" aria-hidden="true" />
            Plate to Cell
          </Link>
          <div className="site-header__actions">
            <Link className="text-link" to="/about">
              About
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <StageTracker />
      </header>
      <main id="main" className="main" tabIndex={-1}>
        <Outlet />
      </main>
      {stage && <MealPill />}
      <Footer />
    </div>
  );
}
