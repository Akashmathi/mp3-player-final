import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env': {},
  },
  server: {
    host: true, // Allow external access (for mobile testing)
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
    minify: true,
  },
})
