import glob from "fast-glob";
import { Liquid } from "liquidjs";
import path from "path";

import config from "../../config";

/**
 * A lightweight registry that manages Liquid prompt templates.
 *
 * Responsibilities:
 *  • Discover prompt files under a directory (typically a plugin's `prompts/` folder) and
 *    register them under a namespaced ID (e.g. "plugin-text/generate_text").
 *  • Render a template by ID, performing Liquid interpolation with the supplied context.
 *  • Allow host applications to add post-render extensions or full overrides.
 */

export class PromptRegistry {
  private engine: Liquid;
  private files = new Map<string, string>();

  constructor(initialRoots: string[]) {
    this.engine = new Liquid({
      root: initialRoots,
      extname: ".liquid",
      cache: config.NODE_ENV === "development" ? false : true, // we want hot reload during dev
      strictVariables: false
    });
  }

  /** Add a directory of .liquid templates.
   *  Each file becomes an ID: `${namespace}/${fileNameWithoutExt}` (slashes normalised).
   */
  public registerDirectory(dir: string | string[], namespace: string): void {
    const dirs = Array.isArray(dir) ? dir : [dir];

    for (const d of dirs) {
      // Push to Liquid root search path with lower priority
      this.engine.options.root.push(d);

      const pattern = "**/*.liquid";
      const files = glob.sync(pattern, { cwd: d, absolute: true });
      for (const file of files) {
        const rel = path.relative(d, file);
        const id = `${namespace}/${rel.replace(/\\/g, "/").replace(/\.liquid$/, "")}`;
        if (!this.files.has(id)) {
          this.files.set(id, file);
        }
      }
    }
  }

  public async render<
    T extends Record<string, unknown> = Record<string, unknown>
  >(id: string, ctx: T = {} as T): Promise<string> {
    // Make sure we know about the file.
    if (!this.files.has(id)) {
      throw new Error(`Prompt "${id}" not found in registry`);
    }

    // Resolve to absolute path first to avoid namespace mismatch when Liquid joins
    // rootDir/id.liquid. If we already indexed the file we have its absolute path.
    const filePath = this.files.get(id);

    // If a mapping exists, prefer the absolute path (safer when namespace prefixes
    // don't match on-disk structure). Otherwise fall back to letting Liquid
    // resolve normally so template authors can still call engine.renderFile
    // with arbitrary IDs that really do live under a namespaced folder.
    const rendered = await this.engine.renderFile(filePath ?? id, ctx);

    return rendered;
  }

  /**
   * Dump registry info for explorers / debugging.
   */
  public list(): { id: string; path: string }[] {
    return Array.from(this.files.entries()).map(([id, p]) => ({ id, path: p }));
  }
}
