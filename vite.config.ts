import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    // Set the output directory to the Spring Boot static resources folder
    outDir: path.resolve(__dirname, '../websocket-spring-back/src/main/resources/static'),
    emptyOutDir: true, // Clean the output directory before building
  },
  // Base path for assets - using absolute path
  base: '/',
})
