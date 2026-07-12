import { App } from '@slack/bolt';
import { getProfile, saveProfile } from '../core/profiles';
import { makeAccessibleBlocks } from '../blocks/makeAccessible';

export function registerActionListeners(app: App) {
  // Open profile modal from welcome
  app.action('open_profile_modal', async ({ ack, body, client }) => {
    await ack();
    const userId = body.user.id;
    const profile = getProfile(userId);
    await client.views.open({
      trigger_id: (body as any).trigger_id,
      view: buildProfileModal(profile)
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

    const profile = {
      userId,
      readingPreference: reading as any,
      expandAcronyms: expand,
      describeImages: describe,
      digest: digestVal as any,
      nudgeMentions: nudge,
    };

    saveProfile(profile);

    // Confirm
    await client.chat.postEphemeral({
      channel: body.user.id, // DM
      user: userId,
      text: '✅ Profile saved! Your next Clarion responses will match this style.',
    });
  });

  // "Send to my DMs" button from Make Accessible card
  app.action('send_to_dms', async ({ ack, body, action, client }) => {
    await ack();

    const userId = body.user.id;
    const value = JSON.parse((action as any).value || '{}');

    const blocks = makeAccessibleBlocks(value, userId);

    // Post as DM
    await client.chat.postMessage({
      channel: userId,
      text: `Make Accessible: ${value.tldr}`,
      blocks: blocks as any
    });
  });
}

function buildProfileModal(profile: any) {
  return {
    type: 'modal' as const,
    callback_id: 'profile_modal',
    title: { type: 'plain_text' as const, text: 'Your Clarion Profile' },
    submit: { type: 'plain_text' as const, text: 'Save Profile' },
    close: { type: 'plain_text' as const, text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: 'reading',
        label: { type: 'plain_text', text: 'Reading preference' },
        element: {
          type: 'static_select',
          action_id: 'reading_select',
          options: [
            { text: { type: 'plain_text', text: 'Plain language' }, value: 'plain language' },
            { text: { type: 'plain_text', text: 'Bullet summaries' }, value: 'bullet summaries' },
            { text: { type: 'plain_text', text: 'Original style' }, value: 'original' }
          ],
          initial_option: { text: { type: 'plain_text', text: profile.readingPreference }, value: profile.readingPreference }
        }
      },
      {
        type: 'input',
        block_id: 'acronyms',
        label: { type: 'plain_text', text: 'Expand acronyms' },
        element: {
          type: 'checkboxes',
          action_id: 'acronyms_check',
          options: [ { text: { type: 'plain_text', text: 'Expand acronyms using workspace search' }, value: 'on' } ],
          initial_options: profile.expandAcronyms ? [ { text: { type: 'plain_text', text: 'Expand...' }, value: 'on' } ] : []
        }
      },
      {
        type: 'input',
        block_id: 'images',
        label: { type: 'plain_text', text: 'Image descriptions' },
        element: {
          type: 'checkboxes',
          action_id: 'images_check',
          options: [ { text: { type: 'plain_text', text: 'Send me image descriptions in DMs' }, value: 'on' } ],
          initial_options: profile.describeImages ? [ { text: { type: 'plain_text', text: '...' }, value: 'on' } ] : []
        }
      },
      {
        type: 'input',
        block_id: 'digest',
        label: { type: 'plain_text', text: 'Daily digest' },
        element: {
          type: 'static_select',
          action_id: 'digest_select',
          options: [
            { text: { type: 'plain_text', text: 'Off' }, value: 'off' },
            { text: { type: 'plain_text', text: 'Daily' }, value: 'daily' }
          ],
          initial_option: { text: { type: 'plain_text', text: profile.digest === 'daily' ? 'Daily' : 'Off' }, value: profile.digest }
        }
      },
      {
        type: 'input',
        block_id: 'nudge',
        label: { type: 'plain_text', text: 'Nudges' },
        element: {
          type: 'checkboxes',
          action_id: 'nudge_check',
          options: [ { text: { type: 'plain_text', text: 'Nudge me about unanswered mentions' }, value: 'on' } ],
          initial_options: profile.nudgeMentions ? [ { text: { type: 'plain_text', text: 'Nudge...' }, value: 'on' } ] : []
        }
      }
    ]
  };
}
