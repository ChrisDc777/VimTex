import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const wrangler = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "wrangler",
    "dev",
    "-c",
    "workers/collab/wrangler.jsonc",
    "--port",
    "8787",
    "--persist-to",
    ".wrangler/collab-local",
  ],
  { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
);

const next = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "dev", "-H", "127.0.0.1", "-p", "3000"],
  {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      ROOM_SERVICE_ORIGIN: "http://127.0.0.1:8787",
      NEXT_PUBLIC_COLLAB_WS_URL: "ws://127.0.0.1:8787",
      NEXT_PUBLIC_HIDE_TTL_NEVER: process.env.NEXT_PUBLIC_HIDE_TTL_NEVER || "0",
    },
  },
);

function shutdown(code = 0) {
  wrangler.kill();
  next.kill();
  process.exit(code);
}

wrangler.on("exit", (code) => {
  if (code) shutdown(code);
});
next.on("exit", (code) => {
  if (code) shutdown(code);
});
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
