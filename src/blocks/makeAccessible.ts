import { KnownBlock, Block } from '@slack/types';

export interface MakeAccessibleCard {
  tldr: string;
  plainVersion: string;
  actions: string[];
  terms: Array<{ term: string; definition: string; permalink?: string; isGeneral?: boolean }>;
  originalPermalink?: string;
  messageTs?: string;
}

export function makeAccessibleBlocks(card: MakeAccessibleCard, userId: string): (KnownBlock | Block)[] {
  const blocks: (KnownBlock | Block)[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🔍 Make Accessible' }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*TL;DR*\n${card.tldr}`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `✏️ *Plain version*\n${card.plainVersion}`
      }
    }
  ];

  if (card.actions.length > 0) {
    const actionText = card.actions.map(a => `• ${a}`).join('\n');
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `✅ *Actions*\n${actionText}`
      }
    });
  }

  if (card.terms.length > 0) {
    const termsText = card.terms.map(t => {
      const def = t.isGeneral ? `(general) ${t.definition}` : t.definition;
      const link = t.permalink ? ` — <${t.permalink}|source>` : '';
      return `• *${t.term}*: ${def}${link}`;
    }).join('\n');
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📖 *Terms*\n${termsText}`
      }
    });
  }

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Send to my DMs' },
        action_id: 'send_to_dms',
        value: JSON.stringify({ ...card, userId })
      }
    ]
  });

  // Always set fallback text
  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `Accessibility rewrite • original message` }]
  });

  return blocks;
}

export function loadingBlocks(): KnownBlock[] {
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: '⏳ Working on making this accessible…' }
    }
  ];
}
