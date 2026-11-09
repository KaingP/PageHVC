import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://hungvuongconcert.com',
  devToolbar: {
    enabled: false,
  },
  server: {
    port: 4321,
    host: true,
  },
});
