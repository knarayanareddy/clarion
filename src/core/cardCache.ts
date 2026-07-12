import { randomUUID } from 'node:crypto';
import { MakeAccessibleCard } from '../blocks/makeAccessible';

// Short-lived in-memory cache so button values stay tiny (Slack limits value to 2000 chars)
const cache = new Map<string, { card: MakeAccessibleCard; expires: number }>();
const TTL_MS = 60 * 60 * 1000;

export function storeCard(card: MakeAccessibleCard): string {
  const key = randomUUID();
  cache.set(key, { card, expires: Date.now() + TTL_MS });
  return key;
}

export function loadCard(key: string): MakeAccessibleCard | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.card;
}
