import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const basePath = "/glacier-dev-playground/";
const outDir = "dist-base-path-check";

execFileSync("npx", ["vite", "build", "--outDir", outDir], {
  stdio: "inherit",
  env: { ...process.env, VITE_BASE_PATH: basePath },
});

const html = readFileSync(join(outDir, "index.html"), "utf-8");
rmSync(outDir, { recursive: true, force: true });

if (!html.includes(`src="${basePath}assets/`)) {
  console.error(
    `Base path verification failed: expected assets to be referenced under "${basePath}" but they were not found in the built index.html.`,
  );
  process.exit(1);
}

console.log(`Base path verification passed for "${basePath}".`);
