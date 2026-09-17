/**
 * The assistant's view of the menu, kept warm.
 *
 * Rebuilding the phrase index on every message would be wasteful, and
 * re-embedding 70 items on every message would be absurd. Both are built once
 * and refreshed when the menu changes.
 *
 * Embedding failures are logged and swallowed: a missing vector index costs
 * meaning-matching, not ordering.
 */
import { loadMenuLookup } from "../lib/menuService.js";
import { MenuItem } from "../models/MenuItem.js";
import { buildIndex, VectorIndex, type MenuIndex, type SearchableItem } from "./menuSearch.js";
import { createEmbeddingProvider, createModelClient } from "./providers.js";
import type { PipelineDeps } from "./pipeline.js";

let cache: { index: MenuIndex; vectors?: VectorIndex; builtAt: number } | null = null;

const model = createModelClient();
const embeddings = createEmbeddingProvider();

export function assistantStatus() {
  return {
    model: model?.name ?? null,
    embeddings: embeddings?.name ?? null,
    vectorsBuilt: cache?.vectors?.size ?? 0,
    indexedAt: cache?.builtAt ? new Date(cache.builtAt).toISOString() : null,
  };
}

async function searchableItems(): Promise<SearchableItem[]> {
  const items = await MenuItem.find().lean();
  return items.map((i) => ({
    slug: i.slug,
    name: i.name,
    aliases: i.aliases,
    description: i.description,
    tags: i.tags,
    category: i.category,
    available: i.available,
  }));
}

export async function getDeps(): Promise<PipelineDeps> {
  const menu = await loadMenuLookup();

  if (!cache) {
    const items = await searchableItems();
    const index = buildIndex(items);

    let vectors: VectorIndex | undefined;
    if (embeddings) {
      vectors = new VectorIndex(embeddings);
      try {
        await vectors.build(items);
        console.log(`Assistant: embedded ${vectors.size} menu items with ${embeddings.name}.`);
      } catch (err) {
        console.warn("Assistant: embedding the menu failed, carrying on without it.", err);
        vectors = undefined;
      }
    }
    cache = { index, vectors, builtAt: Date.now() };
  }

  return { menu, index: cache.index, vectors: cache.vectors, model: model ?? undefined };
}

/** Called after any menu change, so a new item is orderable by name at once. */
export function invalidateAssistantIndex() {
  cache = null;
}
