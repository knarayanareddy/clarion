import { App } from '@slack/bolt';
import { welcomeBlocks, suggestedPrompts } from '../blocks/agent';
import { getProfile, hasSeenWelcome, markWelcomeSeen } from '../core/profiles';
import { simplifyText, answerWithContext } from '../core/llm';
import { searchContext } from '../core/rts';

export function registerAgentListeners(app: App) {
  // Agent messaging experience: user opened the app's Messages tab
  app.event('app_home_opened', async ({ event, client }) => {
    if ((event as any).tab !== 'messages') return;
    const userId = event.user;

    try {
      // Pin suggested prompts at the top of the Messages tab (no thread_ts in agent_view)
      await client.apiCall('assistant.threads.setSuggestedPrompts', {
        channel_id: event.channel,
        title: 'Try one of these:',
        prompts: suggestedPrompts().map(p => ({ title: p, message: p })),
      }).catch(() => {});

      if (!hasSeenWelcome(userId)) {
        const profile = getProfile(userId);
        await client.chat.postMessage({
          channel: event.channel,
          text: 'Welcome to Clarion — I make Slack accessible for you.',
          blocks: welcomeBlocks(!!profile.saved),
        });
        markWelcomeSeen(userId);
      }
    } catch (e) {
      console.error('app_home_opened handler failed:', e);
    }
  });

  // Agent DM / message.im
  app.event('message', async ({ event, client, say }) => {
    // Only DMs to the agent
    if (event.channel_type !== 'im' || event.subtype || (event as any).bot_id) return;

    const userId = (event as any).user as string;
    const text = ((event as any).text || '').trim();
    if (!text) return;

    const profile = getProfile(userId);
    const threadTs = (event as any).thread_ts || event.ts;

    const setStatus = (status: string) =>
      client.apiCall('assistant.threads.setStatus', {
        channel_id: event.channel,
        thread_ts: threadTs,
        status,
      }).catch(() => {});

    try {
      await setStatus('thinking…');

      let answer: string;
      const lower = text.toLowerCase();
      const wantsContext = lower.includes('mean') || lower.includes('what is') || lower.includes('miss') || text.endsWith('?');

      if (wantsContext) {
        const rtsResults = await searchContext(text, (event as any).action_token);
        const snippets = rtsResults.map(r => (r.permalink ? `${r.text}\n(source: ${r.permalink})` : r.text));
        answer = await answerWithContext(text, snippets, profile);
      } else {
        const simple = await simplifyText(text, profile);
        answer = `${simple.tldr}\n\n${simple.plainVersion}`;
      }

      await say({
        thread_ts: threadTs,
        text: answer,
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: answer.slice(0, 2900) } }],
      });

      await client.apiCall('assistant.threads.setTitle', {
        channel_id: event.channel,
        thread_ts: threadTs,
        title: text.slice(0, 60),
      }).catch(() => {});

      await setStatus('');
    } catch (err) {
      console.error('Agent message error:', err);
      await setStatus('');
      await say({
        thread_ts: threadTs,
        text: 'Sorry — something went wrong while helping. Please try again.',
      });
    }
  });

  // Context from split view (app_context_changed): logged for context-aware answers
  app.event('app_context_changed' as any, async ({ event }: any) => {
    console.log('Context changed:', JSON.stringify(event?.context ?? {}));
  });
}
