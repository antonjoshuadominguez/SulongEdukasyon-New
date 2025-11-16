import { defineConfig } from 'vite'

export default defineConfig({
  root: './client',
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
})