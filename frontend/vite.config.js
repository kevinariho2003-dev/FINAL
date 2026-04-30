import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cache bust: 1772645000
// Forced restart to clear 34-hour memory cache
export default defineConfig({
  plugins: [react()],
})
