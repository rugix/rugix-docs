import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, writeFile, readFile, access, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const generator = fileURLToPath(
  new URL("./generate-reference.mjs", import.meta.url),
)

test("repository catalogs generate reference pages and detect or remove stale generated content", async () => {
  const directory = await mkdtemp(join(tmpdir(), "bakery-reference-"))
  try {
    const output = join(directory, "reference")
    const rule = {
      kind: "rule",
      definitions: [
        {
          name: "vendor/compose",
          documentation:
            "## Usage\n\nChoose a target image. [Related](../index/README.md#usage)\n",
          definition: {
            description: "Compose artifacts.",
            inputs: {
              source: { kind: "file" },
              assets: {
                kind: "directory",
                description: "Assets | resources",
                default: { tree: {} },
              },
            },
            parameters: {
              required: { description: "Must be supplied." },
              enabled: { default: false },
              count: { default: 0 },
              suffix: { default: "" },
            },
            "rule-parameters": {
              signer: {
                description: "Sign the result.",
                default: {
                  uses: "sign",
                  secrets: { key: { input: "key" } },
                },
                inputs: { image: { kind: "file" } },
                parameters: { "signing-time": {} },
                outputs: { image: { kind: "file", description: "Signed." } },
              },
            },
            execution: {
              type: "graph",
              rules: {},
              outputs: { result: { input: "source" } },
            },
          },
        },
      ],
    }
    rule.definitions.push({
      name: "vendor/index",
      definition: {
        description: "A valid definition named index.",
        execution: { type: "graph", rules: {}, outputs: {} },
      },
    })
    rule.definitions.push({
      name: "vendor/run",
      definition: {
        execution: {
          type: "run",
          env: "tools",
          cache: false,
          "uses-source-date-epoch": false,
          outputs: { image: { kind: "file", description: "Generated image." } },
        },
      },
    })
    const recipe = {
      kind: "recipe",
      definitions: [
        {
          name: "vendor/install",
          definition: {
            description: "Install an artifact.",
            inputs: {
              application: { kind: "file", description: "Application binary." },
            },
            "input-defaults": { application: { path: "prebuilt" } },
            dependencies: ["prepare"],
            priority: 100,
            after: ["prepare", "core/pkg-update"],
          },
        },
      ],
    }
    const layer = {
      kind: "layer",
      definitions: [
        {
          name: "vendor/base",
          definition: {
            variants: [
              {
                config: {
                  description: "Base filesystem.",
                  root: true,
                  recipes: ["install"],
                },
              },
              {
                architecture: "arm64",
                config: {
                  parent: "arm-base",
                  parameters: { install: { mode: "arm" } },
                },
              },
            ],
          },
        },
      ],
    }
    const catalogs = []
    for (const catalog of [rule, recipe, layer]) {
      const filename = join(directory, catalog.kind + ".json")
      await writeFile(filename, JSON.stringify(catalog))
      catalogs.push(filename)
    }
    const run = (...extra) =>
      execFileSync(
        process.execPath,
        [
          generator,
          "--repository",
          "vendor",
          "--output",
          output,
          ...extra,
          ...catalogs,
        ],
        { stdio: "pipe" },
      )
    run()
    run("--check")
    await access(join(output, "rules/index/index.md"))
    const page = await readFile(join(output, "rules/compose/index.md"), "utf8")
    for (const expected of [
      '<dl class="reference-list">',
      "<dt>\n\n`required`\n\n</dt>\n<dd>\n\n**Required**\n\nMust be supplied.\n\n</dd>",
      "Default: `false`",
      "Default: `0`",
      'Default: `""`',
      "Assets | resources",
      "## Usage",
      "[Related](../index/#usage)",
      "Artifact Source",
      "## Rule Parameters",
      "Default implementation: `sign`.",
      "Default bindings",
      "Parameter `signing-time`\n\n</dt>",
    ]) {
      assert.ok(page.includes(expected), expected)
    }
    assert.ok(
      page.includes(
        '`assets`\n\n</dt>\n<dd>\n\nKind: directory\n\nDefault: `{"tree":{}}`\n\nAssets | resources',
      ),
    )
    assert.ok(page.includes('Artifact Source: `{"input":"source"}`'))
    assert.doesNotMatch(page, /^\|/m)
    const runPage = await readFile(join(output, "rules/run/index.md"), "utf8")
    for (const expected of [
      "`image`\n\n</dt>\n<dd>\n\nKind: file\n\nGenerated image.",
      "Environment\n\n</dt>\n<dd>\n\n`vendor/tools`",
      "Source epoch\n\n</dt>\n<dd>\n\nIgnored",
      "Output cache\n\n</dt>\n<dd>\n\nDisabled",
    ])
      assert.ok(runPage.includes(expected), expected)
    assert.doesNotMatch(runPage, /^\|/m)
    const recipePage = await readFile(
      join(output, "recipes/install/index.md"),
      "utf8",
    )
    assert.ok(recipePage.includes("Default input bindings"))
    assert.ok(
      recipePage.includes(
        "After\n\n</dt>\n<dd>\n\n`prepare`, `core/pkg-update`",
      ),
    )
    assert.doesNotMatch(recipePage, /Before/)
    const variants = await readFile(
      join(output, "layers/base/index.md"),
      "utf8",
    )
    assert.ok(
      variants.includes("### Default") && variants.includes("### arm64"),
    )
    assert.ok(variants.includes('Parameter: `mode`\n\nValue: `"arm"`'))
    assert.doesNotMatch(variants, /^\|/m)
    const ruleIndex = await readFile(join(output, "rules/index.md"), "utf8")
    assert.ok(ruleIndex.includes("[`vendor/compose`](./compose/)\n\n</dt>"))
    assert.doesNotMatch(ruleIndex, /^\|/m)
    const stale = join(output, "rules/removed.md")
    await writeFile(stale, page)
    await writeFile(join(output, "rules/authored.md"), "# Authored page\n")
    assert.throws(() => run("--check"))
    run()
    await assert.rejects(access(stale))
    assert.equal(
      await readFile(join(output, "rules/authored.md"), "utf8"),
      "# Authored page\n",
    )
    const target = join(output, "rules/compose/index.md")
    await writeFile(target, "# Authored collision\n")
    assert.throws(() => run())
    assert.equal(await readFile(target, "utf8"), "# Authored collision\n")
    await writeFile(target, page)
    rule.definitions[0].definition.description = "Changed purpose."

    await writeFile(catalogs[0], JSON.stringify(rule))
    assert.throws(() => run("--check"))
    run()
    run("--check")
    await writeFile(
      catalogs[0],
      JSON.stringify({ kind: "rule", definitions: [] }),
    )
    assert.throws(() => run("--check"))
    run()
    run("--check")
    await assert.rejects(access(join(output, "rules/compose/index.md")))
    await assert.rejects(access(join(output, "rules/index/index.md")))
    await access(join(output, "rules/index.md"))
    await access(join(output, "rules/authored.md"))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
