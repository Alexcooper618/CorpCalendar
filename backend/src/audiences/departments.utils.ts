export interface DepartmentNode {
  name: string;
  path: string;
  parentPath?: string;
}

const normalizeSegment = (segment: string) => segment.trim();

export function parseDepartmentTree(rawDepartments: string[]): DepartmentNode[] {
  const nodes = new Map<string, DepartmentNode>();

  for (const raw of rawDepartments) {
    if (!raw) {
      continue;
    }

    const segments = raw
      .split(/\\+/)
      .map(normalizeSegment)
      .filter(Boolean);

    let parentPath: string | undefined;

    for (let i = 0; i < segments.length; i += 1) {
      const path = segments.slice(0, i + 1).join('/');
      const name = segments[i];

      if (!nodes.has(path)) {
        nodes.set(path, { name, path, parentPath });
      }

      parentPath = path;
    }
  }

  return Array.from(nodes.values()).sort((left, right) => {
    const leftDepth = left.path.split('/').length;
    const rightDepth = right.path.split('/').length;

    if (leftDepth !== rightDepth) {
      return leftDepth - rightDepth;
    }

    return left.path.localeCompare(right.path);
  });
}
