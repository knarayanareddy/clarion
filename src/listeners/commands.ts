import { App } from '@slack/bolt';
import { getProfile, saveProfile, UserProfile } from '../core/profiles';

export function registerCommandListeners(app: App) {
  // /clarion profile — reopen modal
  app.command('/clarion', async ({ command, ack, client, respond }) => {
    await ack();

    const subcommand = (command.text || '').trim().toLowerCase();

    if (subcommand === 'profile' || !subcommand) {
      const profile = getProfile(command.user_id);
      await client.views.open({
        trigger_id: command.trigger_id,
        view: profileModal(profile)
      });
    } else if (subcommand === 'check') {
      await respond({ text: '`/clarion check` is a stretch feature (F8). Coming soon!' });
    } else if (subcommand === 'digest') {
      await respond({ text: 'Digest feature (F6) is stretch. Run `npm run mcp` for tools or use agent chat.' });
    } else {
      await respond({ text: 'Usage: `/clarion profile`' });
    }
  });
}

function profileModal(profile: UserProfile) {
  return {
    type: 'modal' as const,
    callback_id: 'profile_modal',
    title: { type: 'plain_text' as const, text: 'Your Clarion Profile' },
    submit: { type: 'plain_text' as const, text: 'Save' },
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
          initial_option: {
            text: { type: 'plain_text', text: profile.readingPreference },
            value: profile.readingPreference
          }
        }
      },
      {
        type: 'input',
        block_id: 'acronyms',
        label: { type: 'plain_text', text: 'Expand acronyms' },
        element: {
          type: 'checkboxes',
          action_id: 'acronyms_check',
          options: [{ text: { type: 'plain_text', text: 'Expand acronyms using workspace search' }, value: 'expand' }],
          initial_options: profile.expandAcronyms ? [{ text: { type: 'plain_text', text: 'Expand...' }, value: 'expand' }] : []
        }
      },
      {
        type: 'input',
        block_id: 'images',
        label: { type: 'plain_text', text: 'Image descriptions' },
        element: {
          type: 'checkboxes',
          action_id: 'images_check',
          options: [{ text: { type: 'plain_text', text: 'Send me image descriptions in DMs' }, value: 'describe' }],
          initial_options: profile.describeImages ? [{ text: { type: 'plain_text', text: '...' }, value: 'describe' }] : []
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
            { text: { type: 'plain_text', text: 'Daily (default 9am)' }, value: 'daily' }
          ],
          initial_option: {
            text: { type: 'plain_text', text: profile.digest === 'daily' ? 'Daily (default 9am)' : 'Off' },
            value: profile.digest
          }
        }
      },
      {
        type: 'input',
        block_id: 'nudge',
        label: { type: 'plain_text', text: 'Nudges' },
        element: {
          type: 'checkboxes',
          action_id: 'nudge_check',
          options: [{ text: { type: 'plain_text', text: 'Nudge me about unanswered mentions' }, value: 'nudge' }],
          initial_options: profile.nudgeMentions ? [{ text: { type: 'plain_text', text: 'Nudge...' }, value: 'nudge' }] : []
        }
      }
    ]
  };
}
