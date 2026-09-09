import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const TF_STUB = `
const tf = globalThis.tf;
if (!tf) {
  throw new Error("TensorFlow.js vendor script missing. Reload the page.");
}
export default tf;
export const setBackend = (...args) => tf.setBackend(...args);
export const ready = (...args) => tf.ready(...args);
export const getBackend = (...args) => tf.getBackend?.(...args);
export const enableProdMode = (...args) => tf.enableProdMode?.(...args);
export const env = tf.env;
export const tidy = (...args) => tf.tidy(...args);
export const browser = tf.browser;
export const engine = tf.engine;
`;

const COCO_STUB = `
const cocoSsd = globalThis.cocoSsd;
if (!cocoSsd) {
  throw new Error("COCO-SSD vendor script missing. Reload the page.");
}
export default cocoSsd;
export const load = (...args) => cocoSsd.load(...args);
`;

function tensorflowStubs(): Plugin {
  const handle = (url: string | undefined) => {
    const path = (url ?? "").split("?")[0];
    if (!path.includes("/node_modules/.vite/deps/")) return null;
    const name = path.split("/").pop() ?? "";
    if (name.includes("tensorflow_tfjs") && name.endsWith(".js")) return TF_STUB;
    if (
      name.endsWith(".js") &&
      (name.includes("coco-ssd") || name.includes("tensorflow-models_coco"))
    ) {
      return COCO_STUB;
    }
    return null;
  };

  return {
    name: "netra-tfjs-stubs",
    enforce: "pre",
    resolveId(id) {
      if (id === "@tensorflow/tfjs" || id.startsWith("@tensorflow/tfjs?")) return "\0netra-tfjs-stub";
      if (id === "@tensorflow-models/coco-ssd" || id.startsWith("@tensorflow-models/coco-ssd?")) {
        return "\0netra-coco-stub";
      }
      return undefined;
    },
    load(id) {
      if (id === "\0netra-tfjs-stub") return TF_STUB;
      if (id === "\0netra-coco-stub") return COCO_STUB;
      return undefined;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const body = handle(req.url);
        if (!body) {
          next();
          return;
        }
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.end(body);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tensorflowStubs()],
  optimizeDeps: {
    exclude: ["@tensorflow/tfjs", "@tensorflow-models/coco-ssd"],
  },
  server: {
    port: 5173,
    headers: {
      "Cache-Control": "no-store",
    },
    proxy: {
      "/api": "http://localhost:8000",
      "/health": "http://localhost:8000",
      "/ws": { target: "ws://localhost:8000", ws: true },
    },
  },
});
