/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: { cssMinify: false },
  // e2e/*.spec.ts belongs to Playwright, not vitest
  test: { include: ['src/**/*.test.ts'] },
})
