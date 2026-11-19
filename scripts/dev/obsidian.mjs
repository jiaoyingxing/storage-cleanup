#!/usr/bin/env node
/**
 * Guarded Obsidian CLI wrapper.
 *
 * Why this exists
 * ---------------
 * Raw `obsidian ...` invocations have failure modes that bit easy-sync first and
 * would bite here too:
 *   1. omitting `vault=` silently targets whatever window is active;
 *   2. a payload over a few KB wedged the CLI pipe and took the host main
 *      process down with it;
 *   3. two concurrent evals can crash the host main process (socket JSON parse);
 *   4. the official CLI answers command-level failures on **stdout with exit 0**
 *      (verified against Obsidian 1.14.5), so a non-zero exit is not how failures
 *      surface. A window that is still loading replies `Error: Command "eval" not
 *      found.`; that reply must not be mistaken for command output.
 *
 * This wrapper makes the vault mandatory, caps the eval payload size, serialises
 * calls with a lock file, appends every call to an audit log so a test run can
 * be reconstructed after the fact, and classifies CLI-level failures so they
 * cannot pass as output.
 *
 * Usage
 * -----
 *   node scripts/dev/obsidian.mjs eval       <alias> --code "<js>"
 *   node scripts/dev/obsidian.mjs eval       <alias> --file <path.js>
 *   node scripts/dev/obsidian.mjs reload     <alias>                   # plugin:reload id=storage-cleanup
 *   node scripts/dev/obsidian.mjs errors     <alias>                   # dev:errors
 *   node scripts/dev/obsidian.mjs screenshot <alias> [path=shot.png]   # dev:screenshot
 *   node scripts/dev/obsidian.mjs dom        <alias> selector=".workspace-leaf" text
 *   node scripts/dev/obsidian.mjs console    <alias> level=error       # 先 debug <alias> on
 *   node scripts/dev/obsidian.mjs css        <alias> selector=".x" prop=color
 *   node scripts/dev/obsidian.mjs mobile     <alias> on|off            # 只切 UI 布局；无 npm 别名
 *   node scripts/dev/obsidian.mjs debug      <alias> on|off            # dev:debug
 *   node scripts/dev/obsidian.mjs plugin     <alias> [id=storage-cleanup]  # 看插件启用状态
 *   node scripts/dev/obsidian.mjs audit      [--since <iso>]
 *
 * Vault: the first bare argument or `--vault`, both spellings are the same
 * thing. There is deliberately no default. Everything else is forwarded to the
 * official CLI verb verbatim (`selector=".x" text`), so keep the official
 * argument syntax when calling the pass-through subcommands.
 *
 * 与 easy-sync 版本的差异：本仓三个登记测试库都是 D11 认可的投放目标，所以
 * 不设「真实仓库拒绝」闸；审计 / 锁 / 载荷上限 / 失败分类全部保留。
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, ".tmp", "dev-cli");
const AUDIT_FILE = path.join(AUDIT_DIR, "calls.jsonl");
const LOCK_FILE = path.join(AUDIT_DIR, "lock");
const LOCK_STALE_MS = 120_000;

/** Convenience names only. Never used as a fallback. */
const VAULT_ALIASES = {
  main: "焦应行的笔记本",
  android: "安卓手机测试仓库",
  iphone: "iphone-test-vault",
};

const MAX_PAYLOAD_BYTES = 2000;
const CLI_TIMEOUT_MS = 120_000;

/**
 * A window that is still starting up has not registered its CLI handlers yet and
 * answers `Command "<verb>" not found.`; the command never ran, so a bounded
 * retry is safe. Every other CLI failure is deterministic and fails fast.
 */
const CLI_RETRY_ATTEMPTS = 3;
const CLI_RETRY_DELAY_MS = 1_500;
const RETRYABLE_CLI_FAILURES = new Set(["command-not-found"]);

/** Subcommand → official CLI verb (plus arguments the wrapper always supplies). */
const CLI_VERBS = {
  reload: { verb: "plugin:reload", fixed: ["id=storage-cleanup"] },
  errors: { verb: "dev:errors" },
  eval: { verb: "eval" },
  screenshot: { verb: "dev:screenshot" },
  dom: { verb: "dev:dom" },
  console: { verb: "dev:console" },
  css: { verb: "dev:css" },
  mobile: { verb: "dev:mobile" },
  debug: { verb: "dev:debug" },
  plugin: { verb: "plugin" },
};

