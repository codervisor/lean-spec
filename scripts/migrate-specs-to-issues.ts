#!/usr/bin/env tsx
// One-shot migration: file-based specs (specs/NNN-slug/) → GitHub issues on codervisor/lean-spec.
//
// Default mode is dry-run: walks the specs/ directory, filters to active specs
// (status ∈ {draft, planned, in-progress}), builds the issue payload that
// would be POSTed, and writes a manifest JSON for human review. No network
// calls happen unless --execute is passed.
//
// Execute mode requires GH_TOKEN with `repo` scope and creates the issues in
// two passes: pass 1 creates each issue and records spec_number → issue_number;
// pass 2 rewrites `depends_on` and `related` references in each body to use
// the real issue numbers. Sub-issue parent/child links are NOT created — per
// the migration design ("inline sub-files; only depends_on edges become
// references"), IMPLEMENTATION.md / ARCHITECTURE.md are folded into the
// parent body and GitHub's sub-issue graph is left for humans to wire up
// post-migration if desired.
//
// Idempotency: each created issue carries an HTML comment marker
// `<!-- migrated-from: specs/NNN-slug -->` in its body. Before pass 1, a
// single paginated search builds a map of existing markers → issue numbers,
// so re-running --execute is safe and doesn't burn through the Search API
// rate limit (30 req/min) on per-spec lookups.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import yaml from "js-yaml";

// ---------- Types ----------

type SpecStatus = "draft" | "planned" | "in-progress" | "complete" | "archived" | "deferred";

interface SpecFrontmatter {
  status?: SpecStatus | string;
  priority?: "critical" | "high" | "medium" | "low" | string;
  tags?: string[];
  depends_on?: string[];
  parent?: string;
  children?: string[];
  related?: string[];
  assignee?: string;
  created?: string;
  created_at?: string;
  updated_at?: string;
  completed?: string;
  completed_at?: string;
  // anything else preserved as-is
  [k: string]: unknown;
}

interface SpecRecord {
  specNumber: string;
  specSlug: string;
  specDir: string;
  title: string;
  frontmatter: SpecFrontmatter;
  body: string;
  subFiles: { name: string; content: string }[];
}

interface IssuePayload {
  specNumber: string;
  specDir: string;
  title: string;
  body: string;
  labels: string[];
  // unresolved spec-number references rewritten in pass 2 of --execute
  dependsOnSpecNumbers: string[];
  relatedSpecNumbers: string[];
}

interface Manifest {
  generatedAt: string;
  source: {
    owner: string;
    repo: string;
    specsRoot: string;
  };
  summary: {
    totalScanned: number;
    activeMigrated: number;
    skippedByStatus: Record<string, number>;
    missingFrontmatter: number;
  };
  labels: string[];
  issues: IssuePayload[];
}

// ---------- Args ----------

interface Args {
  execute: boolean;
  dryRun: boolean;
  limit: number | null;
  manifestPath: string;
  owner: string;
  repo: string;
  specsRoot: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    execute: false,
    dryRun: true,
    limit: null,
    manifestPath: "scripts/migrate-specs-manifest.json",
    owner: "codervisor",
    repo: "lean-spec",
    specsRoot: "specs",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--execute") {
      args.execute = true;
      args.dryRun = false;
    } else if (a === "--dry-run") {
      args.dryRun = true;
      args.execute = false;
    } else if (a === "--limit") {
      const raw = argv[++i];
      const parsed = Number(raw);
      if (!raw || !Number.isInteger(parsed) || parsed < 1) {
        console.error(`error: --limit requires a positive integer, got: ${raw}`);
        process.exit(2);
      }
      args.limit = parsed;
    } else if (a === "--manifest") {
      args.manifestPath = argv[++i];
    } else if (a === "--owner") {
      args.owner = argv[++i];
    } else if (a === "--repo") {
      args.repo = argv[++i];
    } else if (a === "--specs-root") {
      args.specsRoot = argv[++i];
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`unknown arg: ${a}`);
      printHelp();
      process.exit(2);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`Usage: tsx scripts/migrate-specs-to-issues.ts [options]

Default mode is dry-run — walks specs/, builds issue payloads, writes a manifest. No network calls.

Options:
  --dry-run                  (default) write manifest, do not call GitHub
  --execute                  create issues on GitHub (requires GH_TOKEN)
  --limit N                  process only the first N active specs (useful for testing)
  --manifest <path>          manifest output path (default: scripts/migrate-specs-manifest.json)
  --owner <name>             target repo owner (default: codervisor)
  --repo <name>              target repo name  (default: lean-spec)
  --specs-root <path>        specs directory   (default: specs)
  -h, --help                 print this help

The manifest is the contract between dry-run and execute: review it before
re-running with --execute. The manifest records every label, body, and
relationship the script will create.
`);
}

