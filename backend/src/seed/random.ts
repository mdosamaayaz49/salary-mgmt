export type Rng = () => number;

/**
 * mulberry32: a tiny deterministic PRNG. Same seed => same sequence, on every machine.
 * Not cryptographically secure — only used to generate reproducible fake data.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inclusive on both ends. */
export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pickOne<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function pickWeighted<T extends { weight: number }>(rng: Rng, items: readonly T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * totalWeight;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}
