import esbuild from "esbuild";
import process from "node:process";

const watch = process.argv.includes("--watch");
const production = process.argv.includes("production");

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "main.js"
});

if (watch) {
  await context.watch();
} else {
  await context.rebuild();
  await context.dispose();
}