// ---------- Frontmatter parsing ----------

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

function splitFrontmatter(source: string): { frontmatter: SpecFrontmatter | null; body: string } {
  const m = source.match(FRONTMATTER_RE);
  if (!m) return { frontmatter: null, body: source };
  const raw = m[1];
  const body = source.slice(m[0].length);
  try {
    const parsed = yaml.load(raw, { schema: yaml.JSON_SCHEMA }) as SpecFrontmatter;
    return { frontmatter: parsed ?? {}, body };
  } catch (err) {
    console.warn(`warn: yaml parse failed: ${(err as Error).message}`);
    return { frontmatter: {}, body };
  }
}

// ---------- Discovery ----------

const ACTIVE_STATUSES = new Set<string>(["draft", "planned", "in-progress"]);
// Sub-files we know how to inline; order matters (Architecture before Implementation).
const SUB_FILE_NAMES = ["ARCHITECTURE.md", "IMPLEMENTATION.md"];

async function discoverSpecs(specsRoot: string): Promise<SpecRecord[]> {
  const out: SpecRecord[] = [];
  const entries = await readdir(specsRoot, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const m = e.name.match(/^(\d+)-(.+)$/);
    if (!m) continue;
    const [, num, slug] = m;
    const dir = join(specsRoot, e.name);
    const readmePath = join(dir, "README.md");
    if (!existsSync(readmePath)) continue;

    const raw = await readFile(readmePath, "utf8");
    const { frontmatter, body } = splitFrontmatter(raw);
    if (!frontmatter) continue;

    // Title is the first H1 in the body if present, otherwise derived from slug.
    const h1 = body.match(/^#\s+(.+)$/m);
    const title = h1 ? h1[1].trim() : slug.replace(/-/g, " ");

    const subFiles: { name: string; content: string }[] = [];
    for (const name of SUB_FILE_NAMES) {
      const subPath = join(dir, name);
      if (existsSync(subPath)) {
        subFiles.push({ name, content: await readFile(subPath, "utf8") });
      }
    }

    out.push({
      specNumber: num,
      specSlug: slug,
      specDir: e.name,
      title,
      frontmatter,
      body,
      subFiles,
    });
  }
  return out;
}

// ---------- Label inference ----------

const AREA_KEYWORDS: Array<[RegExp, string]> = [
  [/\bcli\b|\bcommand\b/i, "area:cli"],
  [/\bui\b|\bweb\b|\bfrontend\b/i, "area:ui"],
  [/\bdesktop\b|\btauri\b/i, "area:desktop"],
  [/\bmcp\b/i, "area:mcp"],
  [/\bhttp[-_]?server\b/i, "area:http-server"],
  [/\bcore\b|\brust\b/i, "area:core"],
  [/\bprovider\b|\bgithub\b|\bado\b|\bjira\b|\bbackend\b/i, "area:provider"],
  [/\bschema\b/i, "area:schemas"],
  [/\bdocs?\b|\bdocumentation\b/i, "area:docs"],
  [/\bci\b|\binfra\b|\bpublish\b|\brelease\b|\bdeploy\b/i, "area:infra"],
  [/\bagent\b|\bskill\b|\bclaude\b|\bcopilot\b/i, "area:agents"],
];

function inferLabels(rec: SpecRecord): string[] {
  const labels = new Set<string>();
  labels.add("spec");
  labels.add("migrated-from-file");

  const status = String(rec.frontmatter.status ?? "").toLowerCase();
  if (ACTIVE_STATUSES.has(status)) labels.add(status);

  const priority = String(rec.frontmatter.priority ?? "").toLowerCase();
  if (priority && ["critical", "high", "medium", "low"].includes(priority)) {
    labels.add(`priority:${priority}`);
  }

  const tagSources = [
    ...(Array.isArray(rec.frontmatter.tags) ? rec.frontmatter.tags : []),
    rec.specSlug,
    rec.title,
  ];

  const haystack = tagSources.join(" ").toLowerCase();
  for (const [re, label] of AREA_KEYWORDS) {
    if (re.test(haystack)) labels.add(label);
  }
  // No area inferred? Default to area:docs for spec-management/meta specs,
  // otherwise leave the spec without an area label (human triage on review).
  return [...labels].sort();
}

// ---------- Body assembly ----------

function buildBody(
  rec: SpecRecord,
  args: Args,
): { body: string; dependsOn: string[]; related: string[] } {
  const fm = rec.frontmatter;
  const lines: string[] = [];

  // Migration marker (idempotency)
  lines.push(`<!-- migrated-from: specs/${rec.specDir} -->`);
  lines.push("");

  // Provenance + dependency prose at the top (so reviewers see it first)
  const provenanceParts: string[] = [];
  provenanceParts.push(
    `Migrated from [\`specs/${rec.specDir}/README.md\`](https://github.com/${args.owner}/${args.repo}/tree/main/specs/${rec.specDir}).`
  );
  if (fm.created) provenanceParts.push(`Originally created ${fm.created}.`);

  lines.push(`> ${provenanceParts.join(" ")}`);
  lines.push("");

  const dependsOn = normalizeRefList(fm.depends_on);
  if (dependsOn.length) {
    lines.push(`> Depends on: ${dependsOn.map(n => `spec ${n}`).join(", ")} (rewritten to issue numbers on migration)`);
    lines.push("");
  }
  const related = normalizeRefList(fm.related);
  if (related.length) {
    lines.push(`> Related: ${related.map(n => `spec ${n}`).join(", ")}`);
    lines.push("");
  }

  // Strip the first H1 from the body since the issue title carries it.
  const bodyWithoutH1 = rec.body.replace(/^#\s+.+\n+/m, "").trimStart();
  lines.push(bodyWithoutH1.trimEnd());

  // Inline sub-files
  for (const sub of rec.subFiles) {
    lines.push("");
    lines.push("---");
    lines.push("");
    const subTitle = sub.name === "ARCHITECTURE.md" ? "Architecture" : "Implementation Details";
    lines.push(`## ${subTitle}`);
    lines.push("");
    // Drop sub-file's first H1 if present, then append content.
    const cleaned = sub.content.replace(/^#\s+.+\n+/m, "");
    lines.push(cleaned.trim());
  }

  return { body: lines.join("\n") + "\n", dependsOn, related };
}

function normalizeRefList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    // Common forms: "067-monorepo-core-extraction", "spec/067", "067".
    const m = item.match(/^(?:spec[/_-])?(\d{2,4})/);
    if (m) out.push(m[1]);
  }
  return out;
}

function buildTitle(rec: SpecRecord, labels: string[]): string {
  const area = labels.find(l => l.startsWith("area:"));
  if (!area) return `spec: ${rec.title}`;
  return `spec(${area.slice("area:".length)}): ${rec.title}`;
}

// ---------- Manifest assembly ----------

function buildManifest(records: SpecRecord[], args: Args): Manifest {
  const skippedByStatus: Record<string, number> = {};
  let missingFrontmatter = 0;
  const issues: IssuePayload[] = [];

  for (const rec of records) {
    const status = String(rec.frontmatter.status ?? "").toLowerCase();
    if (!status) {
      missingFrontmatter++;
      continue;
    }
    if (!ACTIVE_STATUSES.has(status)) {
      skippedByStatus[status] = (skippedByStatus[status] ?? 0) + 1;
      continue;
    }
    const labels = inferLabels(rec);
    const title = buildTitle(rec, labels);
    const { body, dependsOn, related } = buildBody(rec, args);

    issues.push({
      specNumber: rec.specNumber,
      specDir: rec.specDir,
      title,
      body,
      labels,
      dependsOnSpecNumbers: dependsOn,
      relatedSpecNumbers: related,
    });
  }

  if (args.limit !== null) issues.splice(args.limit);

  const allLabels = new Set<string>();
  for (const issue of issues) for (const l of issue.labels) allLabels.add(l);

  return {
    generatedAt: new Date().toISOString(),
    source: {
      owner: args.owner,
      repo: args.repo,
      specsRoot: args.specsRoot,
    },
    summary: {
      totalScanned: records.length,
      activeMigrated: issues.length,
      skippedByStatus,
      missingFrontmatter,
    },
    labels: [...allLabels].sort(),
    issues,
  };
}

// ---------- Execute (GitHub) ----------

interface GitHubIssue {
  number: number;
  html_url: string;
  node_id: string;
}

async function gh<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  // Up to 5 attempts. Honors Retry-After when present, otherwise uses
  // exponential backoff. Retries on 403 (secondary rate limit), 429, and
  // 5xx — never on 4xx schema errors.
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "lean-spec-migrate-specs/1.0",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return res.json() as Promise<T>;

    const text = await res.text();
    const retryable =
      res.status === 403 && text.includes("secondary rate limit") ||
      res.status === 429 ||
      res.status >= 500;
    if (!retryable) {
      throw new Error(`GitHub ${method} ${path} → ${res.status}: ${text}`);
    }
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(60_000, 2_000 * Math.pow(2, attempt - 1));
    console.log(`  ! ${res.status} on ${method} ${path}; backing off ${Math.round(waitMs / 1000)}s (attempt ${attempt}/5)`);
    await new Promise(r => setTimeout(r, waitMs));
    lastErr = new Error(`GitHub ${method} ${path} → ${res.status}: ${text}`);
  }
  throw lastErr ?? new Error(`GitHub ${method} ${path}: retry budget exhausted`);
}

