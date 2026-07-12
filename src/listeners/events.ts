import { App } from '@slack/bolt';
import { getProfile, getUsersWithImagesEnabledInChannel } from '../core/profiles';
import { describeImage } from '../core/llm';

export function registerEventListeners(app: App) {
  // F4: Image description pipeline
  app.event('message', async ({ event, client }) => {
    // Only file_share messages with images
    if (event.subtype !== 'file_share' || !event.files?.length) return;

    const channel = event.channel;
    const userIdPoster = event.user;
    const file = event.files[0];

    // Skip non-images or too large
    if (!file.mimetype?.startsWith('image/')) return;
    if ((file.size || 0) > 5 * 1024 * 1024) {
      console.log('Skipping image >5MB');
      return;
    }

    const optedInUsers = getUsersWithImagesEnabledInChannel(channel);
    if (optedInUsers.length === 0) return;

    try {
      // Download private file with bot token
      const downloadUrl = file.url_private_download;
      if (!downloadUrl) return;

      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` }
      });
      if (!response.ok) return;

      // For vision we need public or base64, but OpenAI accepts url_private if we pass it? 
      // Better: convert to data URL or use temp public. For MVP: use the private url (OpenAI can sometimes access with token? No.
      // Real approach: download buffer and send as base64 data URI.
      const buffer = Buffer.from(await response.arrayBuffer());
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.mimetype};base64,${base64}`;

      // Rate guard stub (in-memory for MVP)
      // TODO: implement proper rate limit (20/hr/workspace)

      const desc = await describeImage(dataUrl, getProfile(optedInUsers[0] || userIdPoster));

      const permalink = `https://slack.com/archives/${channel}/p${event.ts?.replace('.', '')}`;

      const context = `Image posted by <@${userIdPoster}> in <#${channel}> • <${permalink}|View original>`;

      for (const targetUser of optedInUsers) {
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
              text: { type: 'mrkdwn', text: `**Alt text:** ${desc.altText}` }
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: desc.detailedDescription }
            },
            {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: `Posted ${new Date().toLocaleString()}` }]
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
    // Track mentions for future nudge feature
    console.log('Mention tracked (stretch):', event.user, event.ts);
  });
}
