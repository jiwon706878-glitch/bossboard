import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".bossboard");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  apiUrl: string;
  apiKey: string;
  businessId?: string;
}

export function getConfig(): Config {
  if (!existsSync(CONFIG_FILE)) {
    return { apiUrl: "https://mybossboard.com", apiKey: "" };
  }
  return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
}

export function saveConfig(config: Partial<Config>) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const current = getConfig();
  writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...config }, null, 2));
}
