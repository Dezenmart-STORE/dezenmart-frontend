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

    // Enable source maps for production debugging (Sentry)
    sourcemap: true,

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
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core
          "vendor-react": ["react", "react-dom", "react-router-dom"],

          // Redux ecosystem
          "vendor-redux": [
            "@reduxjs/toolkit",
            "react-redux",
          ],

          // Web3 core (wagmi, viem)
          "vendor-web3-core": [
            "wagmi",
            "viem",
            "@wagmi/core",
          ],

          // Uniswap SDKs + Ethers (bundled together to avoid circular dependency)
          "vendor-uniswap": [
            "@uniswap/sdk-core",
            "@uniswap/v3-sdk",
            "@uniswap/smart-order-router",
            "ethers",
          ],

          // Mento SDK
          "vendor-mento": ["@mento-protocol/mento-sdk"],

          // WalletConnect
          "vendor-walletconnect": [
            "@walletconnect/ethereum-provider",
            "@walletconnect/modal",
          ],

          // UI libraries
          "vendor-ui": [
            "framer-motion",
            "@react-md/layout",
            "@react-md/app-bar",
            "@react-md/form",
            "@react-md/tabs",
          ],

          // Utilities
          "vendor-utils": [
            "lodash-es",
            "uuid",
          ],

          // Self verification
          "vendor-self": [
            "@selfxyz/core",
            "@selfxyz/qrcode",
          ],
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

    // Minification options
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info"], // Remove specific console methods
      },
      format: {
        comments: false, // Remove comments
      },
    },
  },
});