// Conservative inter-request throttle. GitHub's secondary content-creation
// rate limit is around 80 creates/min; pacing at ~1.5s/request gives us a
// floor around 40 creates/min — well under the cap.
const CREATE_THROTTLE_MS = 1500;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// Build a single map of (specDir → existing migrated issue) up front, via
// one paginated search. The Search API has a 30 req/min limit, so doing
// one search per spec for ~98 specs would either hit the cap or burn most
// of the budget — a single label-scoped paginated walk is cheap and safe.
async function buildExistingIssuesMap(
  token: string,
  args: Args,
): Promise<Map<string, GitHubIssue>> {
  const map = new Map<string, GitHubIssue>();
  const q = encodeURIComponent(
    `repo:${args.owner}/${args.repo} is:issue label:migrated-from-file in:body "migrated-from: specs/"`,
  );
  let page = 1;
  while (true) {
    const res = await gh<{ items: (GitHubIssue & { body: string })[]; total_count: number }>(
      token,
      "GET",
      `/search/issues?q=${q}&per_page=100&page=${page}`,
    );
    for (const item of res.items) {
      const m = item.body?.match(/<!-- migrated-from: specs\/([^\s-]+(?:-[^\s-]+)*) -->/);
      if (m) map.set(m[1], { number: item.number, html_url: item.html_url, node_id: item.node_id });
    }
    if (res.items.length < 100) break;
    page++;
    if (page > 10) break; // defensive cap — Search API doesn't paginate past 1000 results anyway
  }
  return map;
}