/** Flags the wrapper consumes itself; every other flag is forwarded as `name=value`. */
const WRAPPER_FLAGS = new Set(["vault", "code", "file", "since"]);

function fail(message) {
  process.stderr.write(`obsidian.mjs: ${message}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!command) {
    fail("missing command (eval|reload|errors|screenshot|dom|console|css|mobile|debug|plugin|audit)");
  }
  const args = { command, vault: undefined, code: undefined, file: undefined, since: undefined, forwarded: [] };
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token.startsWith("--")) {
      const name = token.slice(2);
      const value = rest[i + 1];
      if (value === undefined || value.startsWith("--")) fail(`missing value for ${token}`);
      i += 1;
      if (WRAPPER_FLAGS.has(name)) args[name] = value;
      else args.forwarded.push(`${name}=${value}`);
      continue;
    }
    // The vault is the *first* bare token; every later bare token belongs to the
    // official verb (`text`, `on`, …), so a forgotten vault fails instead of
    // silently targeting a vault named after one of those words.
    if (i === 0 && args.vault === undefined && !token.includes("=")) {
      args.vault = token;
      continue;
    }
    args.forwarded.push(token);
  }
  return args;
}

function resolveVault(raw) {
  if (!raw || !raw.trim()) {
    fail("--vault is required (alias, name or path); there is no default target");
  }
  return VAULT_ALIASES[raw] ?? raw;
}

let lockHeld = false;

function acquireLock() {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  if (fs.existsSync(LOCK_FILE)) {
    const ageMs = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
    if (ageMs < LOCK_STALE_MS) {
      fail(
        `another dev CLI call is in flight (${Math.round(ageMs / 1000)}s). ` +
          `Obsidian evals must stay serial; wait or remove ${path.relative(REPO_ROOT, AUDIT_FILE)} lock if it is stale.`,
      );
    }
    fs.rmSync(LOCK_FILE, { force: true });
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid));
  lockHeld = true;
}

function releaseLock() {
  if (!lockHeld) return;
  fs.rmSync(LOCK_FILE, { force: true });
  lockHeld = false;
}

// `fail()` exits with process.exit(), which skips `finally`; without this the
// lock file outlives a failed call and blocks the next one for the stale TTL.
process.once("exit", releaseLock);

function assertPayloadSize(code) {
  const bytes = Buffer.byteLength(code, "utf8");
  if (bytes > MAX_PAYLOAD_BYTES) {
    fail(
      `payload is ${bytes} bytes, limit is ${MAX_PAYLOAD_BYTES}. ` +
        `Large payloads have wedged the CLI pipe before; move the logic into the plugin (or a test) ` +
        `and keep the eval a thin call.`,
    );
  }
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * The CLI's own failure shapes (Obsidian 1.14.5). `Error: ` is how the main
 * process renders a rejected command, so it is a failure even though the CLI
 * still exits 0 and writes it to stdout.
 */
export function classifyCliOutput(output) {
  const text = String(output ?? "").trim();
  if (text === "Vault not found.") return { kind: "vault-not-found" };
  if (text.startsWith("Command line interface is not enabled.")) return { kind: "cli-disabled" };
  const missing = /^Error: Command "([^"]+)" not found\./.exec(text);
  if (missing) return { kind: "command-not-found", command: missing[1] };
  if (text.startsWith("Error: ")) return { kind: "cli-error", message: text.slice("Error: ".length) };
  return null;
}

function describeCliFailure(failure, vault, verb, attempts) {
  switch (failure.kind) {
    case "vault-not-found":
      return (
        `vault "${vault}" is not open in any Obsidian window. ` +
        `Open that vault first (\`obsidian vaults\` lists the known names), then retry.`
      );
    case "cli-disabled":
      return (
        `the CLI is turned off in Obsidian: enable Settings > General > Advanced > ` +
        `Command line interface.`
      );
    case "command-not-found":
      return (
        `the window for vault "${vault}" has no CLI handler for "${failure.command}" ` +
        `(tried ${attempts}x). It is still loading or its CLI setup failed: bring the ` +
        `window to the front, wait until it finishes loading, then retry.`
      );
    default:
      return `${verb} failed in the host: ${failure.message}`;
  }
}

