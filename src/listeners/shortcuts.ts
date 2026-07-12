import { App } from '@slack/bolt';
import { getProfile } from '../core/profiles';
import { simplifyText } from '../core/llm';
import { searchContext } from '../core/rts';
import { makeAccessibleBlocks, loadingBlocks, MakeAccessibleCard } from '../blocks/makeAccessible';

export function registerShortcutListeners(app: App) {
  // F2: Make Accessible message shortcut
  app.shortcut('make_accessible', async ({ shortcut, ack, client, respond }) => {
    // MUST ack within 3s
    await ack();

    const message = (shortcut as any).message;
    const userId = shortcut.user.id;
    const channel = (shortcut as any).channel?.id || (shortcut as any).channel_id || (shortcut as any).channel;
    const messageTs = message.ts;

    if (!message || !channel || !messageTs) {
      await respond({ text: 'Could not find the message to make accessible.' });
      return;
    }

    const profile = getProfile(userId);

    // Show loading (ephemeral for now)
    await client.chat.postEphemeral({
      channel,
      user: userId,
      thread_ts: messageTs,
      text: 'Working on making this accessible…',
      blocks: loadingBlocks()
    });

    try {
      // 1. Fetch full thread (F2 requirement: works on 10+ reply threads)
      const threadResp = await client.conversations.replies({
        channel,
        ts: messageTs,
        limit: 50
      });

      const threadMessages = (threadResp.messages || []).map((m: any) => {
        const user = m.user ? `<@${m.user}>` : 'Someone';
        return `${user}: ${m.text || '[attachment/image]'}`;
      }).join('\n');

      // 2. LLM simplify
      const simplified = await simplifyText(threadMessages, profile);

      // 3. For each jargon term, try RTS (F3)
      const terms: any[] = [];
      if (profile.expandAcronyms && simplified.jargon.length > 0) {
        for (const term of simplified.jargon.slice(0, 6)) {
          try {
            // Pass action_token from the original shortcut event (hard part)
            const actionToken = (shortcut as any).action_token || (shortcut as any).message?.action_token;
            const rtsHits = await searchContext(`What does ${term} stand for in this workspace?`, actionToken);

            if (rtsHits.length > 0) {
              const hit = rtsHits[0];
              terms.push({
                term,
                definition: hit.text,
                permalink: hit.permalink,
                isGeneral: false
              });
            } else {
              // Fallback to general
              const general = await import('../core/llm').then(m => m.generalDefine(term));
              terms.push({
                term,
                definition: general,
                isGeneral: true
              });
            }
          } catch (e) {
            console.warn('RTS failed for', term);
            const general = await import('../core/llm').then(m => m.generalDefine(term));
            terms.push({ term, definition: general, isGeneral: true });
          }
        }
      }

      const card: MakeAccessibleCard = {
        tldr: simplified.tldr,
        plainVersion: simplified.plainVersion,
        actions: simplified.actions,
        terms,
        originalPermalink: `https://slack.com/archives/${channel}/p${messageTs.replace('.', '')}`,
        messageTs
      };

      // 4. Post ephemeral Block Kit card
      await client.chat.postEphemeral({
        channel,
        user: userId,
        thread_ts: messageTs,
        text: `Make Accessible: ${simplified.tldr}`, // fallback text (a11y)
        blocks: makeAccessibleBlocks(card, userId) as any
      });

    } catch (err: any) {
      console.error('Make Accessible error:', err);
      await client.chat.postEphemeral({
        channel,
        user: userId,
        thread_ts: messageTs,
        text: 'Sorry, I ran into an error making this accessible. Please try again.'
      });
    }
  });
}
