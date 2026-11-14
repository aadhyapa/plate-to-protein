import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { STAGES } from './lib/stages';
import About from './pages/About';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';
import StagePage from './pages/StagePage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        {/* One route per stage. Each placeholder is replaced as its milestone lands. */}
        {STAGES.map((stage) => (
          <Route key={stage.id} path={stage.path} element={<StagePage stage={stage} />} />
        ))}
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