async function ensureLabels(token: string, args: Args, labels: string[]): Promise<void> {
  const colorFor = (label: string): string => {
    if (label.startsWith("priority:critical")) return "B60205";
    if (label.startsWith("priority:high")) return "D93F0B";
    if (label.startsWith("priority:medium")) return "FBCA04";
    if (label.startsWith("priority:low")) return "C5DEF5";
    if (label.startsWith("area:")) return "0E8A16";
    if (label === "spec") return "5319E7";
    if (label === "draft") return "EDEDED";
    if (label === "planned") return "BFD4F2";
    if (label === "in-progress") return "1D76DB";
    if (label === "migrated-from-file") return "FEF2C0";
    if (label === "provider-impact") return "D4C5F9";
    if (label === "i18n") return "C2E0C6";
    return "EEEEEE";
  };
  for (const label of labels) {
    try {
      await gh(token, "POST", `/repos/${args.owner}/${args.repo}/labels`, {
        name: label,
        color: colorFor(label),
      });
      console.log(`  + label: ${label}`);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("already_exists")) continue;
      console.warn(`  ! label ${label}: ${msg}`);
    }
  }
}

async function executeMigration(manifest: Manifest, args: Args): Promise<void> {
  const token = process.env.GH_TOKEN;
  if (!token) {
    console.error("error: --execute requires GH_TOKEN environment variable (repo scope)");
    process.exit(1);
  }
  console.log(`bootstrapping ${manifest.labels.length} labels on ${args.owner}/${args.repo}`);
  await ensureLabels(token, args, manifest.labels);

  console.log("scanning for previously migrated issues (one paginated search)");
  const existing = await buildExistingIssuesMap(token, args);
  console.log(`  found ${existing.size} existing migrated issues`);

  // Pass 1: create issues, recording spec_number → issue_number
  const created: Record<string, GitHubIssue> = {};
  for (const issue of manifest.issues) {
    const prior = existing.get(issue.specDir);
    if (prior) {
      console.log(`  = skip ${issue.specDir}: already migrated → #${prior.number}`);
      created[issue.specNumber] = prior;
      continue;
    }
    const res = await gh<GitHubIssue>(
      token,
      "POST",
      `/repos/${args.owner}/${args.repo}/issues`,
      {
        title: issue.title,
        body: issue.body,
        labels: issue.labels,
      },
    );
    console.log(`  + ${issue.specDir} → #${res.number}`);
    created[issue.specNumber] = res;
    await sleep(CREATE_THROTTLE_MS);
  }

  // Pass 2: rewrite depends_on + related refs to real issue numbers.
  // Refs that point at non-active specs (complete/archived, not migrated)
  // stay as `spec <num>` prose — humans can hand-link them to the historical
  // file later.
  console.log("\npass 2: rewriting cross-references");
  for (const issue of manifest.issues) {
    const target = created[issue.specNumber];
    if (!target) continue;
    const refs = [...issue.dependsOnSpecNumbers, ...issue.relatedSpecNumbers];
    if (!refs.length) continue;

    let newBody = issue.body;
    for (const refNum of refs) {
      const ref = created[refNum];
      if (ref) {
        newBody = newBody.replace(
          new RegExp(`spec ${refNum}\\b`, "g"),
          `#${ref.number}`,
        );
      }
    }

    if (newBody !== issue.body) {
      await gh(token, "PATCH", `/repos/${args.owner}/${args.repo}/issues/${target.number}`, {
        body: newBody,
      });
      console.log(`  ~ #${target.number}: rewrote refs`);
      await sleep(CREATE_THROTTLE_MS);
    }
  }

  // Save resolved manifest with issue numbers
  const resolvedPath = args.manifestPath.replace(/\.json$/, ".executed.json");
  await writeFile(
    resolvedPath,
    JSON.stringify(
      {
        ...manifest,
        executedAt: new Date().toISOString(),
        created: Object.fromEntries(
          Object.entries(created).map(([k, v]) => [
            k,
            { number: v.number, html_url: v.html_url },
          ]),
        ),
      },
      null,
      2,
    ),
  );
  console.log(`\nresolved manifest written to ${resolvedPath}`);
}

// ---------- Main ----------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const specsRoot = resolve(process.cwd(), args.specsRoot);
  if (!existsSync(specsRoot)) {
    console.error(`error: specs root not found: ${specsRoot}`);
    process.exit(1);
  }

  console.log(`scanning ${specsRoot} ...`);
  const records = await discoverSpecs(specsRoot);
  console.log(`found ${records.length} spec directories`);

  const manifest = buildManifest(records, args);
  console.log(
    `active: ${manifest.summary.activeMigrated}, ` +
    `skipped: ${JSON.stringify(manifest.summary.skippedByStatus)}, ` +
    `missing-frontmatter: ${manifest.summary.missingFrontmatter}`,
  );
  console.log(`unique labels: ${manifest.labels.length}`);

  const manifestPath = resolve(process.cwd(), args.manifestPath);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`manifest written to ${manifestPath}`);

  if (args.execute) {
    console.log("\n--- execute mode ---");
    await executeMigration(manifest, args);
  } else {
    console.log(
      "\ndry-run complete. Review the manifest, then re-run with --execute and GH_TOKEN set.",
    );
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
