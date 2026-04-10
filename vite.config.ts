import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import jsxLocPlugin from '@builder.io/vite-plugin-jsx-loc' // ✅ fixed import
import path from 'path'

// Custom plugins
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: { src: "/manus/debug-collector.js", defer: true },
            injectTo: "head",
          },
        ],
      }
    },
    configureServer(server) {
      server.middlewares.use("/manus/logs", (req, res, next) => {
        if (req.method !== "POST") return next()

        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) writeToLogFile("browserConsole", payload.consoleLogs)
          if (payload.networkRequests?.length > 0) writeToLogFile("networkRequests", payload.networkRequests)
          if (payload.sessionEvents?.length > 0) writeToLogFile("sessionReplay", payload.sessionEvents)

          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ success: true }))
        }

        let body = ""
        req.on("data", (chunk) => { body += chunk.toString() })
        req.on("end", () => {
          try {
            const payload = JSON.parse(body)
            handlePayload(payload)
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, error: String(e) }))
          }
        })
      })
    },
  }
}

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  vitePluginManusRuntime(),
  vitePluginManusDebugCollector(),
]

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/client"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(import.meta.dirname, "client/index.html"),
    },
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["/.*"],
    },
  },
})
