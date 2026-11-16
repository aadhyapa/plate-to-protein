import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { STAGES } from './lib/stages';
import About from './pages/About';
import Cell from './pages/Cell';
import Gut from './pages/Gut';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';
import Plate from './pages/Plate';
import StagePage from './pages/StagePage';
import Structure from './pages/Structure';
import type { StageId } from './state/types';

/** Built stages. Any stage not listed here shows its placeholder. */
const STAGE_PAGES: Partial<Record<StageId, ReactElement>> = {
  plate: <Plate />,
  gut: <Gut />,
  cell: <Cell />,
  structure: <Structure />,
};

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        {/* One route per stage, in journey order. */}
        {STAGES.map((stage) => (
          <Route key={stage.id} path={stage.path} element={STAGE_PAGES[stage.id] ?? <StagePage stage={stage} />} />
        ))}
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
