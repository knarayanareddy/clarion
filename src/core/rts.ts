import { WebClient } from '@slack/web-api';

export interface RTSResult {
  text: string;
  permalink?: string;
  score?: number;
}

let slackClient: WebClient | null = null;

export function initRTS(botToken: string) {
  slackClient = new WebClient(botToken);
}

/**
 * assistant.search.context — the core RTS call.
 * Must thread action_token explicitly (no globals).
 * 
 * For digest flows without event token: caller passes SLACK_USER_TOKEN and no actionToken.
 */
export async function searchContext(
  query: string,
  actionToken?: string,
  userToken?: string
): Promise<RTSResult[]> {
  if (!slackClient && !userToken) {
    throw new Error('RTS client not initialized. Provide actionToken or userToken.');
  }

  const client = userToken 
    ? new WebClient(userToken) 
    : slackClient!;

  try {
    // Use raw API call because types may be incomplete for assistant.search.context in Bolt
    const res: any = await (client as any).apiCall('assistant.search.context', {
      query,
      ...(actionToken ? { action_token: actionToken } : {}),
      content_types: ['messages'],
      limit: 5
    });

    const messages: any[] = res?.results?.messages ?? [];
    return messages.map((m: any) => ({
      text: m.content || m.text || '',
      permalink: m.permalink || undefined,
      score: m.score
    }));
  } catch (err: any) {
    // Graceful fallback for sandboxes without AI Search (keyword mode)
    console.warn('RTS search failed (may be sandbox limitation or no action_token):', err.message);
    // Return empty — caller will use LLM general fallback
    return [];
  }
}

// Helper: check if workspace has semantic search (best effort)
export async function hasSemanticSearch(): Promise<boolean> {
  // In practice call assistant.search.info if available; for now return true (code handles both)
  return true;
}
