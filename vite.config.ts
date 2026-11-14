import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Netlify serves the site from the domain root, so no `base` is needed.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
