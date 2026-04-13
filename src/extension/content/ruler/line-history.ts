import type { PinnedLine } from "./types";

export const MAX_LINE_UNDO = 100;

export function clonePinnedLines(lines: PinnedLine[]): PinnedLine[] {
  return lines.map((l) => ({ ...l }));
}

export function pinnedLinesEqual(a: PinnedLine[], b: PinnedLine[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.kind !== y.kind ||
      x.pos !== y.pos ||
      Boolean(x.pageLocked) !== Boolean(y.pageLocked)
    ) {
      return false;
    }
  }
  return true;
}
