import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(optionValue("--project") || process.cwd());
const manifestPath = path.join(root, "manifest.json");
const packagePath = path.join(root, "package.json");
const lockPath = path.join(root, "package-lock.json");
const versionsPath = path.join(root, "versions.json");
const runtimeConfigPath = path.join(root, "runtime-artifacts.config.json");

const manifest = readJson(manifestPath, "manifest.json");
const pkg = readJson(packagePath, "package.json");
const errors = [];
const canonicalAuthor = "Jiao Yingxing";
const canonicalAuthorUrl = "https://github.com/jiaoyingxing";
const description = typeof manifest.description === "string" ? manifest.description : "";

const manifestId = typeof manifest.id === "string" ? manifest.id : "";
if (manifestId !== "storage-cleanup") {
  errors.push(`manifest.id must be storage-cleanup, got ${manifestId}`);
}
if (!/^[a-z0-9-]+$/.test(manifestId) || manifestId.endsWith("plugin") || manifestId.includes("obsidian")) {
  errors.push("manifest.id must be lowercase letters/hyphens, not end with plugin, and not contain obsidian");
}
if (manifest.name !== "Storage Cleanup") {
  errors.push(`manifest.name must be Storage Cleanup, got ${manifest.name}`);
}
if (manifest.author !== canonicalAuthor) {
  errors.push(`manifest.author must be ${canonicalAuthor}, got ${manifest.author}`);
}
if (manifest.authorUrl !== canonicalAuthorUrl) {
  errors.push(`manifest.authorUrl must be ${canonicalAuthorUrl}, got ${manifest.authorUrl}`);
}
if (pkg.author !== canonicalAuthor) {
  errors.push(`package.author must be ${canonicalAuthor}, got ${pkg.author}`);
}
if (pkg.description !== description) {
  errors.push("package.description must match manifest.description");
}
if (description.length > 250) {
  errors.push(`manifest.description must be <= 250 characters, got ${description.length}`);
}
if (!/[\u4e00-\u9fff]/.test(description) || !/[A-Za-z]/.test(description)) {
  errors.push("manifest.description must contain both Chinese and English");
}
if (!description.includes("。") || !description.trim().endsWith(".")) {
  errors.push("manifest.description must end with Chinese 。 and English .");
}
if (description.includes("Obsidian") || description.includes("Plugin")) {
  errors.push("manifest.description must not contain Obsidian or Plugin");
}
if (!description.includes(".trash")) {
  errors.push("manifest.description must name .trash explicitly");
}
if (manifest.version !== pkg.version) {
  errors.push(`manifest.version ${manifest.version} does not match package.version ${pkg.version}`);
}
if (manifest.isDesktopOnly !== false) {
  errors.push("manifest.isDesktopOnly must be false");
}
if (!manifest.minAppVersion) {
  errors.push("manifest.minAppVersion is required");
}
if (!fs.existsSync(path.join(root, "styles.css"))) {
  errors.push("styles.css is missing");
}

let runtimeTargetCount = 0;

checkVersions();
checkLockfile();
checkPublicDocs();
checkRuntimeConfig();

if (errors.length > 0) {
  console.error("Metadata check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const runtimeSummary = runtimeTargetCount === 0
  ? "runtime config not present (skipped; public clone)"
  : `${runtimeTargetCount} runtime targets`;
console.log(
  `Metadata check passed: ${manifest.name} ${manifest.version}, versions.json ${manifest.version} -> ${manifest.minAppVersion}, ${runtimeSummary}.`
);

function checkVersions() {
  if (!fs.existsSync(versionsPath)) {
    errors.push("versions.json is missing");
    return;
  }
  const versions = readJson(versionsPath, "versions.json");
  if (!versions || typeof versions !== "object" || Array.isArray(versions)) {
    errors.push("versions.json must be a JSON object");
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(versions, manifest.version)) {
    errors.push(`versions.json must contain manifest.version ${manifest.version}`);
    return;
  }
  if (versions[manifest.version] !== manifest.minAppVersion) {
    errors.push(
      `versions.json[${manifest.version}] is ${versions[manifest.version]}, expected manifest.minAppVersion ${manifest.minAppVersion}`
    );
  }
}

function checkLockfile() {
  if (!fs.existsSync(lockPath)) {
    errors.push("package-lock.json is missing");
    return;
  }
  const lock = readJson(lockPath, "package-lock.json");
  if (lock.version !== manifest.version) {
    errors.push(`package-lock.json root version ${lock.version} does not match manifest.version ${manifest.version}`);
  }
  const rootPackage = lock.packages?.[""];
  if (!rootPackage || typeof rootPackage !== "object") {
    errors.push('package-lock.json must contain a root packages[""] entry');
  } else if (rootPackage.version !== manifest.version) {
    errors.push(
      `package-lock.json packages[""].version ${rootPackage.version} does not match manifest.version ${manifest.version}`
    );
  }
}

function checkPublicDocs() {
  for (const file of ["README.md", "README-en.md", "LICENSE"]) {
    if (!fs.existsSync(path.join(root, file))) {
      errors.push(`${file} is missing`);
    }
  }

  const readme = readHead("README.md");
  if (readme !== null && !readme.includes("README-en.md")) {
    errors.push("README.md header must link README-en.md");
  }
  const readmeEn = readHead("README-en.md");
  if (readmeEn !== null && !readmeEn.includes("README.md")) {
    errors.push("README-en.md header must link README.md");
  }

  if (fs.existsSync(path.join(root, "LICENSE"))) {
    const license = fs.readFileSync(path.join(root, "LICENSE"), "utf8");
    if (!license.includes("MIT License")) {
      errors.push("LICENSE must contain MIT License");
    }
    if (!license.includes(canonicalAuthor)) {
      errors.push(`LICENSE must contain ${canonicalAuthor}`);
    }
  }
}

function checkRuntimeConfig() {
  if (!fs.existsSync(runtimeConfigPath)) {
    console.log("note: runtime-artifacts.config.json not found; skipping runtime target checks (public clone).");
    return;
  }
  const runtime = readJson(runtimeConfigPath, "runtime-artifacts.config.json");
  runtimeTargetCount = Array.isArray(runtime.targets) ? runtime.targets.length : 0;
  if (runtime.pluginId !== manifest.id) {
    errors.push(`runtime-artifacts pluginId ${runtime.pluginId} does not match manifest.id ${manifest.id}`);
  }
  if (runtimeTargetCount < 3) {
    errors.push("runtime-artifacts must declare at least three targets");
  }
  for (const required of ["main.js", "manifest.json", "styles.css"]) {
    if (!Array.isArray(runtime.artifacts) || !runtime.artifacts.some((item) => (typeof item === "string" ? item : item.name) === required)) {
      errors.push(`runtime-artifacts must include ${required}`);
    }
  }
}

function readHead(file) {
  if (!fs.existsSync(path.join(root, file))) return null;
  return fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/).slice(0, 40).join("\n");
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Could not read ${label}: ${error.message}`);
    process.exit(2);
  }
}

function optionValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : "";
}
