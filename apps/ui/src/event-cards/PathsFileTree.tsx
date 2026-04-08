import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
} from "@/components/ai-elements/file-tree";
import { useMemo, type ReactNode } from "react";

type TreeEntry =
  | { type: "file"; path: string; name: string }
  | { type: "dir"; path: string; name: string; children: Map<string, TreeEntry> };

function addPath(
  root: Map<string, TreeEntry>,
  segments: string[],
  fullPath: string,
  prefix: string,
): void {
  const [first, ...rest] = segments;
  if (!first) return;
  const here = prefix ? `${prefix}/${first}` : first;
  if (rest.length === 0) {
    root.set(first, { type: "file", path: fullPath, name: first });
    return;
  }
  let entry = root.get(first);
  if (!entry || entry.type === "file") {
    entry = { type: "dir", path: here, name: first, children: new Map() };
    root.set(first, entry);
  }
  if (entry.type !== "dir") return;
  addPath(entry.children, rest, fullPath, here);
}

function buildRoot(paths: string[]): Map<string, TreeEntry> {
  const root = new Map<string, TreeEntry>();
  for (const p of paths) {
    const norm = p.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!norm) continue;
    const segments = norm.split("/").filter(Boolean);
    if (segments.length === 0) continue;
    addPath(root, segments, norm, "");
  }
  return root;
}

function defaultExpandedFor(paths: string[]): Set<string> {
  const expanded = new Set<string>();
  for (const p of paths) {
    const norm = p.replace(/\\/g, "/").replace(/^\/+/, "");
    const segments = norm.split("/").filter(Boolean);
    if (segments.length <= 1) continue;
    for (let i = 0; i < segments.length - 1; i++) {
      expanded.add(segments.slice(0, i + 1).join("/"));
    }
  }
  return expanded;
}

function renderTree(map: Map<string, TreeEntry>): ReactNode {
  const sorted = [...map.entries()].sort(([a, na], [b, nb]) => {
    if (na.type !== nb.type) return na.type === "dir" ? -1 : 1;
    return a.localeCompare(b);
  });
  return sorted.map(([, entry]) => {
    if (entry.type === "file") {
      return (
        <FileTreeFile key={entry.path} name={entry.name} path={entry.path} />
      );
    }
    return (
      <FileTreeFolder key={entry.path} name={entry.name} path={entry.path}>
        {renderTree(entry.children)}
      </FileTreeFolder>
    );
  });
}

export function PathsFileTree({ paths }: { paths: string[] }) {
  const unique = useMemo(
    () => [...new Set(paths.filter((p) => p.trim()))],
    [paths],
  );
  const rootMap = useMemo(() => buildRoot(unique), [unique]);
  const defaultExpanded = useMemo(() => defaultExpandedFor(unique), [unique]);

  if (unique.length === 0) return null;

  return (
    <FileTree className="mt-2" defaultExpanded={defaultExpanded}>
      {renderTree(rootMap)}
    </FileTree>
  );
}
