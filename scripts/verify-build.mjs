import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve('dist');
const INDEX_JS = path.join(DIST_DIR, 'index.js');
const INDEX_DTS = path.join(DIST_DIR, 'index.d.ts');
const SERVER_INDEX_JS = path.join(DIST_DIR, 'server/index.js');
const SERVER_INDEX_CJS = path.join(DIST_DIR, 'server/index.cjs');
const SERVER_INDEX_DTS = path.join(DIST_DIR, 'server/index.d.ts');

const REQUIRED_FILES = [
  INDEX_JS,
  INDEX_DTS,
  SERVER_INDEX_JS,
  SERVER_INDEX_CJS,
  SERVER_INDEX_DTS
];

console.log("Verifying build output...");

// 1. Check existence
let missing = false;
for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing file: ${file}`);
    missing = true;
  }
}

if (missing) {
  console.error("Missing required build files.");
  process.exit(1);
} else {
  console.log("✅ All required files present.");
}

// 2. Check browser bundle for Node built-ins
const browserContent = fs.readFileSync(INDEX_JS, 'utf-8');
const FORBIDDEN_TOKENS = [
  'require("fs")', "require('fs')",
  'require("path")', "require('path')",
  'require("sqlite3")', "require('sqlite3')",
  'from "fs"', "from 'fs'",
  'from "sqlite3"', "from 'sqlite3'",
  'import "fs"', "import 'fs'",
  'import "sqlite3"', "import 'sqlite3'"
];

let failed = false;
for (const token of FORBIDDEN_TOKENS) {
  if (browserContent.includes(token)) {
    console.error(`❌ Browser bundle contains forbidden token: ${token}`);
    failed = true;
  }
}

if (failed) {
  console.error("Browser bundle verification failed.");
  process.exit(1);
} else {
  console.log("✅ Browser bundle looks clean (no obvious Node deps).");
}

console.log("✅ Build verification passed!");
