import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Set by the GitHub Pages workflow:
//   stable build: BASE=/fitpacer/      CHANNEL=stable
//   dev build:    BASE=/fitpacer/dev/  CHANNEL=dev
const isDev = process.env.CHANNEL === "dev";

export default defineConfig({
  base: process.env.BASE || "/",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: isDev ? "FitPacer DEV" : "FitPacer",
        short_name: isDev ? "FitPacer DEV" : "FitPacer",
        description: "Vous cadence pendant une séance préparée par Claude.",
        lang: "fr",
        start_url: ".",
        scope: ".",
        display: "standalone",
        orientation: "portrait",
        background_color: "#101C26",
        theme_color: "#101C26",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // The dev site lives under the stable one (/fitpacer/dev/): the stable service worker
        // must not answer its navigations with the stable index.html.
        navigateFallbackDenylist: isDev ? [] : [/\/dev\//],
      },
    }),
  ],
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
