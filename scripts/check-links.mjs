#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const projectRoot = process.cwd()
const distDir = resolve(projectRoot, "dist")
const redirectsFile =
  process.env.RUGIX_DOCS_REDIRECTS_FILE ??
  "/workspace/silitics/infrastructure/hosts/silitics/core1/default.nix"

run("pnpm", ["build"])

const remaps = [
  [`^https://(?:www\\.)?rugix\\.org/404/?$`, fileUrl(`${distDir}/404.html`)],
  [
    `^${escapeRegExp(fileUrl(`${distDir}/404/`))}$`,
    fileUrl(`${distDir}/404.html`),
  ],
  ...loadRugixRedirectRemaps(redirectsFile, distDir),
  [`^https://(?:www\\.)?rugix\\.org`, fileUrl(distDir)],
]

run("nix", [
  "run",
  "nixpkgs#lychee",
  "--",
  "--no-progress",
  "--include-fragments=anchor-only",
  "--accept",
  "100..=103,200..=399",
  "--root-dir",
  distDir,
  "--index-files",
  "index.html",
  "--include",
  "^file://",
  ...remaps.flatMap(([from, to]) => ["--remap", `${from} ${to}`]),
  "dist",
])

function loadRugixRedirectRemaps(path, rootDir) {
  if (!existsSync(path)) {
    console.warn(
      `redirect map not found at ${path}; checking without production redirects`,
    )
    return []
  }

  const source = readFileSync(path, "utf8")
  const redirectsBlock = source.match(
    /rugixOrgRedirects\s*=\s*\{([\s\S]*?)\n\s*\};/,
  )
  if (redirectsBlock === null) {
    console.warn(
      `rugixOrgRedirects not found in ${path}; checking without production redirects`,
    )
    return []
  }

  const remaps = []
  const redirectPattern = /"([^"]+)"\s*=\s*"([^"]+)";/g
  for (const [, from, to] of redirectsBlock[1].matchAll(redirectPattern)) {
    const target =
      to.startsWith("https://") || to.startsWith("http://")
        ? to
        : fileUrl(`${rootDir}${to}`)
    remaps.push([
      `^https://(?:www\\.)?rugix\\.org${escapeRegExp(from)}${from.endsWith("/") ? "" : "/?"}(?:[?#].*)?$`,
      target,
    ])
    remaps.push([
      `^${escapeRegExp(fileUrl(`${rootDir}${from}`))}${from.endsWith("/") ? "" : "/?"}(?:[?#].*)?$`,
      target,
    ])
  }
  return remaps
}

function fileUrl(path) {
  return `file://${path}`
}

function escapeRegExp(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" })
  if (result.error !== undefined) {
    throw result.error
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
