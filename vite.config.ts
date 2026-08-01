import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true,
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    // PWA Plugin — injectManifest so src/sw.ts handles push + caching
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      includeAssets: ["robots.txt", "icons/*.png", "images/logo.svg", "images/logo.png"],
      manifest: {
        name: "Dezenmart - Decentralized Marketplace",
        short_name: "Dezenmart",
        description: "Decentralized Web3 marketplace on Celo blockchain",
        theme_color: "#ff343f",
        background_color: "#212428",
        display: "standalone",
        icons: [
          {
            src: "/icons/icon-72x72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-152x152.png",
            sizes: "152x152",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      injectManifest: {
        // Increase file size limit to allow larger assets
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}"],
        globIgnores: ["**/stats.html", "**/node_modules/**"],
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
    // Bundle analyzer (only in analyze mode) - conditionally included
    ...(process.env.ANALYZE === "true"
      ? [
          visualizer({
            open: true,
            filename: "dist/stats.html",
            gzipSize: true,
            brotliSize: true,
          }) as any,
        ]
      : []),
  ],
  server: {
    host: true,
    allowedHosts: ["footer-finer-immobile.ngrok-free.dev"]
  },
  resolve: {
    alias: {
      "@selfxyz/common/utils/appType": "@selfxyz/core",
      "@": "/src",
    },
  },
  define: {
    "process.env": {},
    global: "globalThis",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
    include: [
      "@uniswap/sdk-core",
      "@uniswap/v3-sdk",
      "@uniswap/smart-order-router",
    ],
  },
  build: {
    // Target modern browsers for smaller bundles
    target: "es2020",

    // Source maps are disabled in the build: generating them roughly doubles
    // peak memory during "rendering chunks", which OOM-killed the Netlify build
    // once the Dynamic SDK was added. Re-enable ("hidden") only on a larger
    // build instance, or upload + strip maps via the Sentry vite plugin.
    sourcemap: false,

    // Increase chunk size warning limit (Web3 libraries are large)
    chunkSizeWarningLimit: 1000,

    // Optimize build performance
    reportCompressedSize: false, // Disable gzip reporting to save memory
    modulePreload: {
      polyfill: false, // Reduce polyfill overhead
    },

    rollupOptions: {
      external: [],
      output: {
        // Function-form chunking: route heavy node_modules (incl. transitive
        // deps like @reown, @base-org, ox) into their own chunks by path. This
        // keeps each rendered chunk small, which is what keeps peak build memory
        // under the CI/Netlify container limit. Order = most specific first.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          const nm = id.replace(/\\/g, "/");

          if (nm.includes("/@dynamic-labs/")) return "vendor-dynamic";
          if (
            nm.includes("/@reown/") ||
            nm.includes("/@walletconnect/") ||
            nm.includes("/@base-org/") ||
            nm.includes("/@coinbase/")
          )
            return "vendor-wallet-extras";
          if (nm.includes("/ox/")) return "vendor-ox";
          if (nm.includes("/@uniswap/") || nm.includes("/ethers/")) return "vendor-uniswap";
          if (nm.includes("/@mento-protocol/")) return "vendor-mento";
          if (nm.includes("/wagmi/") || nm.includes("/@wagmi/") || nm.includes("/viem/"))
            return "vendor-web3-core";
          if (nm.includes("/@selfxyz/")) return "vendor-self";
          if (nm.includes("/@reduxjs/") || nm.includes("/react-redux/")) return "vendor-redux";
          if (
            nm.includes("/react-dom/") ||
            nm.includes("/react-router") ||
            nm.includes("/react/")
          )
            return "vendor-react";
          if (nm.includes("/framer-motion/") || nm.includes("/@react-md/")) return "vendor-ui";
          if (nm.includes("/lodash") || nm.includes("/uuid/")) return "vendor-utils";
          // Long tail: let Rollup split the rest on its own.
          return;
        },

        // Optimize chunk names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split("/").pop()
            : "chunk";
          return `assets/js/[name]-[hash].js`;
        },

        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },

      onwarn(warning, warn) {
        if (
          warning.code === "MISSING_EXPORT" &&
          warning.message.includes("@selfxyz/qrcode") &&
          warning.message.includes("SelfApp")
        ) {
          return;
        }
        warn(warning);
      },
    },

    commonjsOptions: {
      transformMixedEsModules: true,
      ignoreTryCatch: true, // Prevent issues with try-catch detection
    },

    // esbuild minify uses far less memory than terser (which OOM-killed the
    // Netlify build after the Dynamic SDK was added). Console/debugger removal
    // is handled by `esbuild.drop` below - same effect as terser drop_console.
    minify: "esbuild",
  },

  // Strip console/debugger in production (was terser drop_console).
  esbuild: {
    drop: ["console", "debugger"],
  },
});
