import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        about: fileURLToPath(new URL('./about.html', import.meta.url)),
      },
    },
  },
  plugins: [
    {
      name: 'about-page-route',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/about' || req.url === '/about/') {
            req.url = '/about.html'
          }
          next()
        })
      },
    },
  ],
})
