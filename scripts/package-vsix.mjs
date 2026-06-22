import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const outputDir = path.join(rootDir, "artifacts", "vsix");

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function materializeCatalogSpecifiers(manifest, catalog) {
  const dependencyFields = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ];

  for (const field of dependencyFields) {
    if (!manifest[field]) {
      continue;
    }

    for (const [packageName, specifier] of Object.entries(manifest[field])) {
      if (specifier !== "catalog:") {
        continue;
      }

      const version = catalog[packageName];

      if (!version) {
        throw new Error(`Missing catalog version for "${packageName}".`);
      }

      manifest[field][packageName] = version;
    }
  }

  return manifest;
}

async function copyIfPresent(sourcePath, destinationPath) {
  if (!(await pathExists(sourcePath))) {
    return;
  }

  await fs.cp(sourcePath, destinationPath, {
    force: true,
    recursive: true,
  });
}

async function main() {
  const manifestPath = path.join(rootDir, "package.json");
  const workspacePath = path.join(rootDir, "pnpm-workspace.yaml");
  const extensionBundlePath = path.join(distDir, "extension.js");

  if (!(await pathExists(extensionBundlePath))) {
    throw new Error('Missing "dist/extension.js". Run "pnpm run bundle:prod" first.');
  }

  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const workspaceConfig = YAML.parse(await fs.readFile(workspacePath, "utf8"));
  const catalog = workspaceConfig.catalog ?? {};
  const stagedManifest = materializeCatalogSpecifiers(structuredClone(manifest), catalog);

  await fs.mkdir(outputDir, { recursive: true });

  const stageDir = await fs.mkdtemp(path.join(os.tmpdir(), `${manifest.name}-vsix-`));

  try {
    await copyIfPresent(distDir, path.join(stageDir, "dist"));
    await copyIfPresent(path.join(rootDir, "images"), path.join(stageDir, "images"));
    await copyIfPresent(path.join(rootDir, "syntaxes"), path.join(stageDir, "syntaxes"));
    await copyIfPresent(
      path.join(rootDir, "language-configuration.json"),
      path.join(stageDir, "language-configuration.json"),
    );
    await copyIfPresent(path.join(rootDir, "README.md"), path.join(stageDir, "README.md"));
    await copyIfPresent(path.join(rootDir, "CHANGELOG.md"), path.join(stageDir, "CHANGELOG.md"));
    await copyIfPresent(path.join(rootDir, "LICENSE"), path.join(stageDir, "LICENSE"));
    await copyIfPresent(path.join(rootDir, "LICENSE.md"), path.join(stageDir, "LICENSE.md"));
    await copyIfPresent(path.join(rootDir, "LICENSE.txt"), path.join(stageDir, "LICENSE.txt"));
    await copyIfPresent(path.join(rootDir, ".vscodeignore"), path.join(stageDir, ".vscodeignore"));

    await fs.writeFile(
      path.join(stageDir, "package.json"),
      `${JSON.stringify(stagedManifest, null, 2)}\n`,
      "utf8",
    );

    const vscePackageRoot = path.dirname(require.resolve("@vscode/vsce/package.json"));
    const vsceDependencyRoot = path.resolve(vscePackageRoot, "..", "..");
    const vsceCliPath = require.resolve("@vscode/vsce/vsce");

    await fs.symlink(
      vsceDependencyRoot,
      path.join(stageDir, "node_modules"),
      process.platform === "win32" ? "junction" : "dir",
    );

    const outputFile = path.join(outputDir, `${manifest.name}-${manifest.version}.vsix`);
    const nodePath = process.env.NODE_PATH
      ? `${vsceDependencyRoot}${path.delimiter}${process.env.NODE_PATH}`
      : vsceDependencyRoot;

    const result = spawnSync(
      process.execPath,
      [vsceCliPath, "package", "--no-dependencies", "--out", outputFile],
      {
        cwd: stageDir,
        env: {
          ...process.env,
          NODE_PATH: nodePath,
        },
        stdio: "inherit",
      },
    );

    if (result.status !== 0) {
      throw new Error(`VSIX packaging failed with exit code ${result.status ?? "unknown"}.`);
    }

    console.log(`Created ${outputFile}`);
  } finally {
    await fs.rm(stageDir, {
      force: true,
      recursive: true,
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
