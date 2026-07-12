import { App } from '@slack/bolt';
import { getProfile, saveProfile } from '../core/profiles';
import { makeAccessibleBlocks } from '../blocks/makeAccessible';
import { profileModal } from '../blocks/profileModal';
import { loadCard } from '../core/cardCache';

export function registerActionListeners(app: App) {
  // Open profile modal from welcome
  app.action('open_profile_modal', async ({ ack, body, client }) => {
    await ack();
    const userId = body.user.id;
    const profile = getProfile(userId);
    await client.views.open({
      trigger_id: (body as any).trigger_id,
      view: profileModal(profile) as any,
    });
  });

  // Profile modal submit
  app.view('profile_modal', async ({ ack, body, view, client }) => {
    await ack();

    const userId = body.user.id;
    const values = view.state.values;

    const reading = values.reading.reading_select.selected_option?.value || 'plain language';
    const expand = !!values.acronyms.acronyms_check.selected_options?.length;
    const describe = !!values.images.images_check.selected_options?.length;
    const digestVal = values.digest.digest_select.selected_option?.value || 'off';
    const nudge = !!values.nudge.nudge_check.selected_options?.length;

    saveProfile({
      userId,
      readingPreference: reading as any,
      expandAcronyms: expand,
      describeImages: describe,
      digest: digestVal as any,
      nudgeMentions: nudge,
    });

    await client.chat.postMessage({
      channel: userId,
      text: '✅ Profile saved! Your next Clarion responses will match this style.',
    });
  });

  // "Send to my DMs" button from Make Accessible card
  app.action('send_to_dms', async ({ ack, body, action, client }) => {
    await ack();

    const userId = body.user.id;
    const key = (action as any).value || '';
    const card = loadCard(key);

    if (!card) {
      await client.chat.postMessage({
        channel: userId,
        text: 'Sorry — that card expired. Run "Make Accessible" on the message again.',
      });
      return;
    }

    await client.chat.postMessage({
      channel: userId,
      text: `Make Accessible: ${card.tldr}`,
      blocks: makeAccessibleBlocks(card, userId, { includeSendButton: false }) as any,
    });
  });
}
