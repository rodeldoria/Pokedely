import { defineConfig } from 'vite';

// `base` is set to './' so the built bundle works both at the GitHub Pages
// subpath (https://<user>.github.io/Pokedely/) and at the local dev root.
export default defineConfig({
  base: './',
  server: { host: true, port: 5173, open: false },
  build: { target: 'es2020', sourcemap: true }
});
