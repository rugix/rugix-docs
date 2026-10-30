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
          documentation: "## Usage\n\nChoose a target image.\n",
          definition: {
            description: "Compose artifacts.",
            inputs: {
              source: { kind: "file" },
              assets: { kind: "directory", description: "Assets | resources" },
            },
            parameters: {
              required: { description: "Must be supplied." },
              enabled: { default: false },
              count: { default: 0 },
              suffix: { default: "" },
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
      "**Required**",
      "`false`",
      "`0`",
      '`""`',
      "Assets \\| resources",
      "## Usage",
      "Artifact Source",
    ]) {
      assert.ok(page.includes(expected), expected)
    }
    assert.ok(
      (await readFile(join(output, "recipes/install/index.md"), "utf8")).includes(
        "Default input bindings",
      ),
    )
    const variants = await readFile(join(output, "layers/base/index.md"), "utf8")
    assert.ok(
      variants.includes("### Default") && variants.includes("### arm64"),
    )
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
