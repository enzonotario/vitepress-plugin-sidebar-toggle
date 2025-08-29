import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'vitepress-plugin-sidebar-toggle',
      fileName: 'vitepress-plugin-sidebar-toggle',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['vue', 'vitepress'],
      output: {
        globals: {
          vue: 'Vue',
          vitepress: 'VitePress',
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
})
