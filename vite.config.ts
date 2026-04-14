import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/ha-api': {
        target: 'http://192.168.100.50:8123',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ha-api/, ''),
      },
    },
  },
})
