import { readFileSync, writeFileSync } from "node:fs";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function updateTauriConfig(version) {
  const path = "src-tauri/tauri.conf.json";
  const config = readJson(path);
  if (config.version === version) {
    return false;
  }
  config.version = version;
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return true;
}

function updateCargoToml(version) {
  const path = "src-tauri/Cargo.toml";
  const original = readFileSync(path, "utf8");
  const packageSectionPattern = /(\[package\][\s\S]*?^version\s*=\s*")[^"]+(")/m;
  const updated = original.replace(packageSectionPattern, `$1${version}$2`);
  if (updated === original) {
    return false;
  }
  writeFileSync(path, updated, "utf8");
  return true;
}

function main() {
  const packageJson = readJson("package.json");
  const version = packageJson.version;
  if (!version || typeof version !== "string") {
    throw new Error("Invalid package.json version");
  }

  const tauriChanged = updateTauriConfig(version);
  const cargoChanged = updateCargoToml(version);

  if (tauriChanged || cargoChanged) {
    console.log(`[version:sync] synced to ${version}`);
  } else {
    console.log(`[version:sync] already synced (${version})`);
  }
}

main();
