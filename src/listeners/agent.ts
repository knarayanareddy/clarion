import { App } from '@slack/bolt';
import { welcomeBlocks, suggestedPrompts } from '../blocks/agent';
import { getProfile } from '../core/profiles';
import { simplifyText, answerWithContext } from '../core/llm';
import { searchContext } from '../core/rts';

export function registerAgentListeners(app: App) {
  // First open (agent_view)
  app.event('app_home_opened', async ({ event, client }) => {
    const userId = event.user;
    const profile = getProfile(userId);
    const hasProfile = !!profile.readingPreference;

    try {
      await client.views.publish({
        user_id: userId,
        view: {
          type: 'home',
          blocks: welcomeBlocks(hasProfile)
        }
      });
    } catch (e) {
      console.error('Failed to publish home:', e);
    }
  });

  // Suggested prompts for agent
  app.event('app_home_opened', async ({ event, client }) => {
    try {
      await client.assistant.threads.setSuggestedPrompts({
        channel_id: event.channel,
        thread_ts: event.event_ts, // may need adjustment
        prompts: suggestedPrompts().map(p => ({ title: p, message: p }))
      });
    } catch {}
  });

  // Agent DM / message.im
  app.event('message', async ({ event, client, say }) => {
    // Only DMs to the agent
    if (event.channel_type !== 'im' || event.subtype || event.bot_id) return;

    const userId = event.user!;
    const text = (event.text || '').trim();
    if (!text) return;

    const profile = getProfile(userId);

    try {
      await client.assistant.threads.setStatus({
        channel_id: event.channel,
        thread_ts: event.ts,
        status: 'thinking…'
      });

      // Optional: use app_context_changed for context later
      let answer: string;

      // Simple grounded path: try RTS if question looks like it needs context
      if (text.toLowerCase().includes('mean') || text.toLowerCase().includes('what is') || text.toLowerCase().includes('miss')) {
        const rtsResults = await searchContext(text, (event as any).action_token);
        const snippets = rtsResults.map(r => r.text);
        answer = await answerWithContext(text, snippets, profile);
      } else {
        // Fallback direct LLM simplify / answer
        const simple = await simplifyText(text, profile);
        answer = `${simple.tldr}\n\n${simple.plainVersion}`;
      }

      await say({
        thread_ts: event.ts,
        text: answer, // fallback
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: answer }
          }
        ]
      });

      // Set title for thread
      await client.assistant.threads.setTitle({
        channel_id: event.channel,
        thread_ts: event.ts,
        title: text.slice(0, 60)
      });

      await client.assistant.threads.setStatus({
        channel_id: event.channel,
        thread_ts: event.ts,
        status: ''
      });
    } catch (err: any) {
      console.error('Agent message error:', err);
      await client.assistant.threads.setStatus({
        channel_id: event.channel,
        thread_ts: event.ts,
        status: ''
      });
      await say({
        thread_ts: event.ts,
        text: 'Sorry — something went wrong while helping. Please try again.'
      });
    }
  });

  // Context from split view (app_context_changed)
  app.event('app_context_changed', async ({ event, client, say }) => {
    // This is powerful: gives the channel the user is viewing
    // For demo: if user says "summarize this channel" it can use this
    // Full impl uses assistant.search.context with context
    // Here we just acknowledge for F5
    console.log('Context changed:', event);
  });
}
