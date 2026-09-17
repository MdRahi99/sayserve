/**
 * Finding the item someone means.
 *
 * Three ways, tried in order of confidence:
 *
 *   1. exact  — the name or an alias, word for word
 *   2. fuzzy  — trigram overlap, for typos and near misses ("cheesburger")
 *   3. vector — embeddings, for meaning ("something fizzy", "the veggie one")
 *
 * The first two need no network and no key, which is why the site still takes
 * orders when the embedding provider is down or unconfigured. The third is a
 * layer on top, not a dependency.
 */

export type Candidate = {
  slug: string;
  name: string;
  score: number;
  via: "exact" | "alias" | "fuzzy" | "vector";
};

export type SearchableItem = {
  slug: string;
  name: string;
  aliases: string[];
  description: string;
  tags: string[];
  category: string;
  available: boolean;
};

export const normalise = (s: string) =>
  s.toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Plural to singular, enough for a menu: fries stays fries, burgers becomes burger. */
export function singular(word: string): string {
  if (word.length <= 3) return word;
  if (/(ss|us|is)$/.test(word)) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("es") && /(ch|sh|x|s)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

const trigrams = (s: string) => {
  const padded = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3));
  return out;
};

/** Dice coefficient: 1 is identical, 0 shares nothing. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return (2 * shared) / (ta.size + tb.size);
}

export type MenuIndex = {
  items: Map<string, SearchableItem>;
  /** Every phrase that points at an item: names, aliases, singular forms. */
  phrases: { phrase: string; slug: string; via: "exact" | "alias" }[];
  /** Longest phrase in words, so the parser knows how far to look ahead. */
  maxPhraseWords: number;
};

export function buildIndex(items: SearchableItem[]): MenuIndex {
  const phrases: MenuIndex["phrases"] = [];
  const seen = new Set<string>();

  const add = (raw: string, slug: string, via: "exact" | "alias") => {
    const phrase = normalise(raw);
    if (!phrase) return;
    const key = `${phrase}|${slug}`;
    if (seen.has(key)) return;
    seen.add(key);
    phrases.push({ phrase, slug, via });

    // "burgers" should find "burger"; "chip" should find "chips".
    const singularised = phrase.split(" ").map(singular).join(" ");
    if (singularised !== phrase && !seen.has(`${singularised}|${slug}`)) {
      seen.add(`${singularised}|${slug}`);
      phrases.push({ phrase: singularised, slug, via });
    }
  };

  for (const item of items) {
    add(item.name, item.slug, "exact");
    add(item.slug.replace(/-/g, " "), item.slug, "exact");
    for (const alias of item.aliases) add(alias, item.slug, "alias");
  }

  // Longest first, so "cheeseburger meal" wins over "cheeseburger".
  phrases.sort((a, b) => b.phrase.length - a.phrase.length);

  return {
    items: new Map(items.map((i) => [i.slug, i])),
    phrases,
    maxPhraseWords: Math.max(...phrases.map((p) => p.phrase.split(" ").length), 1),
  };
}

/** An exact name or alias hit for a phrase, or nothing. */
export function matchExact(phrase: string, index: MenuIndex): Candidate | null {
  const needle = normalise(phrase);
  const hit = index.phrases.find((p) => p.phrase === needle);
  if (!hit) return null;
  const item = index.items.get(hit.slug)!;
  return { slug: item.slug, name: item.name, score: 1, via: hit.via };
}

/** Best fuzzy matches, for typos. Empty when nothing is close enough. */
export function matchFuzzy(phrase: string, index: MenuIndex, limit = 3): Candidate[] {
  const needle = normalise(phrase);
  if (needle.length < 3) return [];

  const best = new Map<string, number>();
  for (const { phrase: candidate, slug } of index.phrases) {
    const score = similarity(needle, candidate);
    if (score > (best.get(slug) ?? 0)) best.set(slug, score);
  }

  return [...best.entries()]
    .filter(([, score]) => score >= 0.62)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug, score]) => {
      const item = index.items.get(slug)!;
      return { slug, name: item.name, score, via: "fuzzy" as const };
    });
}

// ------------------------------------------------------------------ vectors

export type EmbeddingProvider = {
  name: string;
  /** Returns one vector per input, in order. */
  embed(texts: string[]): Promise<number[][]>;
};

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** What gets embedded for an item. Aliases matter most — they are how people talk. */
export const embeddingText = (item: SearchableItem) =>
  [item.name, item.aliases.join(", "), item.description, item.tags.join(" "), item.category]
    .filter(Boolean)
    .join(". ");

export class VectorIndex {
  private vectors = new Map<string, number[]>();

  constructor(private provider: EmbeddingProvider) {}

  get size() {
    return this.vectors.size;
  }

  /** Embed the menu once. Called at startup and after a menu change. */
  async build(items: SearchableItem[]) {
    const texts = items.map(embeddingText);
    const vectors = await this.provider.embed(texts);
    this.vectors.clear();
    items.forEach((item, i) => {
      const vector = vectors[i];
      if (vector) this.vectors.set(item.slug, vector);
    });
  }

  async search(query: string, index: MenuIndex, limit = 4): Promise<Candidate[]> {
    if (this.vectors.size === 0) return [];
    const [vector] = await this.provider.embed([query]);
    if (!vector) return [];

    return [...this.vectors.entries()]
      .map(([slug, itemVector]) => ({ slug, score: cosine(vector, itemVector) }))
      .filter((c) => c.score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ slug, score }) => ({
        slug,
        name: index.items.get(slug)?.name ?? slug,
        score,
        via: "vector" as const,
      }));
  }
}

/**
 * The whole ladder, in one call.
 *
 * Exact wins outright. Otherwise fuzzy and vector results are merged, and the
 * caller decides what to do with several close candidates — which is usually
 * to ask, not to guess.
 */
export async function findCandidates(
  phrase: string,
  index: MenuIndex,
  vectors?: VectorIndex
): Promise<Candidate[]> {
  const exact = matchExact(phrase, index);
  if (exact) return [exact];

  const fuzzy = matchFuzzy(phrase, index);
  const vector = vectors ? await vectors.search(phrase, index).catch(() => []) : [];

  const merged = new Map<string, Candidate>();
  for (const candidate of [...fuzzy, ...vector]) {
    const existing = merged.get(candidate.slug);
    if (!existing || candidate.score > existing.score) merged.set(candidate.slug, candidate);
  }
  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 4);
}
