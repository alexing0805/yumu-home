import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/ha-api': {
          target: env.VITE_HA_TARGET || 'http://192.168.100.50:8123',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/ha-api/, ''),
        },
      },
    },
  }
})
