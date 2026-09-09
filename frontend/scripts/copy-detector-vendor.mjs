import { copyFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public", "vendor");
mkdirSync(dest, { recursive: true });
copyFileSync(join(root, "node_modules/@tensorflow/tfjs/dist/tf.min.js"), join(dest, "tf.min.js"));
copyFileSync(
  join(root, "node_modules/@tensorflow-models/coco-ssd/dist/coco-ssd.min.js"),
  join(dest, "coco-ssd.min.js"),
);
