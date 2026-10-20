/** One group of a breakdown; its children split its count by the next level. */
export interface BreakdownNode {
  value: string | null;
  label: string;
  count: number;
  children: BreakdownNode[];
}

/** A funnel step: a subset of the step before it, split by how its members got there. */
export interface FunnelStep {
  label: string;
  count: number;
  breakdown: BreakdownNode[];
}

export type CountRow = Record<string, unknown> & { n: number };

export type LabelFor = (level: string, value: string | null) => string;

function valueOf(raw: unknown): string | null {
  return raw === null || raw === undefined || raw === "" ? null : String(raw);
}

function group(rows: CountRow[], levels: string[], labelFor: LabelFor): BreakdownNode[] {
  const [level, ...rest] = levels;
  if (level === undefined) {
    return [];
  }
  const groups = new Map<string | null, CountRow[]>();
  for (const row of rows) {
    const value = valueOf(row[level]);
    groups.set(value, [...(groups.get(value) ?? []), row]);
  }
  return [...groups.entries()]
    .map(([value, members]) => {
      const children = group(members, rest, labelFor);
      return {
        value,
        label: labelFor(level, value),
        count: members.reduce((sum, row) => sum + row.n, 0),
        // A level that splits nothing, such as a prop only some values carry, is left out.
        children: children.length === 1 && children[0].value === null ? [] : children,
      };
    })
    .sort((a, b) => b.count - a.count || (a.value === null ? 1 : b.value === null ? -1 : 0));
}

/** A named group holding other groups, counting their sum. */
export function groupNode(label: string, children: BreakdownNode[]): BreakdownNode {
  return { value: label, label, count: children.reduce((sum, child) => sum + child.count, 0), children };
}

/**
 * Nests counted rows by `levels`, largest group first. Missing values form their own group, and a
 * `total` above the rows' sum adds the remainder to it, so the groups always add up to the total.
 */
export function buildBreakdown(
  rows: CountRow[],
  levels: string[],
  labelFor: LabelFor,
  total?: number,
): BreakdownNode[] {
  const counted = rows.reduce((sum, row) => sum + row.n, 0);
  const all = total !== undefined && total > counted ? [...rows, { [levels[0]]: null, n: total - counted }] : rows;
  return group(all, levels, labelFor);
}
