import { UserProfile } from '../core/profiles';

const READING_OPTIONS = [
  { text: { type: 'plain_text' as const, text: 'Plain language' }, value: 'plain language' },
  { text: { type: 'plain_text' as const, text: 'Bullet summaries' }, value: 'bullet summaries' },
  { text: { type: 'plain_text' as const, text: 'Original style' }, value: 'original' },
];

const DIGEST_OPTIONS = [
  { text: { type: 'plain_text' as const, text: 'Off' }, value: 'off' },
  { text: { type: 'plain_text' as const, text: 'Daily (9am)' }, value: 'daily' },
];

const ACRONYM_OPTION = { text: { type: 'plain_text' as const, text: 'Expand acronyms using workspace search' }, value: 'on' };
const IMAGES_OPTION = { text: { type: 'plain_text' as const, text: 'Send me image descriptions in DMs' }, value: 'on' };
const NUDGE_OPTION = { text: { type: 'plain_text' as const, text: 'Nudge me about unanswered mentions' }, value: 'on' };

export function profileModal(profile: UserProfile) {
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
          options: READING_OPTIONS,
          initial_option: READING_OPTIONS.find(o => o.value === profile.readingPreference) ?? READING_OPTIONS[0],
        },
      },
      {
        type: 'input',
        block_id: 'acronyms',
        optional: true,
        label: { type: 'plain_text', text: 'Expand acronyms' },
        element: {
          type: 'checkboxes',
          action_id: 'acronyms_check',
          options: [ACRONYM_OPTION],
          ...(profile.expandAcronyms ? { initial_options: [ACRONYM_OPTION] } : {}),
        },
      },
      {
        type: 'input',
        block_id: 'images',
        optional: true,
        label: { type: 'plain_text', text: 'Image descriptions' },
        element: {
          type: 'checkboxes',
          action_id: 'images_check',
          options: [IMAGES_OPTION],
          ...(profile.describeImages ? { initial_options: [IMAGES_OPTION] } : {}),
        },
      },
      {
        type: 'input',
        block_id: 'digest',
        label: { type: 'plain_text', text: 'Daily digest' },
        element: {
          type: 'static_select',
          action_id: 'digest_select',
          options: DIGEST_OPTIONS,
          initial_option: DIGEST_OPTIONS.find(o => o.value === profile.digest) ?? DIGEST_OPTIONS[0],
        },
      },
      {
        type: 'input',
        block_id: 'nudge',
        optional: true,
        label: { type: 'plain_text', text: 'Nudges' },
        element: {
          type: 'checkboxes',
          action_id: 'nudge_check',
          options: [NUDGE_OPTION],
          ...(profile.nudgeMentions ? { initial_options: [NUDGE_OPTION] } : {}),
        },
      },
    ],
  };
}
