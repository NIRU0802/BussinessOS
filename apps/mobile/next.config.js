const isDev = process.env.NODE_ENV === "development";

/** @type {import('next').NextConfig} */
const baseConfig = {
  reactStrictMode: true,
};

// -----------------------------------------------------------------------
// next-pwa injects a webpack() config function into next.config.js. Next.js
// 16 defaults to Turbopack for `next dev`, and having any webpack config
// present without an explicit `turbopack` key causes a hard error at dev
// startup — even when next-pwa's own `disable` flag is set to true for
// development, since that flag only skips service-worker *generation*, not
// the webpack config injection itself.
//
// Fix: only wrap with next-pwa for production builds (`next build`, which
// still uses webpack under the hood for this plugin). Dev always runs
// plain Turbopack with zero PWA involvement — correct anyway, since the
// service worker should never run against a dev server.
// -----------------------------------------------------------------------

let nextConfig = baseConfig;

if (!isDev) {
  const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
    runtimeCaching: [
      {
        urlPattern: /^https?.*\/api\/.*/,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /\.(?:js|css)$/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-resources",
        },
      },
      {
        urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "font-assets",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "image-assets",
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
        },
      },
    ],
  });

  nextConfig = withPWA(baseConfig);
}

module.exports = nextConfig;
