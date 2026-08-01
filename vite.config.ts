import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// On Vercel, VERCEL_GIT_COMMIT_SHA is set during the build; locally it is unset.
const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev'

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_COMMIT__: JSON.stringify(commit),
  },
  plugins: [react()],
})
