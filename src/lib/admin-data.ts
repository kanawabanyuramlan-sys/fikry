import { db } from "./db";
import { parseJson } from "./format";

/** Flat, indented category list for <select>, with each node's attribute template. */
export async function categoryOptions() {
  const rows = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const children = new Map<string | null, typeof rows>();
  rows.forEach((r) => children.set(r.parentId, [...(children.get(r.parentId) ?? []), r]));
  const out: { id: string; label: string; depth: number; template: string[]; illustration: string | null; isActive: boolean }[] = [];
  const walk = (parent: string | null, depth: number, prefix: string) => {
    for (const r of children.get(parent) ?? []) {
      out.push({
        id: r.id,
        label: `${"— ".repeat(depth)}${prefix}${r.name}`,
        depth,
        template: parseJson<string[]>(r.attributeTemplate, []),
        illustration: r.illustration,
        isActive: r.isActive,
      });
      walk(r.id, depth + 1, "");
    }
  };
  walk(null, 0, "");
  return out;
}
