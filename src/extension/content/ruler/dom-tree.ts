export function lowestCommonAncestor(a: Element, b: Element): Element | null {
  const chain = new Set<Element>();
  let n: Element | null = a;
  while (n) {
    chain.add(n);
    n = n.parentElement;
  }
  n = b;
  while (n) {
    if (chain.has(n)) return n;
    n = n.parentElement;
  }
  return null;
}

/** Path `[lca, …, desc]` when `desc` is a descendant of `lca` (or `desc === lca`). */
export function pathFromLcaToDescendant(
  lca: Element,
  desc: Element,
): Element[] | null {
  if (!lca.contains(desc)) return null;
  if (desc === lca) return [lca];
  const chain: Element[] = [];
  let node: Element | null = desc;
  while (node && node !== lca) {
    chain.push(node);
    node = node.parentElement;
  }
  if (node !== lca) return null;
  chain.reverse();
  return [lca, ...chain];
}
