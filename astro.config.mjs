import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Server mode for API routes
  adapter: netlify(), // Deploy to Netlify with serverless functions
  vite: {
    plugins: [tailwindcss()],
  },
});
