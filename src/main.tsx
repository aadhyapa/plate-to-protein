import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppStateProvider } from './state/AppState';
import './styles/global.css';
import './styles/plate.css';
import './styles/gut.css';
import './styles/cell.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStateProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppStateProvider>
  </StrictMode>,
);
