
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'three-core',
              test: /node_modules\/three\//,
            },
            {
              name: 'react-three',
              test: /node_modules\/@react-three\/(fiber|drei)\//,
            },
          ],
        },
      },
    },
  },
})
