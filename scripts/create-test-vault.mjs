import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const root = path.resolve(process.argv[2] ?? path.join(projectRoot, ".tmp", "scan-spike"));
if (!root.includes(`${path.sep}.tmp${path.sep}`)) {
  throw new Error(`Refusing to create a test vault outside .tmp: ${root}`);
}

const vault = path.join(root, "vault");
const config = path.join(vault, ".obsidian");
const pluginDir = path.join(config, "plugins", "storage-cleanup");

fs.rmSync(vault, { recursive: true, force: true });
fs.mkdirSync(pluginDir, { recursive: true });

for (const file of ["main.js", "manifest.json", "styles.css"]) {
  fs.copyFileSync(path.join(projectRoot, file), path.join(pluginDir, file));
}

writeJson(path.join(config, "community-plugins.json"), ["storage-cleanup"]);
writeJson(path.join(config, "app.json"), {});
writeJson(path.join(config, "appearance.json"), {});

const demo = path.join(config, "plugins", "demo-plugin");
writeJson(path.join(demo, "manifest.json"), {
  id: "demo-plugin",
  name: "Demo Plugin",
  version: "1.0.0",
  minAppVersion: "1.7.2",
  description: "Synthetic plugin data for the scan spike.",
  author: "Test"
});
writeDummy(path.join(demo, "main.js"), 512 * 1024);
writeDummy(path.join(demo, "data.json"), 128 * 1024);
writeDummy(path.join(demo, "styles.css"), 32 * 1024);
for (let index = 0; index < 200; index += 1) {
  writeDummy(path.join(demo, "logs", `2026-01-${String((index % 28) + 1).padStart(2, "0")}-${index}.jsonl`), 1024);
}
writeDummy(path.join(demo, "cache", "blob.bin"), 2 * 1024 * 1024);

const theme = path.join(config, "themes", "Demo");
writeJson(path.join(theme, "manifest.json"), { name: "Demo", version: "1.0.0" });
writeDummy(path.join(theme, "theme.css"), 128 * 1024);
writeDummy(path.join(config, "snippets", "demo.css"), 4 * 1024);

writeDummy(path.join(vault, ".trash", "old-note.md"), 8 * 1024);
writeDummy(path.join(vault, ".trash", "folder", "large.bin"), 5 * 1024 * 1024);
fs.mkdirSync(path.join(vault, ".trash", "empty-dir"), { recursive: true });
for (let index = 0; index < 100; index += 1) {
  writeDummy(path.join(vault, ".trash", "bulk", `trash-${index}.md`), 1024);
}

writeDummy(path.join(vault, "notes", "note-1.md"), 2 * 1024);
writeDummy(path.join(vault, "notes", "note-2.md"), 3 * 1024);
writeDummy(path.join(vault, "attachments", "image.png"), 1 * 1024 * 1024);
writeDummy(path.join(vault, "attachments", "video.mp4"), 10 * 1024 * 1024);
writeDummy(path.join(vault, "attachments", "archive.zip"), 3 * 1024 * 1024);
for (let index = 0; index < 10000; index += 1) {
  writeDummy(path.join(vault, "bulk", `note-${index}.md`), 512);
}

console.log(`test vault: ${vault}`);
console.log(`plugin: ${pluginDir}`);

function writeDummy(file, size) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.alloc(size, 0x61));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}
