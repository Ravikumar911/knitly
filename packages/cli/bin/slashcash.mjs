#!/usr/bin/env node

const major = Number.parseInt(process.versions.node.split(".")[0] || "0", 10);

if (major < 20) {
  console.error(`slashcash requires Node.js 20 or newer. Current: ${process.version}`);
  process.exit(1);
}

await import("../dist/entry.js");
