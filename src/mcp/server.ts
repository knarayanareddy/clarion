#!/usr/bin/env node
/**
 * Clarion MCP Server
 * Exposes accessibility tools for any MCP client (Slackbot MCP Client, Claude, Cursor, etc.)
 */
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { simplifyText, describeImage, generalDefine } from '../core/llm';
import { getProfile } from '../core/profiles';
import { searchContext } from '../core/rts';

// Reuse core/llm.ts (no duplication)

const server = new McpServer({
  name: 'clarion',
  version: '0.1.0',
  description: 'Clarion accessibility interpreter — simplify, describe images, expand acronyms with workspace context',
});

// Tool 1: simplify_text
server.tool(
  'simplify_text',
  'Rewrite text at the user\'s preferred accessibility reading level (plain language / bullet summaries).',
  {
    text: z.string().describe('The text or Slack thread content to simplify'),
    userId: z.string().optional().describe('Slack user ID to load profile for (defaults to generic plain language)'),
    readingProfile: z.enum(['plain language', 'bullet summaries', 'original']).optional()
  },
  async ({ text, userId, readingProfile }) => {
    let profile: any = { 
      userId: userId || 'mcp-user',
      readingPreference: readingProfile || 'plain language', 
      expandAcronyms: true, 
      describeImages: false, 
      digest: 'off' as const, 
      nudgeMentions: false 
    };

    if (userId) {
      try {
        profile = getProfile(userId);
      } catch {}
    }

    const result = await simplifyText(text, profile as any);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          tldr: result.tldr,
          plainVersion: result.plainVersion,
          actions: result.actions,
          jargon: result.jargon
        }, null, 2)
      }]
    };
  }
);

// Tool 2: describe_image
server.tool(
  'describe_image',
  'Generate accessibility alt text + detailed description for an image (for low-vision users).',
  {
    imageUrl: z.string().url().describe('Public or data: URL to the image')
  },
  async ({ imageUrl }) => {
    const profile = { readingPreference: 'plain language', expandAcronyms: false, describeImages: true, digest: 'off' as const, nudgeMentions: false, userId: 'mcp' } as any;
    const result = await describeImage(imageUrl, profile);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
);

// Tool 3: expand_acronym
server.tool(
  'expand_acronym',
  'Expand an acronym/jargon term. Uses workspace RTS if possible, otherwise general knowledge.',
  {
    term: z.string().describe('The acronym or term to define (e.g. NRR)'),
    workspaceContext: z.string().optional().describe('Optional Slack context or channel to ground search')
  },
  async ({ term, workspaceContext }) => {
    // Try RTS first (if user token or action token available)
    let definition = '';
    let isWorkspace = false;
    let permalink: string | undefined;

    try {
      const hits = await searchContext(`What does ${term} stand for?`, undefined, process.env.SLACK_USER_TOKEN);
      if (hits.length > 0) {
        definition = hits[0].text;
        permalink = hits[0].permalink;
        isWorkspace = true;
      }
    } catch {}

    if (!definition) {
      definition = await generalDefine(term);
      isWorkspace = false;
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          term,
          definition,
          isWorkspaceSpecific: isWorkspace,
          permalink,
          source: isWorkspace ? 'workspace RTS' : 'general knowledge'
        }, null, 2)
      }]
    };
  }
);

// Tool 4: accessibility_lint (stretch stub, but implemented for completeness)
server.tool(
  'accessibility_lint',
  'Analyze text for accessibility issues: jargon, idioms, wall-of-text, ableist language.',
  {
    text: z.string().describe('Draft text or message to lint')
  },
  async ({ text }) => {
    // Simple LLM call via simplify for linting
    const profile = { readingPreference: 'plain language', expandAcronyms: true, describeImages: false, digest: 'off' as const, nudgeMentions: false, userId: 'lint' } as any;
    const simple = await simplifyText(text, profile);

    const issues: string[] = [];
    if (simple.jargon.length > 0) issues.push(`Jargon detected: ${simple.jargon.join(', ')}`);
    if (text.length > 800) issues.push('Wall of text — consider breaking into bullets.');
    if (/double.?click|circle.?back/i.test(text)) issues.push('Consider replacing idioms like "double-click" or "circle back".');

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          issues: issues.length ? issues : ['No major accessibility issues detected'],
          suggestedRewrite: simple.plainVersion
        }, null, 2)
      }]
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Clarion MCP server running (stdio). Ready for MCP clients.');
}

main().catch((err) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
