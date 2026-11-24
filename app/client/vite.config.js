import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/sw/',
  build: { outDir: '../../Skill_exchange-backend/backend/public/sw', emptyOutDir: true },
});
