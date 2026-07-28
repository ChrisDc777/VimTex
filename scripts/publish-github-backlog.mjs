/**
 * Publish VimTex roadmap milestones and issues to ChrisDc777/VimTex
 * Usage: node scripts/publish-github-backlog.mjs
 */
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = "ChrisDc777/VimTex";

function gh(args) {
  return execSync(`gh ${args}`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function ghJson(args) {
  return JSON.parse(gh(args));
}

const milestoneDefs = [
  {
    title: "M0 - Foundation and UI convergence",
    description:
      "Governance, room semantics, shared workspace, Classic default, CI/E2E.",
    due: "2026-09-15",
  },
  {
    title: "M1 - Core editing and activation",
    description: "Format, non-Vim mode, onboarding, templates, palette.",
    due: "2026-10-31",
  },
  {
    title: "M2 - Collaboration and persistence",
    description: "Permissions, reconnect, snapshots, history.",
    due: "2026-12-15",
  },
  {
    title: "M3 - AI mathematical workflows",
    description: "Diff accept/reject, scoped AI, streaming.",
    due: "2027-02-01",
  },
  {
    title: "M4 - Import, export, and polish",
    description: "PDF, import, delight UX.",
    due: "2027-03-15",
  },
  {
    title: "M5 - Production and SaaS readiness",
    description: "Auth, observability, billing - gated on retention.",
    due: "2027-06-01",
  },
];

gh(`api repos/${REPO} -X PATCH -f has_issues=true`);

const existing = ghJson(`api repos/${REPO}/milestones?state=all`);
const milestoneMap = new Map();

for (const m of existing) {
  if (/^M\d/.test(m.title)) milestoneMap.set(m.title, m.number);
}

for (const m of existing) {
  if (!/^M\d/.test(m.title) && m.number <= 6) {
    const def = milestoneDefs[m.number - 1];
    if (def) {
      gh(
        `api repos/${REPO}/milestones/${m.number} -X PATCH -f title="${def.title}" -f description="${def.description}" -f due_on="${def.due}T23:59:59Z"`,
      );
      milestoneMap.set(def.title, m.number);
      console.log(`Fixed milestone #${m.number} -> ${def.title}`);
    }
  }
}

for (const def of milestoneDefs) {
  if (milestoneMap.has(def.title)) {
    console.log(`Milestone exists: ${def.title} (#${milestoneMap.get(def.title)})`);
    continue;
  }
  try {
    const num = gh(
      `api repos/${REPO}/milestones -f title="${def.title}" -f description="${def.description}" -f due_on="${def.due}T23:59:59Z" -f state=open --jq .number`,
    );
    milestoneMap.set(def.title, Number(num));
    console.log(`Created milestone: ${def.title} (#${num})`);
  } catch {
    const all = ghJson(`api repos/${REPO}/milestones?state=all`);
    const found = all.find((x) => x.title === def.title);
    if (found) milestoneMap.set(def.title, found.number);
  }
}

const backlog = JSON.parse(
  readFileSync(join(__dirname, "issue-backlog.json"), "utf8"),
);
const existingTitles = new Set(
  ghJson(`issue list -R ${REPO} --limit 100 --json title`).map((i) => i.title),
);

const created = [];
const tmpDir = mkdtempSync(join(tmpdir(), "vimtex-issues-"));

for (const item of backlog) {
  if (existingTitles.has(item.title)) {
    console.log(`Skip: ${item.title}`);
    continue;
  }
  const bodyPath = join(tmpDir, `issue-${created.length}.md`);
  writeFileSync(bodyPath, item.body, "utf8");
  const labels = item.labels.join(",");
  const milestoneTitle = item.milestone;
  const safeTitle = item.title.replace(/"/g, '\\"');
  const safeMilestone = milestoneTitle.replace(/"/g, '\\"');
  const url = gh(
    `issue create -R ${REPO} --title "${safeTitle}" --body-file "${bodyPath}" --label "${labels}" --milestone "${safeMilestone}"`,
  );
  const num = Number(url.split("/").pop());
  created.push({
    number: num,
    title: item.title,
    url,
    milestone: item.milestone,
  });
  console.log(`Created #${num}: ${item.title}`);
}

try {
  rmSync(tmpDir, { recursive: true, force: true });
} catch {
  /* ignore */
}

writeFileSync(
  join(__dirname, "created-issues.json"),
  JSON.stringify(created, null, 2),
  "utf8",
);
console.log(`\nDone. Created ${created.length} issues.`);
