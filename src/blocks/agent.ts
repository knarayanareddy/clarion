import { KnownBlock } from '@slack/types';

export function welcomeBlocks(hasProfile: boolean = false): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '👋 Welcome to Clarion' }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'I make Slack accessible: plain-language rewrites, image descriptions, workspace jargon expansion, and more.'
      }
    }
  ];

  if (!hasProfile) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '*Set up your accessibility profile to get personalized help.*' },
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'Set up my profile' },
        action_id: 'open_profile_modal',
        style: 'primary'
      }
    });
  }

  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: 'All responses are private (DMs or ephemeral). Privacy-first.' }]
  });

  return blocks;
}

export function suggestedPrompts() {
  return [
    'Simplify the last thread I was reading',
    'What did I miss today?',
    'What does NRR mean here?'
  ];
}
