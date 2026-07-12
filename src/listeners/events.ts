import { App } from '@slack/bolt';
import { getProfile, getUsersWithImagesEnabled } from '../core/profiles';
import { describeImage } from '../core/llm';

// Rate guard: max 20 images/hour/workspace
const imageTimestamps: number[] = [];
function underRateLimit(): boolean {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  while (imageTimestamps.length && imageTimestamps[0] < oneHourAgo) imageTimestamps.shift();
  if (imageTimestamps.length >= 20) return false;
  imageTimestamps.push(Date.now());
  return true;
}

export function registerEventListeners(app: App) {
  // F4: Image description pipeline
  app.event('message', async ({ event, client }) => {
    // Only file_share messages with images
    if (event.subtype !== 'file_share' || !(event as any).files?.length) return;
    if (event.channel_type === 'im') return; // agent DMs handled elsewhere

    const channel = event.channel;
    const userIdPoster = (event as any).user;
    const file = (event as any).files[0];

    // Skip non-images or too large
    if (!file.mimetype?.startsWith('image/')) return;
    if ((file.size || 0) > 5 * 1024 * 1024) {
      console.log('Skipping image >5MB');
      return;
    }

    // Opted-in users who are members of this channel
    const optedIn = getUsersWithImagesEnabled().filter(u => u !== userIdPoster);
    if (optedIn.length === 0) return;

    let members: string[] = [];
    try {
      const resp = await client.conversations.members({ channel, limit: 200 });
      members = resp.members || [];
    } catch (e) {
      console.warn('Could not fetch channel members; skipping image description:', e);
      return;
    }
    const recipients = optedIn.filter(u => members.includes(u));
    if (recipients.length === 0) return;

    if (!underRateLimit()) {
      console.log('Image rate limit reached (20/hr); skipping');
      return;
    }

    try {
      const downloadUrl = file.url_private_download || file.url_private;
      if (!downloadUrl) return;

      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` }
      });
      if (!response.ok) return;

      // Send as base64 data URI to the vision model
      const buffer = Buffer.from(await response.arrayBuffer());
      const dataUrl = `data:${file.mimetype};base64,${buffer.toString('base64')}`;

      let permalink: string | undefined;
      try {
        const pl = await client.chat.getPermalink({ channel, message_ts: event.ts });
        permalink = pl.permalink;
      } catch {
        permalink = `https://slack.com/archives/${channel}/p${event.ts?.replace('.', '')}`;
      }

      const context = `Image posted by <@${userIdPoster}> in <#${channel}> • <${permalink}|View original>`;

      for (const targetUser of recipients) {
        const desc = await describeImage(dataUrl, getProfile(targetUser));
        await client.chat.postMessage({
          channel: targetUser,
          text: `Image description: ${desc.altText}`,
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*Image description for accessibility*\n${context}` }
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*Alt text:* ${desc.altText}` }
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: desc.detailedDescription.slice(0, 2900) }
            }
          ]
        });
      }
    } catch (err) {
      console.error('Image description error:', err);
    }
  });

  // Placeholder for mention tracking (F7 stretch)
  app.event('app_mention', async ({ event }) => {
    console.log('Mention tracked (stretch):', event.user, event.ts);
  });
}
