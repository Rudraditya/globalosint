import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      '/yahoo-finance': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yahoo-finance/, ''),
      },
      '/api/pm2': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: false,
      },
      '/fluentax': {
        target: 'https://fx-api.fluentax.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fluentax/, ''),
      },
      '/newsapi': {
        target: 'https://newsapi.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/newsapi/, ''),
      },
      '/eurostat-api': {
        target: 'https://ec.europa.eu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/eurostat-api/, ''),
      },
      '/imf-data': {
        target: 'https://dataservices.imf.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/imf-data/, ''),
      },
    },
  },
})
