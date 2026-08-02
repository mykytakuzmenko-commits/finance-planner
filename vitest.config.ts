import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so the production build never depends on vitest.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
