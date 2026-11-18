import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: [
        'brand/brasao-192.png',
        'brand/brasao-512.png',
        'brand/brasao-maskable-512.png',
        'brand/apple-touch-icon.png',
      ],
      manifest: {
        id: '/',
        name: 'Jogos Interclasses 2026',
        short_name: 'Interclasses',
        description:
          'Programação, resultados, classificação, documentos e notícias dos Jogos Interclasses 2026 da Escola Estadual Celso Rodrigues.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        background_color: '#f5f2ea',
        theme_color: '#08284a',
        categories: ['sports', 'education'],
        prefer_related_applications: false,
        icons: [
          {
            src: 'brand/brasao-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'brand/brasao-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'brand/brasao-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Programação',
            short_name: 'Jogos',
            description: 'Ver a tabela de jogos',
            url: '/programacao',
            icons: [{ src: 'brand/brasao-192.png', sizes: '192x192' }],
          },
          {
            name: 'Classificação',
            short_name: 'Tabela',
            description: 'Ver a classificação geral',
            url: '/classificacao',
            icons: [{ src: 'brand/brasao-192.png', sizes: '192x192' }],
          },
          {
            name: 'Resultados',
            short_name: 'Placar',
            description: 'Ver os resultados oficiais',
            url: '/resultados',
            icons: [{ src: 'brand/brasao-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        navigateFallback: '/offline.html',
        globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
