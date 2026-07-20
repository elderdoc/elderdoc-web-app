import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Create a mock server-only module for testing
const serverOnlyMockPath = path.resolve(import.meta.dirname, '.vitest-server-only.js')
if (!fs.existsSync(serverOnlyMockPath)) {
  fs.writeFileSync(serverOnlyMockPath, 'export default {};\n')
}

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
      'server-only': serverOnlyMockPath,
    },
  },
})