function execCli(args) {
  return execFileSync("obsidian", args, { encoding: "utf8", timeout: CLI_TIMEOUT_MS }).trim();
}

/**
 * Runs one verb and returns `{ output, attempts }`, retrying only the
 * "handler not registered yet" race (that command never ran, so retrying is
 * safe). `exec` / `sleep` are injectable so the loop is testable without a host.
 */
export function runCli(vault, verb, extraArgs, options = {}) {
  const exec = options.exec ?? execCli;
  const sleep = options.sleep ?? sleepSync;
  const maxAttempts = options.attempts ?? CLI_RETRY_ATTEMPTS;
  const delayMs = options.delayMs ?? CLI_RETRY_DELAY_MS;
  const args = [`vault=${vault}`, verb, ...extraArgs];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let output;
    try {
      output = exec(args);
    } catch (error) {
      if (error?.code === "ETIMEDOUT") {
        throw new Error(
          `the host did not answer within ${Math.round(CLI_TIMEOUT_MS / 1000)}s (${error.message}). ` +
            `A modal dialog or a busy main process blocks the CLI: close dialogs or restart the ` +
            `window, then retry.`,
        );
      }
      throw error;
    }
    const failure = classifyCliOutput(output);
    if (!failure) return { output, attempts: attempt };
    const canRetry = RETRYABLE_CLI_FAILURES.has(failure.kind) && attempt < maxAttempts;
    if (!canRetry) {
      const error = new Error(describeCliFailure(failure, vault, verb, attempt));
      error.cliFailure = failure;
      error.attempts = attempt;
      throw error;
    }
    sleep(delayMs);
  }
  throw new Error(`no result for ${verb} after ${maxAttempts} attempts`);
}

function audit(entry) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  fs.appendFileSync(AUDIT_FILE, `${JSON.stringify(entry)}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "audit") {
    if (args.forwarded.length > 0) fail(`audit takes no arguments besides --since: ${args.forwarded.join(" ")}`);
    if (args.vault !== undefined) fail(`audit targets no vault, drop the vault argument: ${args.vault}`);
    if (!fs.existsSync(AUDIT_FILE)) return process.stdout.write("no calls recorded\n");
    const since = args.since ? Date.parse(args.since) : 0;
    const lines = fs
      .readFileSync(AUDIT_FILE, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((entry) => Date.parse(entry.at) >= since);
    return process.stdout.write(`${lines.map((entry) => JSON.stringify(entry)).join("\n")}\n`);
  }

  const spec = CLI_VERBS[args.command];
  if (!spec) fail(`unknown command: ${args.command}`);

  const vault = resolveVault(args.vault);
  let extraArgs = [...(spec.fixed ?? []), ...args.forwarded];

  if (args.command === "eval") {
    if (args.forwarded.length > 0) fail(`eval takes --code or --file, not ${args.forwarded.join(" ")}`);
    const code = args.file ? fs.readFileSync(args.file, "utf8") : args.code;
    if (!code) fail("eval needs --code or --file");
    assertPayloadSize(code);
    extraArgs = [`code=${code}`];
  }

  acquireLock();
  const startedAt = new Date();
  const auditBase = {
    at: startedAt.toISOString(),
    vault,
    command: args.command,
    verb: spec.verb,
    bytes: Buffer.byteLength(extraArgs.join(" "), "utf8"),
  };
  try {
    const { output, attempts } = runCli(vault, spec.verb, extraArgs);
    audit({ ...auditBase, ok: true, attempts });
    process.stdout.write(`${output}\n`);
  } catch (error) {
    audit({
      ...auditBase,
      ok: false,
      attempts: error?.attempts ?? 1,
      errorKind: error?.cliFailure?.kind,
      error: String(error?.message ?? error).slice(0, 400),
    });
    fail(String(error?.stderr ?? error?.message ?? error).trim());
  } finally {
    releaseLock();
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) main();
