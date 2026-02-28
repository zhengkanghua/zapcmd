import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ENV_KEYS_PATH = ".env.keys";
const ENV_KEYS_LOCAL_PATH = ".env.keys.local";
const TAURI_CONFIG_PATH = "src-tauri/tauri.conf.json";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseEnvKeys(raw) {
  const result = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!key) {
      continue;
    }
    result[key] = value;
  }
  return result;
}

function readEnvKeysFile(path) {
  if (!existsSync(path)) {
    return {};
  }
  const content = readFileSync(path, "utf8");
  return parseEnvKeys(content);
}

function readEnvKeys() {
  if (!existsSync(ENV_KEYS_PATH)) {
    throw new Error(`[keys:sync] missing ${ENV_KEYS_PATH}`);
  }
  return {
    ...readEnvKeysFile(ENV_KEYS_PATH),
    ...readEnvKeysFile(ENV_KEYS_LOCAL_PATH)
  };
}

function requireKey(keys, name) {
  const value = keys[name];
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`[keys:sync] missing ${name} in ${ENV_KEYS_PATH}`);
  }
  return value.trim();
}

function updateTauriConfig(keys) {
  const endpoint = requireKey(keys, "UPDATER_ENDPOINT");
  const pubkey = (keys.TAURI_UPDATER_PUBKEY ?? "").trim();

  const config = readJson(TAURI_CONFIG_PATH);
  config.plugins ??= {};
  config.plugins.updater ??= {};

  const current = JSON.stringify(config.plugins.updater);
  config.plugins.updater.endpoints = [endpoint];
  config.plugins.updater.pubkey = pubkey;
  const next = JSON.stringify(config.plugins.updater);

  if (current === next) {
    return false;
  }

  writeFileSync(TAURI_CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return true;
}

function main() {
  const keys = readEnvKeys();
  const changed = updateTauriConfig(keys);
  console.log(changed ? "[keys:sync] updated" : "[keys:sync] already synced");
}

main();

