/**
 * Optional quick tunnel (Cloudflare trycloudflare.com) started with the app.
 * Enable with AUTO_TUNNEL=1 — requires `cloudflared` on PATH.
 *
 * For a stable URL use a named Cloudflare tunnel (one-time dashboard setup).
 * If the app already has a public host, leave AUTO_TUNNEL unset.
 */
import { spawn } from "node:child_process";

const TRYCF_URL_RE =
  /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

function tunnelEnabled() {
  const raw = process.env.AUTO_TUNNEL ?? process.env.VIMTEX_AUTO_TUNNEL;
  return raw === "1" || raw === "true";
}

/**
 * @param {number} port Local HTTP port (default target for cloudflared).
 * @returns {import("node:child_process").ChildProcess | null}
 */
export function startAutoTunnel(port) {
  if (!tunnelEnabled()) return null;
  if (process.env.NEXT_PUBLIC_COLLAB_WS_URL?.trim()) {
    console.log(
      "[vimtex] AUTO_TUNNEL skipped — NEXT_PUBLIC_COLLAB_WS_URL is set.",
    );
    return null;
  }

  const target =
    process.env.AUTO_TUNNEL_URL?.trim() ||
    `http://127.0.0.1:${port}`;
  const bin = process.env.CLOUDFLARED_PATH?.trim() || "cloudflared";

  console.log(`[vimtex] Starting Cloudflare quick tunnel → ${target}`);

  const child = spawn(
    bin,
    ["tunnel", "--url", target, "--no-autoupdate"],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    },
  );

  let loggedUrl = false;

  const onData = (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    if (loggedUrl) return;
    const match = text.match(TRYCF_URL_RE);
    if (match) {
      loggedUrl = true;
      const url = match[0];
      console.log("");
      console.log("[vimtex] Public URL (share this):");
      console.log(`  ${url}`);
      console.log("");
      console.log(
        "[vimtex] Quick tunnels are ephemeral — URL changes each restart.",
      );
      console.log("");
    }
  };

  child.stdout?.on("data", onData);
  child.stderr?.on("data", onData);

  child.on("error", (err) => {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT") {
      console.warn(
        "[vimtex] AUTO_TUNNEL is on but cloudflared was not found on PATH.",
      );
      console.warn(
        "[vimtex] Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
      );
      return;
    }
    console.warn("[vimtex] cloudflared error:", err.message);
  });

  child.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      console.warn(`[vimtex] cloudflared exited (${code ?? signal})`);
    }
  });

  const cleanup = () => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  };
  process.once("exit", cleanup);

  return child;
}
