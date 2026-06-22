import * as esbuild from "esbuild";

const isProduction = process.argv.includes("--production");
const isWatch = process.argv.includes("--watch");

const watchStatusPlugin = {
  name: "watch-status",
  setup(build) {
    if (!isWatch) {
      return;
    }

    build.onStart(() => {
      console.log("[watch] build started");
    });

    build.onEnd((result) => {
      const suffix = result.errors.length > 0 ? " with errors" : "";
      console.log(`[watch] build finished${suffix}`);
    });
  },
};

async function main() {
  const context = await esbuild.context({
    entryPoints: {
      extension: "src/extension.ts",
    },
    bundle: true,
    external: ["vscode"],
    format: "esm",
    logLevel: "info",
    minify: isProduction,
    outdir: "dist",
    platform: "node",
    plugins: [watchStatusPlugin],
    sourcemap: isProduction ? false : true,
    target: "es2025",
  });

  if (isWatch) {
    await context.watch();
    return;
  }

  try {
    await context.rebuild();
  } finally {
    await context.dispose();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
