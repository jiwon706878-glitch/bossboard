"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.saveConfig = saveConfig;
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const CONFIG_DIR = (0, path_1.join)((0, os_1.homedir)(), ".bossboard");
const CONFIG_FILE = (0, path_1.join)(CONFIG_DIR, "config.json");
function getConfig() {
    if (!(0, fs_1.existsSync)(CONFIG_FILE)) {
        return { apiUrl: "https://mybossboard.com", apiKey: "" };
    }
    return JSON.parse((0, fs_1.readFileSync)(CONFIG_FILE, "utf-8"));
}
function saveConfig(config) {
    (0, fs_1.mkdirSync)(CONFIG_DIR, { recursive: true });
    const current = getConfig();
    (0, fs_1.writeFileSync)(CONFIG_FILE, JSON.stringify({ ...current, ...config }, null, 2));
}
