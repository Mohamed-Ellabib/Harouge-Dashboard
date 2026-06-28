export interface SeedOperationResult {
  created: number;
  matched: number;
  modified: number;
}

export function createEmptySeedResult(): SeedOperationResult {
  return {
    created: 0,
    matched: 0,
    modified: 0
  };
}

export function addSeedResult(
  target: SeedOperationResult,
  result: Partial<SeedOperationResult>
): SeedOperationResult {
  target.created += result.created ?? 0;
  target.matched += result.matched ?? 0;
  target.modified += result.modified ?? 0;

  return target;
}
